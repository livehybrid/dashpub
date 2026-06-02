/*
 * locale-html-demo.mjs — proves DASHPUB_LOCALE overwrites the index.html locale.
 *
 * Exercises the SAME helper the Vite plugin uses (scripts/htmlLocale.mjs) against
 * the real index.html, so it reflects exactly what `npm run build` / dev produce.
 *
 *   node scripts/locale-html-demo.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { localeFromEnv, applyLocaleToHtml } from './htmlLocale.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

const lineOf = (h) => (h.match(/window\.\$C\.LOCALE\s*=\s*['"][^'"]*['"]/) || ['(none)'])[0];

console.log('index.html default            ', lineOf(html));
console.log('-'.repeat(60));

for (const env of [{}, { DASHPUB_LOCALE: 'en-US' }, { DASHPUB_LOCALE: 'fr-FR' }, { DASHPUB_LOCALE: 'oops!' }]) {
  const loc = localeFromEnv(env);
  const out = applyLocaleToHtml(html, loc);
  const label = 'DASHPUB_LOCALE=' + (env.DASHPUB_LOCALE ?? '(unset)');
  console.log(label.padEnd(28), '->', lineOf(out));
}
