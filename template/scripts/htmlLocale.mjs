/*
 * htmlLocale.mjs — shared locale logic for dashpub's index.html.
 *
 * Used by:
 *   - vite.config.js               (transformIndexHtml, at dev + build / CLI time)
 *   - scripts/locale-html-demo.mjs (test/demo, no build needed)
 *
 * DASHPUB_LOCALE, when set, OVERWRITES the locale baked into index.html, so the
 * same source tree can publish en-GB (24h) / en-US (12h) / fr-FR / ... without
 * editing any file. When unset, the index.html default is kept as-is.
 *
 * NOTE: this is intentionally separate from SPLUNKD_LOCALE (cli/assets.js), which
 * is the Splunk *static-asset* path prefix (e.g. /en-US/static/...). Leave that
 * at en-US — Splunk may not ship static assets for every display locale, so
 * changing it risks 404s. DASHPUB_LOCALE only affects runtime time/date format.
 */

// Permissive BCP-47-ish check (en, en-GB, fr-FR, zh-Hans-CN...). Guards against
// HTML injection via the env value.
const LOCALE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Resolve a validated locale from the environment, or null if unset/invalid. */
export function localeFromEnv(env = process.env) {
  const loc = (env.DASHPUB_LOCALE || '').trim();
  if (!loc) return null;
  if (!LOCALE_RE.test(loc)) {
    console.warn(`[dashpub] Ignoring invalid DASHPUB_LOCALE="${loc}" (expected BCP-47, e.g. en-GB)`);
    return null;
  }
  return loc;
}

/**
 * Overwrite the `window.$C.LOCALE = '...'` value in index.html. If that default
 * line is absent, inject the locale script before the first module script (or
 * before </head>). Returns the (possibly unchanged) html.
 */
export function applyLocaleToHtml(html, locale) {
  if (!locale) return html;
  const assignRe = /(window\.\$C\.LOCALE\s*=\s*)(['"]).*?\2/;
  if (assignRe.test(html)) {
    return html.replace(assignRe, `$1'${locale}'`);
  }
  const inject = `<script>window.$C=window.$C||{};window.$C.LOCALE='${locale}';</script>\n    `;
  if (/<script\s+type="module"/.test(html)) {
    return html.replace(/<script\s+type="module"/, inject + '<script type="module"');
  }
  return html.replace(/<\/head>/i, inject + '</head>');
}
