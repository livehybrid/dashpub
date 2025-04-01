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

const { loadDashboard } = require('./splunkd');
const { downloadImage } = require('./assets');
const { generateCdnDataSources } = require('./datafns');
const { writeFile, mkdirp, remove } = require('fs-extra');
const { ux } = require('@oclif/core');
const path = require('path');

const debug = (msg) => {
    if (process.env.DEBUG) {
        console.log(`[DEBUG] ${msg}`);
    }
};

const COMPONENT_CODE = `\
import React, { lazy, Suspense } from 'react';
import Loading from '../../components/loading';
import NoSSR from '../../components/nossr';
import definition from './definition.json';

const Dashboard = lazy(() => import('../../components/dashboard'));

export default function DashboardContainer() {
    return (
        <NoSSR>
            <Suspense fallback={<Loading />}>
                <Dashboard definition={definition} />
            </Suspense>
        </NoSSR>
    );
}
`;

async function generateDashboard({ name, targetName = name, app, projectFolder, dashboardTags=[] }, splunkdInfo) {
    debug(`Starting to load dashboard: ${name}`);
    const dash = await loadDashboard(name, app, splunkdInfo);
    debug(`Dashboard loaded successfully: ${name}`);
    
    debug(`Generating CDN data sources for: ${name}`);
    const [dsManifest, newDash] = await generateCdnDataSources(dash, app, projectFolder);
    debug(`CDN data sources generated for: ${name}`);
    
    debug(`Processing visualizations for: ${name}`);
    for (const viz of Object.values(newDash.visualizations || {})) {
        try {
            debug(`Processing visualization type: ${viz.type}`);
            if (viz.type === 'viz.singlevalueicon') {
                debug(`Downloading icon for singlevalueicon`);
                viz.options.icon = await downloadImage(viz.options.icon, 'icons', splunkdInfo, projectFolder);
            }
            if (viz.type === 'splunk.singlevalueicon') {
                debug(`Downloading icon for splunk.singlevalueicon`);
                viz.options.icon = await downloadImage(viz.options.icon, 'icons', splunkdInfo, projectFolder);
            }
            if (viz.type === 'viz.img') {
                if (viz.options.src.match(/\$.*\$/g) ) {
                    debug(`Skipping image download due to token ${viz.options.src}`);
                } else {
                    debug(`Downloading image for viz.img`);
                    viz.options.src = await downloadImage(viz.options.src, 'images', splunkdInfo, projectFolder);
                }
            }
            if (viz.type === 'splunk.image') {
               if (viz.options.src.match(/\$.*\$/g) ) {
                    debug(`Skipping image download due to token ${viz.options.src}`);
               } else if (viz.options.src.startsWith("data:image")) {
                   debug(`Skipping because image is embedded as string`);
               } else {
                    debug(`Downloading image for splunk.image`);
                    viz.options.src = await downloadImage(viz.options.src, 'images', splunkdInfo, projectFolder);
               }
            }
           if (viz.type === 'splunk.choropleth.svg') {
               if (viz.options.svg.match(/\$.*\$/g) ) {
                   debug(`Skipping image download due to token ${viz.options.svg}`);
               } else if (viz.options.svg.startsWith("data:image")) {
                   debug(`Skipping because image is embedded as string`);
               } else {
                   debug(`Downloading SVG for choropleth`);
                   viz.options.svg = await downloadImage(viz.options.svg, 'images', splunkdInfo, projectFolder);
               }
           }
        } catch (e) {
            console.error(`[ERROR] Failed to process visualization:`, e);
        }
    }
    debug(`Finished processing visualizations for: ${name}`);

    if (newDash.layout?.options?.backgroundImage) {
        debug(`Processing background image`);
        if (newDash.layout.options.backgroundImage.src.match(/\$.*\$/g) ) {
             debug(`Skipping background image download due to token`);
        } else if (newDash.layout.options.backgroundImage.src.startsWith("data:image")) {
            debug(`Skipping because background image is embedded as string`);
        } else {
            debug(`Downloading background image`);
            newDash.layout.options.backgroundImage.src = await downloadImage(
                newDash.layout.options.backgroundImage.src,
                'images',
                splunkdInfo,
                projectFolder
            );
       }
    } else {
        debug(`No background image to process`);
    }

    debug(`Writing dashboard files for: ${name}`);
    const dir = path.join(projectFolder, 'src/dashboards', targetName);
    await mkdirp(dir);
    await writeFile(path.join(dir, 'definition.json'), Buffer.from(JSON.stringify(newDash, null, 2), 'utf-8'));
    await writeFile(path.join(dir, 'index.js'), COMPONENT_CODE, 'utf-8');
    debug(`Dashboard files written successfully for: ${name}`);

    return [dsManifest, { [name]: {"title": newDash.title, "tags":dashboardTags} }];
}

async function generate(app, dashboards, splunkdInfo, projectFolder) {
    debug(`Starting overall generation process`);
    // cleanup
    await remove(path.join(projectFolder, 'public/assets'));
    await remove(path.join(projectFolder, 'src/pages/api/data/_datasources.json'));
    await remove(path.join(projectFolder, 'src/dashboards'));
    debug(`Cleanup completed`);

    // create required dirs
    await mkdirp(path.join(projectFolder, 'public/assets'));
    await mkdirp(path.join(projectFolder, 'src/pages/api/data'));
    debug(`Created required directories`);

    let datasourcesManifest = {};
    let dashboardsManifest = {};

    // If older-style array then convert to object
    dashboards = Array.isArray(dashboards) ? dashboards.reduce((a, v) => ({ ...a, [v]: {}}), {}) : dashboards

    for (const dashboard in dashboards) {
        const targetName = dashboard;
        ux.action.start(`Generating dashboard ${dashboard}`);
        let dashboardTags=[];
        if (Object.keys(dashboards[dashboard]).includes("tags")) {
            debug(`Found tags for ${dashboard}: ${dashboards[dashboard]['tags'].join(", ")}`);
            dashboardTags = dashboards[dashboard]['tags'];
        }

        try {
            debug(`Starting generation for dashboard: ${dashboard}`);
            const [dsManifest, dashboardInfo] = await generateDashboard(
                {
                    name: dashboard,
                    targetName,
                    app,
                    projectFolder,
                    dashboardTags
                },
                splunkdInfo
            );
            debug(`Generation completed for dashboard: ${dashboard}`);

            datasourcesManifest = Object.assign(datasourcesManifest, dsManifest);
            Object.assign(dashboardsManifest, dashboardInfo);
        } catch (error) {
            console.error(`[ERROR] Failed to generate dashboard ${dashboard}:`, error);
        }
        ux.action.stop();
    }

    debug(`Writing final manifest files`);
    ux.action.start('Writing manifest files...');
    await writeFile(path.join(projectFolder, 'src/pages/api/data/_datasources.json'), JSON.stringify(datasourcesManifest, null, 4), {
        encoding: 'utf-8',
    });
    await writeFile(path.join(projectFolder, 'src/_dashboards.json'), JSON.stringify(dashboardsManifest, null, 4), {
        encoding: 'utf-8',
    });
    ux.action.stop();
    debug(`Generation process complete`);
}

module.exports = {
    generate,
};
