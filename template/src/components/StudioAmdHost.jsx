/*
 * StudioAmdHost — React host for AMD-packaged Splunk Dashboard Studio custom
 * visualizations (the official 10.x shape: an AMD module exporting a viz
 * `definition` whose `.visualization` is a React component, with React/@splunk
 * declared as externals and loaded via RequireJS inside Splunk).
 *
 * Unlike the iframe host (StudioExtensionHost), these render INLINE with
 * dashpub's own React — exactly as Splunk's Dashboard Studio renders them. We
 * load the bundle through ../lib/studioAmdLoader (a minimal AMD shim), wiring
 * its externals to dashpub's React, then render the exported component with the
 * { width, height, options, dataSources } props dashboard-core provides.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { loadStudioAmdViz } from '../lib/studioAmdLoader';

const assetUrl = (type) => `/custom_viz/${encodeURIComponent(type)}/visualization.js`;

// Externals exposed to the AMD bundle. React MUST be dashpub's instance so the
// loaded component's hooks work. Add @splunk/* here if a viz externalises them.
const externals = {
    react: React,
    'react-dom': ReactDOM,
};

export default function makeStudioAmdHost(type) {
    const Host = (props) => {
        const [Viz, setViz] = useState(null);
        const [error, setError] = useState(null);

        useEffect(() => {
            let alive = true;
            loadStudioAmdViz(assetUrl(type), externals)
                .then((def) => { if (alive) setViz(() => def.visualization); })
                .catch((e) => {
                    // eslint-disable-next-line no-console
                    console.error(`[dashpub] failed to load AMD custom viz ${type}:`, e);
                    if (alive) setError(e);
                });
            return () => { alive = false; };
        }, []);

        if (error) {
            return (
                <div style={{ color: '#c0392b', padding: 8, font: '12px monospace' }}>
                    Custom viz {type} failed to load: {String((error && error.message) || error)}
                </div>
            );
        }
        if (!Viz) return null;
        return <Viz {...props} />;
    };

    Host.displayName = `StudioAmdHost(${type})`;
    return Host;
}
