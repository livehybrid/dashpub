import React, { useMemo, useEffect, Suspense } from 'react';
import { DashboardContextProvider } from '@splunk/dashboard-context';
import Loading from './Loading';
import DashboardCore from '@splunk/dashboard-core';
import { GeoRegistry, GeoJsonProvider } from '@splunk/dashboard-context';
import { registerScreenshotReadinessDep, SayCheese } from '../ready';
import ClientOnly from './clientOnly';
import SplunkTabRotatorAdvanced from './SplunkTabRotatorAdvanced';
import { useConfig } from '../contexts/ConfigContext';

// Handle maplibre-gl script property error gracefully
let testTileConfig = null;
try {
  const mapContext = require('@splunk/visualization-context/MapContext');
  testTileConfig = mapContext.testTileConfig;
} catch (error) {
  console.warn('Could not load maplibre-gl related components:', error.message);
  testTileConfig = {};
}

const mapTileConfig = { defaultTileConfig: testTileConfig };

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
    if (def.layout && def.layout.options && def.layout.options.backgroundImage && def.layout.options.backgroundImage.src) {
        def.layout.options.backgroundImage.src = normalizeImageUrl(def.layout.options.backgroundImage.src);
        images.add(def.layout.options.backgroundImage.src);
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

function DashboardComponent({ definition, preset, width = '100vw', height = '100vh' }) {
  const { config } = useConfig();
    const [processedDef, images] = useMemo(() => updateAssetUrls(definition), [definition]);
    PreloadImages(images);
    
    // Ensure we have a valid preset - preset should always be provided
    if (!preset) {
        throw new Error('Dashboard component requires a preset prop to be provided.');
    }
    
    // Create GeoRegistry for map functionality
    const geoRegistry = useMemo(() => {
        const geoRegistry = GeoRegistry.create();
        geoRegistry.addDefaultProvider(new GeoJsonProvider());
        return geoRegistry;
    }, []);
    
    // Add some debugging to see what's being passed
    console.log('DashboardComponent render:', { 
        hasDefinition: !!definition, 
        hasPreset: !!preset, 
        definitionKeys: definition ? Object.keys(definition) : [],
        presetKeys: preset ? Object.keys(preset) : []
    });
    
    // Debug data source registration
    if (definition && definition.dataSources && preset && preset.dataSources) {
        console.log('Data source types in definition:', Object.values(definition.dataSources).map(ds => ds.type));
        console.log('Data source types in preset:', Object.keys(preset.dataSources));
        
        // Check if all data source types are properly registered
        const definitionTypes = [...new Set(Object.values(definition.dataSources).map(ds => ds.type))];
        const presetTypes = Object.keys(preset.dataSources);
        
        const missingTypes = definitionTypes.filter(type => !presetTypes.includes(type));
        if (missingTypes.length > 0) {
            console.warn('Missing data source types in preset:', missingTypes);
        } else {
            console.log('All data source types are properly registered in preset');
        }
    }
    
    // Register screenshot readiness dependency
    useEffect(() => {
        const readyDep = registerScreenshotReadinessDep('DASH');
        const t = setTimeout(() => readyDep.ready(), 500);
        return () => {
            clearTimeout(t);
            readyDep.remove();
        };
    }, []);
    
    return (
        <ClientOnly fallback={<Loading />}>
            <DashboardContextProvider
                mapTileConfig={mapTileConfig}
                geoRegistry={geoRegistry}
                featureFlags={{ enableSvgHttpDownloader: true, enableShowHide: true, visualizations_enableTrellis: true }}
                preset={preset}
                initialDefinition={processedDef || definition}
                initialMode="view"
                dataSources={preset.dataSources}
            >
                <Suspense fallback={<Loading />}>
                    <SayCheese />
                    <DashboardCore 
                        width={width} 
                        height={height}
                        definition={processedDef}
                        preset={preset}
                    />
                    {/* Advanced Tab Rotator for dashboards with multiple tabs */}
                    <SplunkTabRotatorAdvanced 
                        definition={processedDef || definition}
                        enabled={true}
                        showControls={true}
                    />
                </Suspense>
            </DashboardContextProvider>
        </ClientOnly>
    );
}

export default DashboardComponent;