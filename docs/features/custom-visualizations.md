---
layout: default
title: Custom Visualizations
parent: Features
nav_order: 8
---

# Custom Visualizations
{: .no_toc }

Sideload Splunk Dashboard Studio (10.x) custom visualizations into dashpub —
straight from the packaged Splunk app, with no code to write and nothing baked
into dashpub itself.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

dashpub renders Dashboard Studio dashboards with `@splunk/dashboard-core`. When
a dashboard references a **custom visualization** (`framework_type =
studio_visualization`), that viz is not part of `@splunk/dashboard-core` — in
Splunk it is loaded by the Dashboard Studio *app shell*, which dashpub does not
have.

dashpub fills that gap. You **mount the packaged Splunk app(s)** that contain the
viz; at build time dashpub extracts each viz, serves its bundle, and registers a
generic host that renders it. The custom viz is never committed into dashpub —
each deployment brings its own.

Key properties:

- **No code, no edits.** You mount app folders and set one environment variable.
- **Packaged apps, as-is.** The shipped `visualization.js` is used unmodified.
- **Both packaging flavours** are detected and handled automatically.
- **Not distributed with dashpub.** Sideloaded assets are git-ignored.

## How it works

```
DASHPUB_CUSTOM_VIZ_PATH                     (a volume of extracted Splunk apps)
        │   dashpub init  (runs at container start)
        ▼
  for each studio_visualization:
    • type   = <app-id>.<viz-name>
    • assets → public/custom_viz/<type>/   (served at /custom_viz/<type>/…)
    • shim   → src/custom_components/<type>/index.jsx
        │   vite build  (src/preset.js auto-registers via import.meta.glob)
        ▼
  @splunk/dashboard-core renders "<type>" with a generic host:
    • StudioExtensionHost  (iframe)   — IIFE + DashboardExtensionAPI bundles
    • StudioAmdHost        (inline)   — AMD module + React component bundles
```

The container entrypoint runs `dashpub init` (which copies the template and
ingests the mounted apps) followed by `npm run build`, so the mounted volume is
present at build time and the sideloaded viz are bundled and registered.

## Quick start

Mount a directory of **extracted Splunk app folders** (not `.spl`/`.tar`
archives) and point `DASHPUB_CUSTOM_VIZ_PATH` at it:

```yaml
# docker-compose (excerpt)
services:
  dashpub:
    image: livehybrid/splunk-dashpub
    environment:
      DASHPUB_CUSTOM_VIZ_PATH: /custom_viz
      # …your usual DASHPUB_APP / DASHPUB_DASHBOARDS / Splunk env…
    volumes:
      - ./my-splunk-apps:/custom_viz:ro
```

`./my-splunk-apps` contains one folder per app, e.g.:

```
my-splunk-apps/
  viz-airspace-radar/
    app.manifest
    default/visualizations.conf
    appserver/static/visualizations/airspace_radar/
      visualization.js
      visualization.css
      config.json
```

Any dashboard whose JSON references `"type": "viz-airspace-radar.airspace_radar"`
will now render the viz. That's it.

### Run the bundled demo

The repository ships two sample packaged apps and a one-command demo that needs
no Splunk backend:

```bash
./examples/custom-viz/run-demo.sh
# then open http://localhost:3001/custom-viz-demo
```

It sideloads an iframe-hosted radar and an AMD-hosted clock, installs a demo
dashboard that uses a static `ds.test` source, builds, and serves through
dashpub's real server.

## The type string

The viz `"type"` used in a dashboard definition — and the key dashpub registers
it under — is always:

```
<app-id>.<viz-name>
```

- **`<app-id>`** comes from the app's `app.manifest` (`info.id.name`), falling
  back to the app folder name.
- **`<viz-name>`** is the visualization folder under
  `appserver/static/visualizations/` and the stanza name in
  `visualizations.conf`.

For an app `viz-airspace-radar` shipping a viz `airspace_radar`, the type is
`viz-airspace-radar.airspace_radar`.

## Packaging a compatible visualization

If you are *building* a viz to be sideloaded, package it as a normal Splunk
Dashboard Studio custom visualization:

```
<your-app>/
  app.manifest                         # info.id.name = <app-id>
  default/visualizations.conf          # see below
  appserver/static/visualizations/<viz-name>/
    visualization.js                   # the built bundle (required)
    visualization.css                  # optional
    config.json                        # optionsSchema / dataContract (optional for dashpub)
```

```ini
# default/visualizations.conf
[<viz-name>]
label = My Viz
framework_type = studio_visualization
```

dashpub keys off `framework_type = studio_visualization` and the presence of
`appserver/static/visualizations/<viz-name>/visualization.js`. Two bundle shapes
are supported and detected automatically:

### Flavour A — iframe extension (`DashboardExtensionAPI`)

A self-contained bundle (typically an IIFE) that renders itself into a `#root`
element and communicates through `globalThis.DashboardExtensionAPI`:

