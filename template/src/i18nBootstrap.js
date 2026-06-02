/*
 * i18nBootstrap.js — make Splunk visualizations format TIME/DATES per locale.
 *
 * WHY THIS EXISTS
 * ---------------
 * Splunk's charting / visualization libraries do NOT format timestamps from
 * window.$C.LOCALE. They call a set of *global* functions on `window`:
 *
 *     format_time(t, "short")            // e.g. "08:00" vs "8:00 AM"
 *     format_datetime(t, "medium", "short")
 *     format_date(t, "MMM d, YYYY")
 *     locale_name()
 *
 * In a real Splunk Web page those globals are pre-seeded by Splunk's own
 * locale-aware i18n bootstrap (driven by the logged-in user's locale). In
 * dashpub (standalone) nothing seeds them, so @splunk/visualizations-shared's
 * `setI18nFunctions(window)` installs a HARDCODED en_US / 12-hour fallback
 * (time_formats.short = "h:mm a"). That is why setting $C.LOCALE alone never
 * changed the clock to 24-hour — the charts read these globals, not $C.
 *
 * This module re-seeds the time/date globals from the desired locale, the same
 * way real Splunk Web does. The Splunk fallbacks only assign `if (!global[k])`,
 * so once we define them ours are kept; we also force-assign here so we win
 * regardless of module import order. The charts call these globals lazily at
 * render time, long after this runs, so the override is in place in time.
 *
 * Locale source: window.$C.LOCALE (set in index.html, overwritten at build/dev
 * time from DASHPUB_LOCALE via scripts/htmlLocale.mjs). Default: en-GB (24h).
 *
 * NB: we reuse @splunk/moment — the exact engine the Splunk fallback uses — so
 * explicit pattern strings (e.g. "MMM d, YYYY", "YYYY") render identically to
 * before; the ONLY behaviour we change is the named time/date formats.
 */

import moment from '@splunk/moment';

// --- Resolve the desired locale -------------------------------------------
function resolveLocale() {
    try {
        const fromC = typeof window !== 'undefined' && window.$C && window.$C.LOCALE;
        if (fromC && typeof fromC === 'string') return fromC;
    } catch {
        /* ignore */
    }
    return 'en-GB';
}

// --- Detect 24-hour vs 12-hour from the locale ----------------------------
function is24Hour(locale) {
    try {
        const opts = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
        // hour12 is true for AM/PM locales (en-US), false/undefined for 24h (en-GB).
        if (typeof opts.hour12 === 'boolean') return !opts.hour12;
        if (opts.hourCycle) return opts.hourCycle === 'h23' || opts.hourCycle === 'h24';
    } catch {
        /* ignore */
    }
    // Fallback: only the en-US family defaults to 12-hour in our typical usage.
    return !/^en-US$/i.test(locale);
}

// --- Derive a short numeric date pattern (DD/MM vs MM/DD vs YYYY/MM/DD) ----
function shortDatePattern(locale) {
    try {
        const parts = new Intl.DateTimeFormat(locale, {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date(Date.UTC(2025, 0, 2)));
        const sep = (parts.find((p) => p.type === 'literal') || {}).value || '/';
        const order = parts.filter((p) => p.type !== 'literal').map((p) => p.type);
        const tok = { day: 'DD', month: 'MM', year: 'YY' };
        const pat = order.map((t) => tok[t]).filter(Boolean).join(sep.trim() || '/');
        if (pat) return pat;
    } catch {
        /* ignore */
    }
    return 'DD/MM/YY';
}

// --- Build the locale-aware format table ----------------------------------
function buildFormats(locale) {
    const h24 = is24Hour(locale);
    const time_formats = h24
        ? {
              short: 'HH:mm',
              medium: 'HH:mm:ss',
              long: 'HH:mm:ss z',
              full: 'HH:mm:ss z',
          }
        : {
              short: 'h:mm A',
              medium: 'h:mm:ss A',
              long: 'h:mm:ss A z',
              full: 'h:mm:ss A z',
          };
    const date_formats = {
        short: shortDatePattern(locale),
        medium: 'MMM D, YYYY',
        long: 'MMMM D, YYYY',
        full: 'dddd, MMMM D, YYYY',
    };
    return { time_formats, date_formats, h24 };
}

// Resolve a named format ("short"/"medium"/...) to a moment pattern, or pass an
// explicit pattern string straight through (matching the Splunk fallback).
function pattern(table, fmt, fallback) {
    if (fmt && Object.prototype.hasOwnProperty.call(table, fmt)) return table[fmt];
    return fmt || fallback;
}

export function installDashpubI18n(target = typeof window !== 'undefined' ? window : globalThis) {
    if (!target) return;
    const locale = resolveLocale();
    const { time_formats, date_formats } = buildFormats(locale);

    const format_time = (num, fmt) => moment(num).format(pattern(time_formats, fmt, 'HH:mm:ss'));
    const format_date = (num, fmt) => moment(num).format(pattern(date_formats, fmt, 'MMM D, YYYY'));
    const format_datetime = (num, dateFmt, timeFmt) =>
        `${format_date(num, dateFmt || 'medium')} ${format_time(num, timeFmt || 'medium')}`;

    // Force-assign the time/date globals so we win regardless of import order.
    // (We deliberately leave number formatters — format_number/decimal/etc. — to
    // the existing Splunk fallback; only time/date are locale-sensitive here.)
    target.format_time = format_time;
    target.format_time_microseconds = format_time;
    target.format_date = format_date;
    target.format_datetime = format_datetime;
    target.format_datetime_microseconds = format_datetime;
    if (!target.locale_name) {
        target.locale_name = () => locale.replace('-', '_');
    }

    if (typeof console !== 'undefined' && console.debug) {
        console.debug(`[dashpub] i18n time/date globals installed for locale "${locale}"`);
    }
}

installDashpubI18n();
