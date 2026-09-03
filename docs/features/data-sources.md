---
layout: default
title: Data Sources
parent: Features
nav_order: 9
---

# Data Sources

Every data source in a Dashboard Studio definition is rewritten at build time into a
`ds.cdn` source pointing at `/api/data/<id>`. The server resolves that id against the
generated manifest and runs the search on demand, so published dashboards never carry
SPL or credentials to the browser.

## Supported types

| Type | Support | Notes |
|---|---|---|
| `ds.search` | Yes | Dispatched as an ad-hoc search job |
| `ds.savedSearch` | Yes | Resolved against the report's job history |
| `ds.chain` | Yes | Collapsed onto the search it extends, at any depth |
| `ds.test` | Yes | Passed through untouched for static test data |

Any other type, or a data source that carries neither a query nor a saved search
reference, is skipped with a warning during `dashpub init`:

```
WARN: Skipping data source ds_abc123 (type ds.unknown) - no query or saved search ref.
Visualizations bound to it will render without data.
```

A skipped data source leaves its panels bound to an id that no longer exists, so they
render empty rather than showing an error. If a panel is blank in Dashpub but populated
in Splunk Web, check the build log for that warning first.

## `ds.savedSearch` (reports and alerts)

Panels bound to a report by name work without modification. Dashpub reads the report's
job history and serves the newest completed, non-failed artifact, which is what Splunk
Web does. Displaying a scheduled report therefore costs no extra searches.

If the report has no usable artifact — it is published but never scheduled, or its
artifacts have expired — Dashpub dispatches the report and waits for the result. It also
recovers if the artifact is reaped between reading the history and reading the job. This
fallback is the practical advantage over rewriting a panel as `ds.search` with
`| loadjob`, which simply errors when no artifact exists.

### Requirements

- The publishing user needs read access to the report object itself (`saved/searches`)
  in the app that owns it, not just to the underlying indexes.
- Where a report lives in a different app to the dashboard, set `app` in the data source
  options and Dashpub looks it up there.

### Forcing a re-run

By default the newest artifact is always served, however old. Set
`DASHPUB_SAVED_SEARCH_MAX_AGE` to re-run a report whose newest artifact is older than
that many seconds — useful for reports that are published but not scheduled. See
[Configuration](../configuration/).

## `ds.chain` (base search and post-process)

A chain is folded into a single post-process pipeline applied to the search it extends,
and the pipeline is applied server-side when results are read. Chains may extend other
chains; every hop's SPL is concatenated in order onto the root search.

```
ds_base    ds.search  index=main | timechart count
ds_chain1  ds.chain   extends ds_base    | stats sum(count) AS Total
ds_chain2  ds.chain   extends ds_chain1  | eval x=Total*2
```

`ds_chain2` runs `index=main | timechart count` with
`| stats sum(count) AS Total | eval x=Total*2` as its post-process. Chains over
`ds.savedSearch` work the same way, post-processing the report's artifact.

A circular `extend` reference fails the build naming the data source involved.

### Cost

Each chain is a separate data source id, so several chains over one base mean several
history lookups and several reads of the same job. No additional searches are dispatched,
but unlike Splunk Web — which chains client-side off one base search — Dashpub
post-processes server-side per chain.

## Related documentation

- [Configuration](../configuration/) - `DASHPUB_SAVED_SEARCH_MAX_AGE` and other settings
- [Caching System](caching/) - how data source responses are cached
- [API Reference](../api/) - the `/api/data/:dsid` endpoint
