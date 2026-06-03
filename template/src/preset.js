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
import { lazy } from 'react';
import CdnDataSource from './datasource';
import TestDataSource from '@splunk/datasources/TestDataSource';
import SpikeDataSource from './spikeDatasource'; // Phase 0 inputs/tokens spike
import DrilldownHandler from './drilldown';

import LayoutPresets from "@splunk/dashboard-presets/LayoutPresets";
import InputPresets from "@splunk/dashboard-presets/InputPresets";
import VisualizationPresets from "@splunk/dashboard-presets/VisualizationPresets";
import EventHandlerPresets from "@splunk/dashboard-presets/EventHandlerPresets";

// Used when importing custom libs
const commonFlags = (LazyComponent) => {
    LazyComponent.showProgressBar = true;
    LazyComponent.showTitleAndDescription = true;
    LazyComponent.canBeHidden = true;
    LazyComponent.showLastUpdated = true;
    return LazyComponent;
};

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
        'cdn': CdnDataSource,
        'ds.cdn': CdnDataSource, // Handle both formats
        'ds.test': TestDataSource,
        'ds.spike': SpikeDataSource, // Phase 0 inputs/tokens spike
        // Add a catch-all for any other data source types
        '*': CdnDataSource, // Fallback for unknown types
    },
    ...VisualizationPresets,
};

// ---------------------------------------------------------------------------
// Custom visualizations — auto-registered from src/custom_components/
//
// Sideload a Dashboard Studio custom viz by dropping a folder into
// src/custom_components/, named exactly after the viz "type" used in the
// dashboard definition JSON (<app-id>.<viz-name>):
//
//   src/custom_components/viz-airspace-radar.airspace_radar/index.jsx
//
// The folder name IS the registration key, so it must match the `"type"` in
// the dashboard JSON. index.jsx must default-export EITHER the React component
// OR a Studio viz `definition` object (any object exposing `.visualization`).
//
// There is no codegen and nothing to edit here: Vite's import.meta.glob
// discovers every viz at build time and code-splits each into its own lazy
// chunk. custom_components/ is gitignored, so sideloaded viz are never
// distributed with dashpub itself — each deployment brings its own.
// ---------------------------------------------------------------------------
const customVizLoaders = import.meta.glob('./custom_components/*/index.{js,jsx}');

const CUSTOM_VIZ = Object.fromEntries(
    Object.entries(customVizLoaders).map(([filePath, load]) => {
        // .../custom_components/<type>/index.jsx  ->  <type>
        const type = filePath.split('/').slice(-2, -1)[0];
        const Component = lazy(async () => {
            const mod = await load();
            const def = mod.default;
            // Accept a bare React component or a Studio `definition` wrapper.
            return { default: def && def.visualization ? def.visualization : def };
        });
        return [type, commonFlags(Component)];
    })
);

if (typeof window !== 'undefined' && Object.keys(CUSTOM_VIZ).length > 0) {
    console.log('[dashpub] custom visualizations registered:', Object.keys(CUSTOM_VIZ));
}

const CUSTOM_PRESET = {
    visualizations: CUSTOM_VIZ,
    eventHandlers: {
        'drilldown.customUrl': DrilldownHandler,
    },
};

const MERGED_PRESET = deepMerge(PRESET, CUSTOM_PRESET);
export default MERGED_PRESET;
