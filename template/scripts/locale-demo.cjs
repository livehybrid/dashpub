/*
 * locale-demo.cjs — proves the en-GB locale change works, using the EXACT
 * packages dashpub ships:
 *   - @splunk/splunk-utils/config  (reads window.$C.LOCALE, captured once at import)
 *   - @splunk/moment               (the formatter @splunk/dashboard-utils uses via
 *                                    toSplunkMoment(ts).locale(config.locale).format())
 *
 * Run:  node scripts/locale-demo.cjs
 */

// ---------------------------------------------------------------------------
// Mirror index.html: set window.$C.LOCALE BEFORE any @splunk module is required.
// config captures the locale once at import — set it too late and it's missed
// (this is exactly why the fix lives in index.html, before the module bundle).
// ---------------------------------------------------------------------------
global.window = global.window || global;
global.window.$C = { LOCALE: 'en-GB', SPLUNKD_PATH: '/en-GB/splunkd/__raw' };

const moment = require('@splunk/moment').default;
const config = require('@splunk/splunk-utils/config');

// A sample Splunk result _time in the afternoon, so 12h vs 24h is obvious.
const SAMPLE_ISO = '2026-06-02T18:30:45+01:00';
// The tokens Splunk uses: short time / time+seconds / date / full.
const FMT = { Time: 'LT', 'Time+sec': 'LTS', Date: 'L', Full: 'LLL' };

// This mirrors @splunk/dashboard-utils exactly:
//   toSplunkMoment(ts).locale(config_exports.locale || 'en_US').format(fmt)
function show(title, localeName) {
  console.log(`\n${title}`);
  console.log('  locale used = ' + (localeName === undefined ? "undefined → 'en_US'" : `'${localeName}'`));
  const m = moment(SAMPLE_ISO).locale(localeName || 'en_US');
  for (const [label, fmt] of Object.entries(FMT)) {
    console.log(`    ${label.padEnd(10)} ${m.format(fmt)}`);
  }
  console.log(`    ${'(moment)'.padEnd(10)} ${m.locale()}`);
}

console.log('='.repeat(60));
console.log('dashpub locale demo — sample _time:', SAMPLE_ISO);
console.log('='.repeat(60));

// Proof 1: the REAL config module picked up the global index.html sets.
console.log('\n@splunk/splunk-utils/config.locale  =  ' + JSON.stringify(config.locale) +
            '   (from window.$C.LOCALE)');

// Proof 2: same formatter, two locales — the user-visible difference.
show('BEFORE  (no window.$C — old dashpub behaviour)', undefined);
show("AFTER   (config.locale from window.$C.LOCALE = 'en-GB')", config.locale);
console.log('');
