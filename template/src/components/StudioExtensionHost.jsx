/*
 * StudioExtensionHost — React wrapper hosting an "iframe extension" packaged
 * Splunk Dashboard Studio custom viz (IIFE bundle + globalThis.DashboardExtensionAPI).
 *
 * All the iframe/bridge logic lives in ../lib/studioExtensionBridge (pure,
 * unit-tested). This component just renders the <iframe>, mounts the bridge,
 * and forwards prop changes. See ../lib/studioExtensionBridge.js and
 * ./StudioAmdHost.jsx (the sibling host for AMD/React-component bundles).
 */

import React, { useEffect, useRef } from 'react';
import { mountStudioExtension } from '../lib/studioExtensionBridge';

const assetBase = (type) => `/custom_viz/${encodeURIComponent(type)}`;

export default function makeStudioExtensionHost(type) {
    const Host = ({ width = 400, height = 300, options = {}, dataSources = {} }) => {
        const iframeRef = useRef(null);
        const handleRef = useRef(null);

        useEffect(() => {
            const iframe = iframeRef.current;
            if (!iframe) return undefined;
            handleRef.current = mountStudioExtension(iframe, {
                assetBase: assetBase(type),
                options,
                dataSources,
            });
            return () => {
                if (handleRef.current) handleRef.current.destroy();
                handleRef.current = null;
            };
        // Mount once; prop changes are pushed through the handle below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [type]);

        useEffect(() => {
            if (handleRef.current) handleRef.current.update({ options });
        }, [options]);

        useEffect(() => {
            if (handleRef.current) handleRef.current.update({ dataSources });
        }, [dataSources]);

        return (
            <iframe
                ref={iframeRef}
                title={type}
                sandbox="allow-scripts allow-same-origin"
                style={{ width, height, border: 'none', display: 'block' }}
            />
        );
    };

    Host.displayName = `StudioExtensionHost(${type})`;
    return Host;
}
