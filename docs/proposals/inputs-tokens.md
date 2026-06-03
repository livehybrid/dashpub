# Proposal: Safe inputs & tokens in dashpub

**Status:** Draft / in progress (Phase 0 spike)
**Branch:** `ws-inputs-tokens-spike`

## Goal

Allow Dashboard Studio **inputs** (dropdowns, multi-select, time-range) and their
**tokens** to drive the data shown in a published dashpub dashboard — **without
ever enabling SPL injection**.

Decisions taken (interactive planning):

- **Allowed-value sources:** both **static** (from the dashboard definition) and
  **dynamic** (validated against a populating search).
- **Input types in scope:** single-select dropdown, multi-select dropdown,
  time-range picker. **Free-text is out of scope** (highest risk).
- **Hardening:** maximum defense-in-depth.

## How dashpub handles data today (baseline)

1. **Build time** (`cli/builddash.js` → `cli/datafns.js`): each datasource's SPL
   is hashed to an opaque `id` (`sha256(query, earliest, latest, refresh,
   postprocess)`). The dashboard JSON is rewritten so the datasource becomes
   `ds.cdn` → `uri: /api/data/<id>`, and a **server-side** manifest
   (`src/pages/api/data/_datasources.json`) maps `id → { search:{query,…}, app }`.
2. **Runtime** (`template/server.js`): `GET /api/data/:dsid` looks `dsid` up in
   the manifest (**unknown id → rejected**), runs the *stored* SPL live against
   Splunk with server credentials (`executeSplunkSearch`), and caches the JSON
   (keyed by `dsid` + `queryParameters`).
3. **The client never sends SPL** — only an opaque `id`. The query text lives
   server-side. `qualifiedSearchString` just prepends `search `.
4. **Tokens/inputs are effectively dead today**: `PublicDataSource`
   (`template/src/datasource.js`) fetches one fixed URI with no token-awareness;
   there is **no token substitution anywhere**; the build even *skips*
   token-bearing image URLs.

**Why this is the right foundation:** the golden rule for preventing SPL
injection is *the client may submit token **values**, never SPL*. dashpub's
`id`-indirection already enforces that. The feature is "let validated token
**values** flow into a server-held query **template**," not "let users run
searches."

## Design

### Core principle

The client submits **token names + values only**. The server:

1. holds the query **template** (with `$token$` placeholders),
2. **validates** every value against a finite, server-computed set (static or
   dynamic) or a strict typed grammar (time),
3. **substitutes** with SPL-safe quoting,
4. runs under a **least-privilege** Splunk role,
5. **caches** keyed by the validated token map.

### Build time (`cli/datafns.js`, `cli/builddash.js`)

- **Token-agnostic ids.** Compute the datasource `id` from the query *template*
  (placeholders intact) so one id serves all value combinations; values move to
  the runtime cache key.
- **Keep templates, don't bake.** Store `query`/`earliest`/`latest`/`postprocess`
  with `$token$` intact; record `tokensUsed: [...]` per datasource.
- **Token registry** (new manifest section) derived from the dashboard `inputs`:
  - single / multi dropdown →
    `{ type, default, source: 'static'|'dynamic', allowedValues?[] |
      optionsSourceId + valueField, expansion: 'in'|'or' }`
  - timerange → `{ type:'time', earliestToken, latestToken, default }`
  - For **dynamic** dropdowns, register the populating `ds.search` as its own
    `ds.cdn` datasource (`optionsSourceId`). It doubles as the dropdown's option
    list **and** the runtime validation set.

### Runtime (`template/server.js`)

- **Request shape:** `GET /api/data/:dsid?t.<name>=<value>` (multi = repeated
  `t.name=`).
- **Validation pipeline (security core)** — for each token a datasource declares:
  1. absent → registry default.
  2. **static** → exact match ∈ `allowedValues`.
  3. **dynamic** → run+cache `optionsSourceId` (short TTL), build the current set
     from `valueField`, value must be ∈ it.
  4. **time** → strict Splunk-time grammar allow-list; **never** enters SPL text —
     only `earliest_time`/`latest_time` params.
  5. **multi** → each member validated independently, count-capped.
  6. invalid (present but not valid) → **fail closed (400)**; defaults apply only
     when a token is *absent*.
- **Substitution:** replace `$name$` with validated values using **SPL-safe
  quoting** (wrap + escape `"`/`\`); multi expands to `field IN ("a","b")` or
  `(field="a" OR …)` per `expansion`.
- **Cache key** = `dsid` + canonical validated token map → finite allow-lists
  bound cardinality (anti-DoS).
- **Defense-in-depth:** result-count & time-range caps, search timeouts, rate
  limiting on token endpoints, structured logging of validation failures, a
  startup warning if the configured Splunk user looks over-privileged, plus docs
  for a least-priv role (restricted indexes, no `|delete|script|…`).

### Frontend (`template/src/datasource.js`, `preset.js`)

- Make `PublicDataSource` **token-aware**: include validated token values in the
  fetch URI and **re-subscribe when tokens change**.
- Dropdown option lists are just another `ds.cdn` search → fetched through the
  same `/api/data` pipe (dynamic options "just work" and serve as the validation
  source).

### Injection-prevention guarantees (summary)

- No client SPL ever (token values only).
- Every value validated against a finite server-computed set or strict typed
  grammar.
- SPL-safe quoting at substitution; multi/time handled specially (time never
  touches SPL text).
- Least-priv role + result/time caps + rate limiting as containment.
- Tokens restricted to the datasources that declare them; unknown tokens rejected.

## The gating unknown — Phase 0 spike

**How does `@splunk/dashboard-core` expose token *values* to a custom `ds.cdn`
datasource?** Studio normally substitutes tokens into a `ds.search` query
*client-side*; if that substituted SPL reached the server we'd reintroduce
injection. We must instead read **raw token values** from the dashboard token /
state context and pass them as `t.name=value`, re-fetching on change. Confirming
that API (and the re-fetch hook) is make-or-break and is the subject of the
Phase 0 spike (see `docs/proposals/inputs-tokens-spike-findings.md`).

## Phasing

0. **Spike** — token-value plumbing DashboardCore → custom datasource (+ the
   server-side validation/substitution/quoting core, unit + browser tested).
1. Single-select **static** end-to-end.
2. **Dynamic** (populating-search-validated) dropdowns.
3. **Multi-select** (safe expansion).
4. **Time-range** picker (param-based + grammar).
5. Cross-cutting: least-priv role docs, caps, and an **injection test corpus**.

## Open decisions

- **Fail-closed vs fallback-to-default** on an *invalid* (not absent) value —
  recommendation: fail-closed.
- **Multi expansion** style (`IN` vs `OR`) and whether template authors must
  annotate the token's field/position.
- **Dynamic-options cache TTL** and a hard cap on distinct values.
- Keep **free-text excluded** (or gate behind a strict per-token regex if ever
  needed).

## Testing strategy

- **Unit:** validators (static set, dynamic set, time grammar), SPL quoting /
  escaping, multi expansion, cache-key canonicalisation.
- **Injection corpus:** quote breakouts, `" | delete`, command-position payloads,
  oversized multi, out-of-set values, unknown tokens → all must fail closed.
- **Browser (Playwright):** a sample dashboard with a dropdown + timerange;
  verify data changes correctly and that out-of-set values fail closed.
