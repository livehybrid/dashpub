# Phase 0 spike findings — inputs/tokens

**Branch:** `ws-inputs-tokens-spike` · **Splunk:** 10.4.0 @ 192.168.0.222

## The gating question

Can a **custom** dashpub datasource (`ds.cdn`/`PublicDataSource`) obtain the
**raw selected token values** (not substituted SPL) from `@splunk/dashboard-core`,
and re-fetch when an input changes — so we can forward *values only* to the
server and keep all SPL server-side?

## Answer: YES — confirmed empirically

Harness: `template/src/spikeDatasource.js` (`ds.spike`) + test dashboard
`template/tests/inputs-tokens/fixtures/token-spike.json` (a `input.dropdown`
setting token `cluster`, default `prod`, and a `ds.spike` datasource whose
options embed the token in two places).

### 1. The framework substitutes tokens into the datasource `options` *before* construction — including arbitrary nested fields

Initial load (default `cluster=prod`), what the datasource received:

```json
{ "event":"construct", "options": {
    "query": "index=prod | stats count",
    "tokenBindings": { "cluster": "prod" }
}}
```

Both `query` **and** the custom nested `tokenBindings.cluster` were filled with
the selected value `prod`. So we can carry token values in a dedicated map and
read **raw values** without ever parsing SPL.

### 2. Changing the input re-instantiates + re-requests the datasource

Selecting "Dev" produced a brand-new datasource instance (`n:2`) and request:

```json
{ "event":"construct", "n":2, "options": { "tokenBindings": { "cluster":"dev" }, "query":"index=dev | stats count" }}
{ "event":"request",   "n":2, "options": { "tokenBindings": { "cluster":"dev" }, ... }}
```

…and the bound viz updated (`token_seen=dev`). This is driven by
`DataSource.equals()` (compares `options`): a token change → changed `options` →
treated as a new datasource → re-fetch. **No manual token-subscription needed.**

## Consequences for the design (refined)

- **Build time:** for each `ds.cdn`, emit `options.tokenBindings = { <tok>: "$<tok>$" }`
  for every token the *server-held* template uses. **Do not** ship the real SPL to
  the client — it stays in the server manifest; the client only gets the opaque
  `id` (`uri`) + the bindings map.
- **Frontend:** `PublicDataSource` reads `options.tokenBindings`, appends
  `?t.<name>=<value>` to the `uri` fetch, and re-fetches automatically on change.
- **Server:** validates each value (static set / dynamic set / time grammar),
  substitutes into the stored template with SPL-safe quoting, runs, caches by the
  validated token map.
- The client computes a substituted `query` too, but we **never send or trust it** —
  only `tokenBindings` values + the `id`. SPL never leaves the server.

## End-to-end spike built & tested

Beyond the gating mechanism, the full secure path was implemented and tested:

- **Security core** — `template/src/lib/tokenSecurity.cjs`: pure validation +
  SPL-safe substitution (`splQuote`, Splunk-time grammar, static/dynamic
  allow-list membership, multi `IN(...)`/`OR` expansion, fail-closed
  `buildSafeSearch`).
- **Validating endpoint** — `GET /api/spike/data/:dsid?t.<name>=<value>` in
  `server.js`: parses token *values*, resolves dynamic allow-lists by running the
  populating search, validates, substitutes into the **server-held** template, and
  runs it via the existing `executeSplunkSearch`. Self-contained synthetic data
  (`| makeresults`) — no indexes needed.
- **Token-aware datasource** — `SpikeDataSource` forwards only `tokenBindings`
  values to the endpoint and re-fetches on change.

### Test results (Splunk 10.4.0 @ 192.168.0.222)

| Suite | File | Result |
|-------|------|--------|
| Unit | `tests/inputs-tokens/tokenSecurity.test.cjs` (`npm run test:tokens`) | **28/28** — incl. a 12-case injection corpus |
| Integration (live Splunk) | `tests/inputs-tokens/integration.spike.mjs` | **12/12** — valid tokens change data; quote-breakout / command-injection / out-of-set / dynamic-not-in-set / unknown-token all return **400 fail-closed** before any search runs |
| Browser (live Splunk) | `tests/inputs-tokens/browser.spike.cjs` | **5/5** — dropdown → validated endpoint → real Splunk data; selecting "Dev" re-fetched `?t.cluster=dev` and the table changed (`web2` count 3→1) |

Observed safe query for `cluster=prod` + `hosts=[web1,web2]`:

```
… | search cluster="prod" host IN ("web1", "web2") | stats count by host
```

— the value is quoted/escaped and dynamic members were validated against the
populating search's live output; nothing the client sent reached SPL unchecked.

## Verdict

**The proposed architecture is validated end-to-end.** The gating unknown is
resolved, the injection-prevention model holds against a live instance, and the
frontend plumbing works. Proceed to productionise per the phasing in
`inputs-tokens.md` (build-time registry generation in `cli/`, token-aware
`PublicDataSource`, `/api/data/:dsid` token support, least-priv role docs). The
`ds.spike` / `/api/spike` scaffolding is spike-only and should be removed.
