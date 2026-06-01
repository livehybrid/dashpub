# Custom Visualizations (sideloading packaged Splunk apps)

dashpub renders Dashboard Studio dashboards with `@splunk/dashboard-core`. If a
dashboard uses a **custom visualization** built with the Splunk 10.x Dashboard
Studio framework (`framework_type = studio_visualization`), you can **sideload**
it from the packaged Splunk app that contains it — no code, no rebuilding by
hand, and the viz is never bundled into dashpub itself.

## What you provide

A directory of **extracted Splunk app folders** (not `.spl`/`.tar` archives),
mounted into the container and pointed to by `DASHPUB_CUSTOM_VIZ_PATH`:

```
/custom_viz/                              ← DASHPUB_CUSTOM_VIZ_PATH (a volume mount)
  viz-airspace-radar/                     ← an extracted Splunk app
    app.manifest                          ← app id  → <app-id>
    default/visualizations.conf           ← framework_type = studio_visualization
    appserver/static/visualizations/
      airspace_radar/                     ← viz name → <viz-name>
        visualization.js                  ← the packaged bundle (shipped as-is)
        visualization.css
        config.json
```

That's it. You don't write or edit any files.

## What `dashpub init` does (automatically, at container start)

For every `studio_visualization` it finds in the mounted apps it:

1. derives the type `<app-id>.<viz-name>` (e.g. `viz-airspace-radar.airspace_radar`)
   — this is exactly the `"type"` string the dashboard JSON uses;
2. copies `visualization.js` / `.css` / `config.json` into
   `public/custom_viz/<type>/` (served at `/custom_viz/<type>/…`);
3. emits a one-line shim into `src/custom_components/<type>/index.jsx` that points
   the generic **`StudioExtensionHost`** at that type.

The build then auto-registers it (via `import.meta.glob` in `src/preset.js`).

## Two packaging flavours, two hosts

Splunk ships custom Studio viz in two shapes; `dashpub init` sniffs each
`visualization.js` and picks the right host automatically — you do nothing.

| Bundle | How it's detected | Host | How it renders |
|---|---|---|---|
| **IIFE** talking to `globalThis.DashboardExtensionAPI` | uses `DashboardExtensionAPI` | `StudioExtensionHost` | sandboxed `<iframe>`, packaged JS loaded as-is, host bridges `options`/`dataSources` |
| **AMD** module (`define([...], factory)`) exporting a React `definition` — the official 10.x shape | starts with `define(` / `.amd` | `StudioAmdHost` | loaded via an AMD shim with React wired to dashpub's, rendered **inline** as a React component (no iframe) |

Both hosts live in `template/src/components/`; the shared logic is in
`template/src/lib/studioExtensionBridge.js` (iframe) and
`template/src/lib/studioAmdLoader.js` (AMD). For the iframe host, any
`DashboardExtensionAPI` method beyond the core surface (`addOptionsListener`,
`addDataSourcesListener`, `getOptions`, `getDataSources`) is stubbed and logged,
so view-only dashboards still render.

## Try it with the sample apps

`sample-splunk-apps/` contains two real packaged Studio viz — *no React source*,
just the shipped bundles:

- `viz-airspace-radar/` — an animated ADS-B radar scope (**iframe** flavour).
  Data contract (one row per aircraft): `hex, callsign, lat, lon, altitude_ft,
  heading, speed_kts`.
- `viz-realtime-clock/` — an analog clock (**AMD** flavour, official framework).

```bash
# point dashpub at the directory of app folders
export DASHPUB_CUSTOM_VIZ_PATH="$PWD/examples/custom-viz/sample-splunk-apps"
# …then run dashpub init / start the container as usual
```

Any dashboard referencing `"type": "viz-airspace-radar.airspace_radar"` or
`"viz-realtime-clock.realtime_clock"` will render the respective viz.

## Live demo (one command)

```bash
./examples/custom-viz/run-demo.sh
# then open http://localhost:3001/custom-viz-demo
```

This sideloads both sample apps, installs a demo dashboard
(`demo/custom-viz-demo/`) that references **both** custom viz types, builds, and
serves it through dashpub's real Express server + `DashboardCore`. The dashboard
uses a static `ds.test` source, so it renders five sample aircraft on the radar
and a live UTC clock with **no Splunk backend**.

## Tests

`template/tests/custom-viz/render.mjs` (run `npm run test:custom-viz`) loads both
sample bundles in real headless Chrome through the actual host libraries and
asserts each draws to its canvas — no Splunk, no container, no build required.

## Note

This **replaces** the older approach of hand-writing a React component per viz.
`DASHPUB_CUSTOM_DEPS` is also unnecessary for these viz — the iframe bundle is
self-contained, and the AMD bundle's externals are wired to dashpub's own React.
