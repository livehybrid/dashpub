/*
 * tokenSecurity.cjs — server-side validation & safe substitution of dashboard
 * input tokens into SPL. Phase 0 spike core for docs/proposals/inputs-tokens.md.
 *
 * THREAT MODEL: the client may submit token *values*, never SPL. Every value is
 * validated against a finite, server-computed allow-list (static or dynamic) or
 * a strict typed grammar (time/number) and then substituted into a server-held
 * query *template* with SPL-safe quoting. Anything not provably safe FAILS CLOSED.
 *
 * Pure functions only (no I/O) so they are exhaustively unit-testable.
 */

'use strict';

class TokenError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'TokenError';
        this.code = code || 'INVALID_TOKEN';
        this.details = details || {};
    }
}

// --- SPL-safe quoting -------------------------------------------------------
// Double-quote a value for a value position in SPL, escaping backslash and
// double-quote (Splunk uses backslash escaping inside double-quoted strings).
// Reject ASCII control chars (newline/CR/tab/NUL/DEL) outright (defense in depth).
const CONTROL_RE = new RegExp('[\u0000-\u001f\u007f]');
function splQuote(value) {
    const s = String(value);
    if (CONTROL_RE.test(s)) {
        throw new TokenError('Value contains control characters', 'UNSAFE_VALUE', { value: s });
    }
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// A conservative field-name guard. Field names come from the (trusted) manifest,
// not user input, but we constrain them anyway so a misconfigured dashboard can't
// inject via the field position.
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;
function assertField(field) {
    if (typeof field !== 'string' || !FIELD_RE.test(field)) {
        throw new TokenError('Unsafe field name', 'UNSAFE_FIELD', { field });
    }
    return field;
}

// --- Splunk time grammar ----------------------------------------------------
// Allow-list for time modifiers: now | a relative spec (e.g. -24h, +15m@h,
// -7d@d) | a snap-only spec (@d) | an epoch integer | an ISO-8601 timestamp.
// Real-time (rt...) is intentionally NOT allowed in a published context.
const TIME_UNIT = '(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mon|month|months|q|qtr|quarter|y|yr|yrs|year|years)';
const REL = `[+-]\\d+${TIME_UNIT}`;
const SNAP = `@${TIME_UNIT}(?:[+-]\\d+${TIME_UNIT})?`;
const TIME_RE = new RegExp(
    '^(?:' +
        'now' +
        `|(?:${REL})(?:${SNAP})?` + // relative, optional snap
        `|(?:${SNAP})` + // snap only
        '|\\d{1,19}' + // epoch seconds
        '|\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?' + // ISO-8601
    ')$'
);
function isValidSplunkTime(value) {
    return typeof value === 'string' && TIME_RE.test(value.trim());
}

// --- value-set validation ---------------------------------------------------
// Exact-match membership in a finite allow-list (static list from the dash, or a
// dynamically-computed set from a populating search).
function isInAllowedSet(value, allowedValues) {
    return Array.isArray(allowedValues) && allowedValues.some((a) => String(a) === String(value));
}

// --- multi-select expansion -------------------------------------------------
// Expand a validated set of values to a safe SPL fragment. Each value is quoted.
function expandMulti(field, values, style) {
    assertField(field);
    if (!Array.isArray(values) || values.length === 0) {
        throw new TokenError('multi token has no values', 'EMPTY_MULTI', { field });
    }
    const quoted = values.map(splQuote);
    if (style === 'or') {
        return '(' + quoted.map((q) => `${field}=${q}`).join(' OR ') + ')';
    }
    // default: IN(...)
    return `${field} IN (` + quoted.join(', ') + ')';
}

/*
 * tokenSpec shape (from the build-time registry):
 *   {
 *     name: 'cluster',
 *     splKind: 'string' | 'number' | 'multi' | 'time',
 *     source: 'static' | 'dynamic',         // for string/multi
 *     allowedValues?: string[],              // static
 *     default?: string | string[],
 *     field?: string,                        // for multi expansion
 *     expansion?: 'in' | 'or',               // for multi
 *     maxValues?: number,                    // for multi (default 100)
 *     timeBound?: 'earliest' | 'latest'      // for time
 *   }
 *
 * `dynamicAllowed` is the freshly-computed allow-list (array) for dynamic tokens.
 *
 * Returns { spl } (safe text to substitute for $name$) or { time } (for time
 * tokens, routed to search params). Throws TokenError (fail closed) on anything
 * invalid.
 */
function resolveToken(spec, rawValue, dynamicAllowed) {
    const kind = spec.splKind;

    if (kind === 'time') {
        const v = rawValue == null ? spec.default : rawValue;
        if (!isValidSplunkTime(v)) {
            throw new TokenError(`Invalid time value for "${spec.name}"`, 'INVALID_TIME', { name: spec.name, value: v });
        }
        return { time: String(v).trim() };
    }

    if (kind === 'number') {
        const v = rawValue == null ? spec.default : rawValue;
        if (!/^-?\d+(?:\.\d+)?$/.test(String(v))) {
            throw new TokenError(`Invalid number for "${spec.name}"`, 'INVALID_NUMBER', { name: spec.name, value: v });
        }
        return { spl: String(v) }; // bareword numeric — not quoted
    }

    const allowed = spec.source === 'dynamic' ? dynamicAllowed : spec.allowedValues;
    if (!Array.isArray(allowed)) {
        throw new TokenError(`No allow-list available for "${spec.name}"`, 'NO_ALLOWLIST', { name: spec.name });
    }

    if (kind === 'multi') {
        let values = rawValue == null ? spec.default : rawValue;
        if (!Array.isArray(values)) values = values == null ? [] : [values];
        // An empty multi-select means "no constraint" (standard Studio semantics):
        // substitute empty string rather than erroring.
        if (values.length === 0) {
            return { spl: '' };
        }
        const cap = spec.maxValues || 100;
        if (values.length > cap) {
            throw new TokenError(`Too many values for "${spec.name}"`, 'TOO_MANY_VALUES', { name: spec.name, count: values.length, cap });
        }
        for (const v of values) {
            if (!isInAllowedSet(v, allowed)) {
                throw new TokenError(`Value not in allow-list for "${spec.name}"`, 'NOT_ALLOWED', { name: spec.name, value: v });
            }
        }
        return { spl: expandMulti(spec.field, values, spec.expansion) };
    }

    // single string
    const v = rawValue == null ? spec.default : rawValue;
    if (!isInAllowedSet(v, allowed)) {
        throw new TokenError(`Value not in allow-list for "${spec.name}"`, 'NOT_ALLOWED', { name: spec.name, value: v });
    }
    return { spl: splQuote(v) };
}

// --- template substitution --------------------------------------------------
// Replace each declared $name$ with its safe SPL text. Token names are validated
// to a safe identifier so the dynamically-built RegExp is itself safe.
function substituteTemplate(template, splByToken) {
    let out = String(template);
    for (const [name, splText] of Object.entries(splByToken)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
            throw new TokenError('Illegal token name', 'BAD_TOKEN_NAME', { name });
        }
        const re = new RegExp('\\$' + name + '\\$', 'g');
        out = out.replace(re, splText);
    }
    return out;
}

