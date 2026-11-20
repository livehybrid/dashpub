# Render suite

Checks that dashpub still draws every Splunk visualization type, with real
data from a real Splunk, in a real browser.

| File | What it is |
| --- | --- |
| `fixtures.mjs` | The fixture dashboards: one panel per visualization type, each on a `makeresults` search with a known answer. |
| `seed-splunk.mjs` | Creates those dashboards (app `dashpub_e2e`) in a Splunk over REST. `--remove` takes the app out again. |
| `run-local.sh` | Seeds a Splunk you point it at, generates and builds a dashpub site from it, runs the suite. |
| `../template/tests/render.spec.mjs` | The Playwright spec. |
| `../.github/workflows/render-suite.yml` | The same thing in CI, against a Splunk container. No secrets. |

## What it asserts

For every panel, found by its id in the page:

- it is there, and reports the visualization type the fixture asked for
- it is not showing Splunk's error or "no data" placeholder
- it contains the fixture's own values (`4,242`, `e2e-host-3`, ...) or the
  elements that only exist once data arrived (three map markers)

For every page: no uncaught exception, no console error, every data request
answered `200` with rows.

One test compares the visualization types the Splunk packages register with
the types the fixtures cover. A `@splunk/*` update that adds a visualization
fails it until a panel is added to `fixtures.mjs`, so "does it work with the
new Splunk visualizations" is answered by CI, not by memory.

The last four tests break a panel on purpose (by rewriting a response on its
way to the browser) and expect the checks above to report it. They are the
proof that a green run means something.

## Running it locally

```bash
export SPLUNKD_URL=https://splunk.example:8089
export SPLUNKD_USER=admin SPLUNKD_PASSWORD=...     # or SPLUNKD_TOKEN=...
e2e/run-local.sh
```

It needs a Splunk you may create an app in (use a dev instance), Node 22 and
`npm ci` already run in the repository root and in `template/`. It leaves the
`dashpub_e2e` app behind so the next run is quick; take it out with
`node e2e/seed-splunk.mjs --remove`.

## Adding a visualization type

Add a panel to `fixtures.mjs`: `id`, `type`, a `makeresults` `query`, and
`expectText` (strings that only that panel can show) or `expectSelector`.
Run the suite. Then break the panel (wrong type, wrong query) and check the
suite goes red, before trusting the green.

## Relationship to the live suite

`e2e-playwright.yml` runs the older `dashboard.spec.ts` / `smoke.spec.ts`
against a real, long-lived Splunk configured through repository secrets. It
proves the image works against a production-shaped instance and token; it
cannot say much about what is on the page, because that data changes. The
render suite is the one that knows what each panel should show.
