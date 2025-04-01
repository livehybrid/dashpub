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

import { DashboardContextProvider, GeoRegistry, GeoJsonProvider } from '@splunk/dashboard-context';
import DashboardCore from '@splunk/dashboard-core';
import React, { Suspense, useMemo, useEffect } from 'react';
import Loading from './loading';
import defaultPreset from '../preset';
import { SayCheese, registerScreenshotReadinessDep } from '../ready';
import { testTileConfig } from '@splunk/visualization-context/MapContext';

const mapTileConfig = { defaultTileConfig: testTileConfig };

/**
 * Validates if a timezone string is a valid IANA timezone
 * @param {string} tz - The timezone string to validate
 * @returns {boolean} - Whether the timezone is valid
 */
const isValidTimezone = (tz) => {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch (e) {
        console.warn(`Invalid timezone: ${tz}, falling back to default`);
        return false;
    }
};

const PROD_SRC_PREFIXES = [
    // Add URL prefixes here that will be replaced with the page's current origin
];

function updateAssetUrls(orig, { origin = window.location.origin } = {}) {
    const images = new Set();
    const def = JSON.parse(JSON.stringify(orig));
    const normalizeImageUrl = (url) => {
        if (url.startsWith('/')) {
            return `${origin}${url}`;
        }
        for (const prefix of PROD_SRC_PREFIXES) {
            if (url.startsWith(prefix)) {
                return `${origin}${url.slice(prefix.length)}`;
            }
        }
        return url;
    };
    // Convert server-relative URLs to absolute URLs before rendering
    for (const viz of Object.values(def.visualizations)) {
        if (viz.type in ['viz.singlevalueicon', 'splunk.singlevalueicon'] && viz.options.icon) {
            viz.options.icon = normalizeImageUrl(viz.options.icon);
            images.add(viz.options.src);
        }
        if (viz.type in ['viz.img', 'splunk.image'] && viz.options.src) {
            viz.options.src = normalizeImageUrl(viz.options.src);
            images.add(viz.options.src);
        }
    }
    if (def.layout.options.backgroundImage && def.layout.options.backgroundImage.src) {
        def.layout.options.backgroundImage.src = normalizeImageUrl(def.layout.options.backgroundImage.src);
        images.add(def.layout.options.backgroundImage.src);
    }
    if (!def.layout.options.backgroundColor) {
        def.layout.options.backgroundColor = '#ffffff';
    }
    return [def, [...images].filter((img) => img != null)];
}

class Img {
    constructor(src) {
        this.src = src;
        this.image = new Image();
        this.promise = new Promise((resolve, reject) => {
            this.image.onload = resolve;
            this.image.onerror = reject;
            this.image.src = src;
        });
    }
}

function PreloadImages(images) {
    useEffect(() => {
        const readyDef = registerScreenshotReadinessDep(`IMGs[${images.length}]`);
        const imgs = images.map((src) => new Img(src));
        Promise.all(imgs.map((img) => img.promise)).then(() => {
            readyDef.ready();
        });
        return () => {
            readyDef.remove();
        };
    }, [images]);
}

/**
 * Dashboard component that renders a Splunk dashboard with configurable settings
 * @param {Object} props - Component props
 * @param {Object} props.definition - Dashboard definition object
 * @param {Object} props.preset - Dashboard preset configuration
 * @param {string} [props.width='100vw'] - Dashboard width
 * @param {string} [props.height='100vh'] - Dashboard height
 * @returns {React.ReactElement} Dashboard component
 */
export default function Dashboard({ definition, preset, width = '100vw', height = '100vh' }) {
    const [processedDef, images] = useMemo(() => updateAssetUrls(definition), [definition]);
    
    const timezone = useMemo(() => {
        const configuredTz = process.env.TZ || 'America/Los_Angeles';
        return {
            ianaTimezone: isValidTimezone(configuredTz) ? configuredTz : 'America/Los_Angeles'
        };
    }, []);

    PreloadImages(images);

    const geoRegistry = useMemo(() => {
        const registry = GeoRegistry.create();
        registry.addDefaultProvider(new GeoJsonProvider());
        return registry;
    }, []);

    useEffect(() => {
        const readyDep = registerScreenshotReadinessDep('DASH');
        const t = setTimeout(() => readyDep.ready(), 500);
        return () => {
            clearTimeout(t);
            readyDep.remove();
        };
    }, []);

    return (
        <DashboardContextProvider
            mapTileConfig={mapTileConfig}
            geoRegistry={geoRegistry}
            timezone={timezone}
            featureFlags={{ enableSvgHttpDownloader: true, enableShowHide: true, visualizations_enableTrellis: true }}
            preset={defaultPreset}
            initialDefinition={processedDef}
            initialMode="view"
        >
            <Suspense fallback={<Loading />}>
                <SayCheese />
                <DashboardCore preset={preset || defaultPreset} width={width} height={height} />
            </Suspense>
        </DashboardContextProvider>
    );
}
