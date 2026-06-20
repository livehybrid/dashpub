# Locale / 24-hour time formatting — findings

> **Status: not resolvable for chart axes.** This document records why dashpub
> cannot switch Splunk visualization **chart time-axis labels** (e.g. `10:00 PM`)
> to 24-hour time via a locale setting, and what was investigated. The
> `DASHPUB_LOCALE` / `window.$C.LOCALE` experiment was subsequently removed
> because it could not deliver the headline goal (24-hour chart axes).

## Goal

Mirror Splunk Web behaviour where, for a 24-hour locale (e.g. `en-GB`), times in
visualizations render as `22:00` instead of `10:00 PM`.

## TL;DR

Splunk visualizations format time/dates through **two completely independent
paths**, and only one of them is reachable from dashpub:

| Path | Used by | Reachable? |
|------|---------|------------|
| `window.format_time` / `format_date` / `format_datetime` i18n globals | Single-value tiles, tables, tooltips | ✅ Yes — can be made 24-hour |
| Highcharts `dateFormat(z[key], ts)` with a hardcoded LDML→Highcharts map | **Line / column / area chart time axes** | ❌ No — hardcoded 12-hour, Highcharts is encapsulated |

The visible "10:00 PM" labels are **chart-axis labels**, which fall in the
second, unreachable path. So the headline goal is not achievable without
modifying vendored Splunk code.

## Path 1 — i18n globals (reachable, works)

Splunk's libraries format many timestamps by calling global functions on
`window`: `window.format_time(ts, "short")`, `window.format_date(...)`,
`window.format_datetime(...)`, `window.locale_name()`.

In a real Splunk Web page these globals are **pre-seeded by Splunk's own
locale-aware i18n bootstrap** before the app loads. In standalone dashpub nothing
seeds them, so `@splunk/visualizations-shared/i18n.js` installs a **hardcoded
`en_US`, 12-hour fallback** (`time_formats.short = "h:mm a"`), and only does so
`if (!window[k])` — i.e. it intentionally defers to anything already defined.

Setting `window.$C.LOCALE` alone does **not** change these — `$C.LOCALE` is read
by `@splunk/splunk-utils/config` into an export that the formatting code does not
use.

A bootstrap that force-seeds locale-aware versions of these globals (24h vs 12h
derived from the locale) **does work** — verified live in a headless browser:

```js
window.$C.LOCALE            // "en-GB"
window.format_time(ts,'short')   // "22:05"   ✅ 24-hour
window.locale_name()             // "en_GB"
```

This correctly fixes single-value tiles, tables, and tooltips. It does **not**
touch chart axes (see Path 2). This is also why the standalone fallback is
designed the way it is: the `if (!window[k])` guard is the supported seam for a
host page to provide locale-aware i18n.

## Path 2 — Highcharts chart axes (not reachable)

The "10:00 PM" values are `<text>` nodes inside a `highcharts-*` SVG — Highcharts
time-axis tick labels. These are produced entirely inside
`@splunk/charting-bundle` (v28.6.0) and bypass the `window.format_*` globals.

Inside that bundle there is a fixed LDML→Highcharts format map:

```js
// @splunk/charting-bundle/index.js (minified) — "A mapping between LDML date
// format strings and Highcharts date format strings."
var z = {
  LT:   "%l:%M %p",            // "short" time   → 12-hour, hardcoded
  LTS:  "%l:%M:%S %p",         // "medium" time  → 12-hour
  LTMS: "%l:%M:%S.%L %p",
  "ddd MMM D": "%a %b %e",
  MMMM: "%B",
  YYYY: "%Y",
  ll:   "%b %e, %Y",
  lll:  "%b %e, %Y %l:%M %p",  // "short" datetime → 12-hour
  lls:  "%b %e, %Y %l:%M:%S %p",
  llms: "%b %e, %Y %l:%M:%S.%L %p",
};
```

The axis label formatter resolves to:

```js
var m = function (timestamp, ldmlKey, axisOptions) {
  if (p) return p(...);                              // p = null in practice
  return Highcharts.dateFormat(z[ldmlKey], timestamp);  // e.g. dateFormat("%l:%M %p", ts)
};
```

For the hour/minute unit the chosen key is `"LT"` → `z["LT"]` = `"%l:%M %p"` →
**12-hour, always**. Key facts that make this unfixable from dashpub:

1. **No locale gate.** `z` is a static object literal. The *only* locale-specific
   branch in the whole module is a special case for `ko_KR` / `zh_CN` / `zh_TW`
   that rewrites `window._i18n_locale.time_formats` — it does not apply to `en-GB`
   and operates on a different (`window._i18n_locale`) structure that the axis
   path does not read.
2. **Highcharts is encapsulated.** The bundle keeps its `Highcharts` reference
   module-private. It is **not** on `window` (verified: `typeof
   window.Highcharts === "undefined"`), so there is no runtime handle to call
   `Highcharts.setOptions(...)`, override `Highcharts.dateFormat`, or register a
   custom `time.dateFormat`.
3. **No supported visualization option.** The Splunk visualization schemas expose
   no `xAxisLabelFormat` / `timeFormat` / hour-cycle option to set per chart or
   globally.
4. **`window.format_time` is irrelevant here.** Even with the Path-1 globals made
   24-hour, the axis still renders 12-hour because it never calls them.

## Why real Splunk Web shows 24-hour but dashpub can't

In a full Splunk Web deployment the page is served with Splunk's complete i18n
bootstrap and locale catalog, and the charting library runs inside that host
context. dashpub renders the same vendored bundles **standalone**, without that
host i18n environment, so the charting bundle falls back to its built-in
`en_US`, 12-hour defaults — and there is no exposed hook to change them.

## Options considered (and why they were rejected for now)

| Option | Verdict |
|--------|---------|
| Set `window.$C.LOCALE` | Does nothing for formatting — not the lever. |
| Force-seed `window.format_*` i18n globals | Works for tiles/tables/tooltips only; **not** chart axes. |
| `Highcharts.setOptions` / override `Highcharts.dateFormat` at runtime | Not possible — Highcharts not exposed on `window`. |
| Per-visualization Splunk option | No such option exists in the viz schemas. |
| Patch `@splunk/charting-bundle`'s `z` table (patch-package or build-time transform) | Technically works, but means **maintaining a patch against vendored, minified Splunk code**, version-pinned to 28.6.0 and re-broken on every upgrade. Deemed not worth it. |

## Decision

The locale display-formatting experiment (`DASHPUB_LOCALE`, `window.$C.LOCALE`,
the i18n bootstrap, and the Vite HTML-locale plugin) was **removed**, since it
could not deliver 24-hour chart axes — the actual requirement. If revisited, the
only viable route is patching the `@splunk/charting-bundle` `z` map (gated on
locale so `en-US` keeps 12-hour), accepting the maintenance cost.

## Reproduction / verification notes

- Inspected: `@splunk/visualizations-shared/i18n.js` (the `setI18nFunctions`
  fallback) and `@splunk/charting-bundle/index.js` (the `z` map and `m`
  formatter).
- Live check used a headless browser to read `window.format_time`,
  `window.locale_name()`, and to confirm the 12-hour strings come from
  `highcharts-*` SVG `<text>` nodes, while `window.Highcharts` is undefined.
