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
/* eslint-disable react/display-name */
import CdnDataSource from './datasource';
import TestDataSource from '@splunk/datasources/TestDataSource';
import DrilldownHandler from './drilldown';

import LayoutPresets from "@splunk/dashboard-presets/LayoutPresets";
import InputPresets from "@splunk/dashboard-presets/InputPresets";
import VisualizationPresets from "@splunk/dashboard-presets/VisualizationPresets";
import EventHandlerPresets from "@splunk/dashboard-presets/EventHandlerPresets";

// const fixRequestParams = (LazyComponent) => (props) => {
//     if (props.dataSources.primary && !props.dataSources.primary.requestParams) {
//         props.dataSources.primary.requestParams = { count: 100 };
//     }

//     return <LazyComponent {...props} />;
// };

// Used when importing custom libs
const commonFlags = (LazyComponent) => {
    LazyComponent.showProgressBar = true;
    LazyComponent.showTitleAndDescription = true;
    LazyComponent.canBeHidden = true;
    LazyComponent.showLastUpdated = true;
    // LazyComponent.backgroundColor = "#171d21";
    return LazyComponent;
};

// const lazyViz = (fn) => {
//     return lazy(fn);
// };

const deepMerge = (obj1, obj2) => {
    const result = { ...obj1 }; // Start with a shallow copy of obj1

    Object.keys(obj2).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(obj1, key) && 
            typeof obj1[key] === 'object' && 
            typeof obj2[key] === 'object') {
            // If both objects have the same key with object values, merge these objects recursively
            result[key] = deepMerge(obj1[key], obj2[key]);
        } else {
            // Otherwise, just take the value from obj2
            result[key] = obj2[key];
        }
    });

    return result;
};

const PRESET = {
    ...LayoutPresets,
    ...EventHandlerPresets,
    ...InputPresets,
    dataSources: {
        'ds.cdn': CdnDataSource,
        'ds.test': TestDataSource
    },
    ...VisualizationPresets,
};

const CUSTOM_VIZ = {};

const CUSTOM_PRESET = {
    visualizations: CUSTOM_VIZ,
    eventHandlers: {
        'drilldown.customUrl': DrilldownHandler,
    },
};
const MERGED_PRESET = deepMerge(PRESET, CUSTOM_PRESET);
export default MERGED_PRESET;