// --- canonical cache key ----------------------------------------------------
function canonicalTokenKey(tokenMap) {
    const keys = Object.keys(tokenMap || {}).sort();
    return keys.map((k) => `${k}=${JSON.stringify(tokenMap[k])}`).join('&');
}

/*
 * Top-level: take a server-held datasource template + registry + raw client
 * inputs (+ any dynamic allow-lists) and produce a safe, ready-to-run search.
 *
 *   template:    { query, postprocess?, latestToken? }
 *   registry:    { [tokenName]: tokenSpec }
 *   rawInputs:   { [tokenName]: value|value[] }   (from the client; untrusted)
 *   dynamicSets: { [tokenName]: string[] }        (server-computed allow-lists)
 *
 * Returns { query, postprocess, earliest, latest, cacheKey }. Throws on anything
 * unsafe (fail closed).
 */
function buildSafeSearch(template, registry, rawInputs, dynamicSets) {
    rawInputs = rawInputs || {};
    dynamicSets = dynamicSets || {};

    // Reject inputs for tokens that aren't declared in the registry.
    for (const name of Object.keys(rawInputs)) {
        if (!Object.prototype.hasOwnProperty.call(registry, name)) {
            throw new TokenError(`Unknown token "${name}"`, 'UNKNOWN_TOKEN', { name });
        }
    }

    const splByToken = {};
    const usedValues = {};
    let earliest;
    let latest;

    for (const [name, spec] of Object.entries(registry)) {
        const resolved = resolveToken({ ...spec, name }, rawInputs[name], dynamicSets[name]);
        if (resolved.time !== undefined) {
            if (spec.timeBound === 'latest' || name === template.latestToken) {
                latest = resolved.time;
            } else {
                earliest = resolved.time;
            }
            usedValues[name] = resolved.time;
        } else {
            splByToken[name] = resolved.spl;
            usedValues[name] = rawInputs[name] == null ? spec.default : rawInputs[name];
        }
    }

    const query = substituteTemplate(template.query, splByToken);
    const postprocess = template.postprocess ? substituteTemplate(template.postprocess, splByToken) : '';

    return {
        query,
        postprocess,
        earliest,
        latest,
        cacheKey: canonicalTokenKey(usedValues),
    };
}

module.exports = {
    TokenError,
    splQuote,
    assertField,
    isValidSplunkTime,
    isInAllowedSet,
    expandMulti,
    resolveToken,
    substituteTemplate,
    canonicalTokenKey,
    buildSafeSearch,
};
