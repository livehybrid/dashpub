/*
Copyright 2020 Splunk Inc. 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import DataSource from '@splunk/datasources/DataSource';
import DataSet from '@splunk/datasource-utils/DataSet';
import { registerScreenshotReadinessDep } from './ready';

const DEFAULT_REFRESH_TIME = 5000;
const BACKGROUND_REFESH_TIME = 100 * 1000;
const LAST_RESULTS = {};

async function waitForRefresh(regularInterval, backgroundInterval) {
    if (document.visibilityState == null || document.visibilityState === 'visible') {
        return new Promise((resolve) => setTimeout(resolve, regularInterval));
    }
    return new Promise((resolve) => {
        let done, timer;
        const cb = () => {
            if (document.visibilityState === 'visible') {
                done();
            }
        };
        document.addEventListener('visibilitychange', cb);
        done = () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', cb);
            resolve();
        };
        timer = setTimeout(done, backgroundInterval);
    });
}

export function createDataSet(data, options = {}) {
    let transformedData = data;
    if (options.sort) {
        const sortField = Object.keys(options.sort)[0];
        const colIdx = data.fields.indexOf(sortField);
        if (colIdx > -1) {
            const column = data.columns[colIdx];
            const indexes = [...Array(column.length)].map((_, i) => i);

            const dirSortFactor = options.sort[sortField] === 'asc' ? 1 : -1;
            const numColumn = column.map((v) => (v != null ? parseFloat(v, 10) : 0));
            const isNumColumn = numColumn.every((v) => !isNaN(v));
            if (isNumColumn) {
                indexes.sort((a, b) => (numColumn[a] - numColumn[b]) * dirSortFactor);
            } else {
                indexes.sort((a, b) => (column[a] || '').localeCompare(column[b] || '') * dirSortFactor);
            }
            transformedData = {
                fields: data.fields,
                columns: data.columns.map((c) => indexes.map((i) => c[i])),
            };
        }
    }
    return DataSet.fromJSONCols(transformedData.fields, transformedData.columns);
}

function createNextPayload({ data, vizOptions, requestParams }) {
    const pagedData = data
        .getPage({
            count: requestParams == null ? void 0 : requestParams.count,
            offset: requestParams == null ? void 0 : requestParams.offset,
        })
        .toJSONCols();
    return {
        data: pagedData,
        meta: {
            sid: 'dashpub_sid',
            percentComplete: 100,
            status: 'done',
            totalCount: (data.columns[0] || []).length,
            lastUpdated: new Date().toISOString(),
        },
        vizOptions,
    };
}

export default class PublicDataSource extends DataSource {
    constructor(options = {}, context = {}) {
        super(options, context);
        this.uri = options.uri;
        this.refresh = options.refresh * 1000 || DEFAULT_REFRESH_TIME;
        this.vizOptions = options.vizOptions;
        this.meta = options.meta;
    }

    request(options) {
        options = options || {};
        return (observer) => {
            let aborted = false;
            let readyDep = registerScreenshotReadinessDep('DS');

            (async () => {
                let initial = true;
                observer.next({
                    data: DataSet.empty(),
                    meta: {
                        sid: 'x',
                        percentComplete: 0,
                        status: 'running',
                        totalCount: 0,
                        lastUpdated: new Date().toISOString(),
                    },
                    vizOptions: this.vizOptions,
                });
                if (LAST_RESULTS[this.uri]) {
                    const { ts, data } = LAST_RESULTS[this.uri];
                    observer.next(
                        createNextPayload({
                            data: createDataSet(data, options),
                            vizOptions: this.vizOptions,
                            requestParams: options,
                        })
                    );
                    const wait = this.refresh - (Date.now() - ts);
                    if (wait > 0) {
                        await waitForRefresh(wait, wait);
                    }
                    initial = false;
                }

                while (!aborted) {
                    try {
                        const res = await fetch(this.uri);
                        if (aborted) {
                            break;
                        }
                        if (res.status > 299) {
                            throw new Error(`HTTP Status ${res.status}`);
                        }
                        const data = await res.json();
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        LAST_RESULTS[this.uri] = {
                            ts: Date.now(),
                            data,
                        };
                        readyDep.ready();
                        observer.next(
                            createNextPayload({
                                data: createDataSet(data, options),
                                vizOptions: this.vizOptions,
                                requestParams: options,
                            })
                        );
                    } catch (e) {
                        if (aborted) {
                            break;
                        }
                        if (initial) {
                            observer.error({
                                level: 'error',
                                message: e.message || 'Unexpected error',
                            });
                        }
                        observer.next(
                            createNextPayload({
                                data: DataSet.empty(),
                                vizOptions: this.vizOptions,
                            })
                        );
                    }
                    initial = false;
                    await waitForRefresh(this.refresh, BACKGROUND_REFESH_TIME);
                }
            })();

            return () => {
                aborted = true;
                readyDep.remove();
            };
        };
    }
}