```js
(function () {
  var api = globalThis.DashboardExtensionAPI;
  api.addOptionsListener(function (options) { /* re-render */ });
  api.addDataSourcesListener(function (dataSources) { /* re-render */ });
  // also available: api.getOptions(), api.getDataSources()
  var root = document.getElementById('root');
  // …draw into root…
})();
```

dashpub hosts these in a sandboxed `<iframe>` (`StudioExtensionHost`) and
provides the `DashboardExtensionAPI`.

### Flavour B — AMD module + React component (official 10.x)

An AMD module (`libraryTarget: 'amd'`) whose default export is a viz
`definition` with a React `visualization` component, built with React (and
optionally `@splunk/*`) as **externals**:

```js
// src/index.js
import MyViz from './MyViz';          // a React component: ({width,height,options,dataSources}) => …
export default {
  name: 'my_viz',
  optionsSchema: { /* … */ },
  visualization: MyViz,
};
// → bundles to: define(["react"], factory)  with `{ default: definition }`
```

dashpub loads these with a minimal AMD shim, wires the externals to **its own**
React, and renders the component **inline** (`StudioAmdHost`) — exactly as
Splunk's Dashboard Studio does.

> Both sample apps in `examples/custom-viz/sample-splunk-apps/` are real,
> buildable references — the radar (Flavour A) and the clock (Flavour B).

## How options and data reach the viz

`@splunk/dashboard-core` renders the registered host with the props
`{ width, height, options, dataSources }`:

- **`options`** — the panel's `options` object from the dashboard JSON.
- **`dataSources`** — keyed by name (e.g. `primary`); each entry's `.data` is
  Splunk's columnar `{ fields: [{name}], columns: [[…]] }` (some sources provide
  `{ fields, rows }`).

For **Flavour A**, the host forwards these into the iframe via
`addOptionsListener` / `addDataSourcesListener` / `getOptions` / `getDataSources`,
normalising `dataSources` to `{ <name>: { data: { fields, columns } } }`.

For **Flavour B**, the props are passed straight to the React component.

`config.json`'s `optionsSchema` defaults are applied by Splunk's editor, not by
dashpub — a published viz should default its own options internally (e.g.
`options.color || DEFAULTS.color`).

## The hosts

Both live in `template/src/components/`; shared logic is in `template/src/lib/`.

| Host | Bundle | Detected by | Rendering |
|---|---|---|---|
| `StudioExtensionHost` | IIFE + `DashboardExtensionAPI` | uses `DashboardExtensionAPI` | sandboxed `<iframe>` |
| `StudioAmdHost` | AMD `define([...], factory)` | starts with `define(` / `.amd` | inline React (shared instance) |

- `template/src/lib/studioExtensionBridge.js` — the iframe ↔ `DashboardExtensionAPI`
  bridge (pure, unit-tested). Methods beyond the core surface
  (`addOptionsListener`, `addDataSourcesListener`, `getOptions`,
  `getDataSources`) are **stubbed and logged**, so a view-only dashboard renders
  even if a viz reaches for an editor-only or eventing API.
- `template/src/lib/studioAmdLoader.js` — the AMD shim. Externals are injected by
  the host (`react`, `react-dom`). If a viz externalises `@splunk/*`, add those
  modules to the `externals` map in `template/src/components/StudioAmdHost.jsx`.

Registration happens with no codegen: `template/src/preset.js` discovers every
`src/custom_components/*/index.{js,jsx}` via Vite's `import.meta.glob`. The CLI
emits one such shim per viz, pointing at the correct host.

## Testing

A self-contained render test loads both sample bundles in real headless Chrome,
through the actual host libraries, and asserts each draws to its canvas — no
Splunk, no container, no build:

```bash
cd template
npm run test:custom-viz
```

## Limitations and notes

- **View-only.** The iframe host implements the core view-time
  `DashboardExtensionAPI`; editor-only and drilldown/eventing methods are
  stubbed and logged, not implemented.
- **AMD externals.** `StudioAmdHost` provides `react` and `react-dom`. Viz that
  externalise additional modules need those added to its `externals` map.
- **`DASHPUB_CUSTOM_DEPS` is unnecessary** for sideloaded studio viz — Flavour A
  bundles are self-contained, and Flavour B externals are wired to dashpub's own
  React.
- **Archives are not unpacked.** Mount *extracted* app folders, not `.spl`/`.tar`.
- Sideloaded assets land in git-ignored locations
  (`public/custom_viz/`, `src/custom_components/`), so they are never committed
  into dashpub.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Panel is blank, console: *no visualization registered for type …* | The dashboard `"type"` does not match `<app-id>.<viz-name>`, or the app was not under `DASHPUB_CUSTOM_VIZ_PATH` at build time. |
| `404 /custom_viz/<type>/visualization.js` | The viz was not ingested — check the app has `framework_type = studio_visualization` and `appserver/static/visualizations/<viz>/visualization.js`. |
| AMD viz shows *"failed to load"* | The bundle externalises a module not in `StudioAmdHost`'s `externals` map. |
| Iframe viz never draws | The bundle expects a `DashboardExtensionAPI` method that isn't implemented (check the console for the stub-and-log warning). |
