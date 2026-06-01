/*
 * Airspace Radar — Splunk Dashboard Studio Custom Visualization
 *
 * Renders an animated phosphor radar scope on an HTML5 Canvas.
 * A CSS-timed sweep arm rotates continuously; aircraft blips light up
 * when the sweep crosses their bearing and fade over the next rotation.
 *
 * Data contract (primary data source — one row per aircraft):
 *   hex          (string)  ICAO 24-bit address — used as stable blip ID
 *   callsign     (string)  Flight callsign, e.g. "BAW123"
 *   lat          (number)  Latitude in decimal degrees
 *   lon          (number)  Longitude in decimal degrees
 *   altitude_ft  (number)  Barometric altitude in feet
 *   heading      (number)  Track / true heading in degrees (0–360)
 *   speed_kts    (number)  Ground speed in knots
 *
 * Options (all configurable in the Studio editor):
 *   centerLat       (number, default 53.8)   Radar centre latitude
 *   centerLon       (number, default -1.55)  Radar centre longitude
 *   rangeNm         (number, default 50)     Radar radius in nautical miles
 *   sweepSeconds    (number, default 8)      One full rotation in seconds
 *   showLabels      (boolean, default true)  Show callsign labels
 *   showAltitude    (boolean, default true)  Show altitude in flight levels
 *   showHeadingVector (boolean, default true) Draw heading velocity vector
 *   colorScheme     (green|amber|blue)       Phosphor colour
 *   homeLabel       (string, default 'Leeds') Label on the centre dot
 */
(function () {
    'use strict';

    /* ~1 degree latitude in nautical miles (constant) */
    var NM_PER_DEG_LAT = 60.04;

    var PALETTES = {
        green: {
            bg:        '#010c06',
            ring:      'rgba(0,255,65,0.14)',
            ringOuter: 'rgba(0,255,65,0.32)',
            bright:    '#00ff41',
            sweepRGB:  '0,255,65',
            label:     'rgba(0,255,65,0.8)',
            cardinal:  'rgba(200,255,210,0.5)',
            home:      '#00d4aa',
        },
        amber: {
            bg:        '#0c0500',
            ring:      'rgba(255,160,0,0.14)',
            ringOuter: 'rgba(255,160,0,0.32)',
            bright:    '#ffb020',
            sweepRGB:  '255,160,0',
            label:     'rgba(255,160,0,0.8)',
            cardinal:  'rgba(255,230,180,0.5)',
            home:      '#00d4aa',
        },
        blue: {
            bg:        '#01060e',
            ring:      'rgba(40,160,255,0.14)',
            ringOuter: 'rgba(40,160,255,0.32)',
            bright:    '#44aaff',
            sweepRGB:  '40,160,255',
            label:     'rgba(40,160,255,0.8)',
            cardinal:  'rgba(180,220,255,0.5)',
            home:      '#00d4aa',
        },
    };

    var DEFAULTS = {
        centerLat:        53.8,
        centerLon:        -1.55,
        rangeNm:          50,
        sweepSeconds:     8,
        showLabels:       true,
        showAltitude:     true,
        showHeadingVector:true,
        colorScheme:      'green',
        homeLabel:        'Leeds',
    };

    /* ---- Data helpers ---- */

    function num(v) {
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    /* Extract all rows from the Studio-shaped primary data source. */
    function parseRows(ds) {
        var src = ds;
        if (src && src.dataSources) src = src.dataSources;
        var data = src && src.primary && src.primary.data;
        if (!data || !data.fields) return [];
        var fields = data.fields.map(function (f) { return (f && f.name) || String(f); });
        var cols = data.columns || [];
        var nRows = cols.length > 0 ? (cols[0] || []).length : 0;
        var rows = [];
        for (var r = 0; r < nRows; r++) {
            var row = {};
            for (var c = 0; c < fields.length; c++) {
                row[fields[c]] = (cols[c] || [])[r];
            }
            rows.push(row);
        }
        return rows;
    }

    /*
     * Project a lat/lon onto the radar disc.
     * Returns {nx, ny, brg, distNm} where:
     *   nx, ny   normalised position (-1..1), east=+x, north=+y
     *   brg      bearing from centre in radians, 0=north, clockwise
     *   distNm   actual distance in nm
     * Returns null if the aircraft is outside rangeNm.
     */
    function project(lat, lon, cLat, cLon, rangeNm) {
        var nmPerDegLon = NM_PER_DEG_LAT * Math.cos(cLat * Math.PI / 180);
        var dLatNm = (lat - cLat) * NM_PER_DEG_LAT;
        var dLonNm = (lon - cLon) * nmPerDegLon;
        var distNm = Math.sqrt(dLatNm * dLatNm + dLonNm * dLonNm);
        if (distNm > rangeNm * 1.02) return null;
        var brg = Math.atan2(dLonNm, dLatNm); // atan2(east, north) = bearing from north
        if (brg < 0) brg += Math.PI * 2;
        return {
            nx:     dLonNm / rangeNm,
            ny:     dLatNm / rangeNm,
            brg:    brg,
            distNm: distNm,
        };
    }

    /* Build typed aircraft array from raw search rows. */
    function buildAircraft(rows, cLat, cLon, rangeNm) {
        var out = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var lat = num(r.lat);
            var lon = num(r.lon);
            if (lat === null || lon === null) continue;
            var p = project(lat, lon, cLat, cLon, rangeNm);
            if (!p) continue;
            out.push({
                id:       String(r.hex || r.callsign || (lat + ',' + lon)),
                callsign: String(r.callsign || '').trim() || null,
                altitude: num(r.altitude_ft),
                heading:  num(r.heading),
                speed:    num(r.speed_kts),
                nx: p.nx, ny: p.ny, brg: p.brg, distNm: p.distNm,
            });
        }
        return out;
    }

    /* ---- Canvas drawing ---- */

    /*
     * Draw one frame.
     * sweepBrg  bearing of sweep arm tip in radians (0=N, CW).
     * litMap    {id -> timestamp_ms} — when each blip was last hit by the sweep.
     */
    function drawFrame(ctx, W, H, aircraft, opts, palette, litMap, sweepBrg) {
        var cx = W / 2;
        var cy = H / 2;
        var radius = Math.min(W, H) / 2 * 0.87;
        var sweepS = Math.max(0.5, opts.sweepSeconds);
        var now = Date.now();

        ctx.clearRect(0, 0, W, H);

        /* Background disc */
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.bg;
        ctx.fill();

        /*
         * Sweep trail — multiple arc sectors from (sweepBrg − trailWidth) to sweepBrg.
         * Canvas arc angle 0 = East (+X); bearing 0 = North (−Y on canvas).
         * Conversion: canvasAngle = bearing − π/2
         */
        var trailWidth = Math.PI * 0.38; // ~68° trail
        var steps = 30;
        for (var s = 0; s < steps; s++) {
            var a0 = (sweepBrg - trailWidth * (1 - s / steps)) - Math.PI / 2;
            var a1 = (sweepBrg - trailWidth * (1 - (s + 1) / steps)) - Math.PI / 2;
            var alpha = ((s + 1) / steps) * 0.42;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, a0, a1);
            ctx.closePath();
            ctx.fillStyle = 'rgba(' + palette.sweepRGB + ',' + alpha + ')';
            ctx.fill();
        }

        /* Range rings (25 / 50 / 75 / 100 %) */
        [0.25, 0.5, 0.75, 1.0].forEach(function (f) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
            ctx.strokeStyle = f === 1.0 ? palette.ringOuter : palette.ring;
            ctx.lineWidth   = f === 1.0 ? 1.5 : 1;
            ctx.stroke();
        });

        /* Crosshair */
        ctx.strokeStyle = palette.ring;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        /* Cardinals */
        ctx.fillStyle   = palette.cardinal;
        ctx.textBaseline = 'middle';
        ctx.font        = 'bold 11px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText('N', cx,           cy - radius + 8);
        ctx.fillText('S', cx,           cy + radius - 8);
        ctx.textAlign = 'right';
        ctx.fillText('E', cx + radius - 5, cy);
        ctx.textAlign = 'left';
        ctx.fillText('W', cx - radius + 5, cy);

        /* Range labels on rings */
        ctx.fillStyle = 'rgba(' + palette.sweepRGB + ',0.35)';
        ctx.font      = '9px monospace';
        ctx.textAlign = 'left';
        [0.25, 0.5, 0.75].forEach(function (f) {
            ctx.fillText(
                Math.round(opts.rangeNm * f) + 'nm',
                cx + radius * f + 3,
                cy - 3
            );
        });

        /* Centre dot + home label */
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = palette.home;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,212,170,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (opts.homeLabel) {
            ctx.fillStyle   = palette.home;
            ctx.font        = '10px monospace';
            ctx.textAlign   = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(opts.homeLabel, cx + 12, cy);
        }

        /* Aircraft blips */
        for (var i = 0; i < aircraft.length; i++) {
            var ac   = aircraft[i];
            /* Canvas pixel position: east=+x, north=up=-y */
            var px   = cx + ac.nx * radius;
            var py   = cy - ac.ny * radius;

            var litAt   = litMap[ac.id] || 0;
            var ageSec  = litAt ? (now - litAt) / 1000 : Infinity;
            /* Fade from 1.0 (just lit) to 0.12 (never lit / full cycle ago) */
            var fade    = isFinite(ageSec)
                ? Math.max(0.12, 1 - ageSec / sweepS)
                : 0.12;
            var rgba    = 'rgba(' + palette.sweepRGB + ',' + fade + ')';

            /* Heading velocity vector (2-minute projection, capped at 35px) */
            if (opts.showHeadingVector && ac.heading !== null && ac.speed !== null && ac.speed > 10) {
                var vecNm  = ac.speed * (2 / 60);
                var vecPx  = Math.min((vecNm / opts.rangeNm) * radius, 35);
                /* Bearing 0=N → canvas angle 0=E: subtract π/2 */
                var hCvs   = ac.heading * Math.PI / 180 - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + Math.cos(hCvs) * vecPx, py + Math.sin(hCvs) * vecPx);
                ctx.strokeStyle = rgba;
                ctx.lineWidth   = 1;
                ctx.stroke();
            }

            /* Dot with phosphor glow */
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle   = rgba;
            ctx.shadowColor = 'rgba(' + palette.sweepRGB + ',' + (fade * 0.65) + ')';
            ctx.shadowBlur  = Math.round(fade * 10);
            ctx.fill();
            ctx.shadowBlur  = 0;

            /* Labels */
            if (opts.showLabels && (ac.callsign || (opts.showAltitude && ac.altitude !== null))) {
                ctx.fillStyle    = rgba;
                ctx.textAlign    = 'left';
                ctx.textBaseline = 'alphabetic';
                var lx = px + 7;
                var ly = py - 2;
                if (ac.callsign) {
                    ctx.font = 'bold 10px monospace';
                    ctx.fillText(ac.callsign, lx, ly);
                    ly += 11;
                }
                if (opts.showAltitude && ac.altitude !== null) {
                    ctx.font = '9px monospace';
                    ctx.fillText(Math.round(ac.altitude / 100) + 'FL', lx, ly);
                }
            }
        }
    }

    /* ---- Boot ---- */

    function bootWhenReady() {
        var api = globalThis.DashboardExtensionAPI;
        if (!api) { setTimeout(bootWhenReady, 25); return; }
        var root = document.getElementById('root');
        if (!root) { setTimeout(bootWhenReady, 25); return; }

        /*
         * Strip browser-default margins so the canvas fills the iframe edge-to-edge.
         * Use position:absolute/inset:0 rather than width/height:100% to avoid the
         * "height:100% requires explicit parent height" chain that breaks in Studio iframes.
         */
        document.documentElement.style.cssText = 'width:100%;height:100%;margin:0;padding:0;overflow:hidden;';
        document.body.style.cssText            = 'width:100%;height:100%;margin:0;padding:0;overflow:hidden;box-sizing:border-box;';
        root.style.cssText = 'position:absolute;inset:0;overflow:hidden;';

        var canvas = document.createElement('canvas');
        /* Absolute positioning keeps the canvas flush with the iframe viewport */
        canvas.style.cssText = 'position:absolute;top:0;left:0;';
        root.appendChild(canvas);

        var state = { options: {}, dataSources: null };

        /* litMap: aircraft id → ms timestamp when sweep last crossed its bearing */
        var litMap   = {};
        var prevBrg  = 0;
        var lastW    = 0;
        var lastH    = 0;
        var dpr      = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× to protect GPU on Pi

        /* Force a resize check on next frame whenever the iframe is resized */
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function () { lastW = 0; lastH = 0; }).observe(document.body);
        }

        function resolveOpts() {
            var raw = state.options || {};
            var o   = raw.options || raw;
            var cLat   = num(o.centerLat);   if (cLat   === null)        cLat   = DEFAULTS.centerLat;
            var cLon   = num(o.centerLon);   if (cLon   === null)        cLon   = DEFAULTS.centerLon;
            var range  = num(o.rangeNm);     if (range  === null || range  < 1) range  = DEFAULTS.rangeNm;
            var sweep  = num(o.sweepSeconds);if (sweep  === null || sweep  < 0.5) sweep = DEFAULTS.sweepSeconds;
            return {
                centerLat:         cLat,
                centerLon:         cLon,
                rangeNm:           range,
                sweepSeconds:      sweep,
                showLabels:        o.showLabels        !== undefined ? !!o.showLabels        : DEFAULTS.showLabels,
                showAltitude:      o.showAltitude      !== undefined ? !!o.showAltitude      : DEFAULTS.showAltitude,
                showHeadingVector: o.showHeadingVector !== undefined ? !!o.showHeadingVector : DEFAULTS.showHeadingVector,
                colorScheme:       o.colorScheme       || DEFAULTS.colorScheme,
                homeLabel:         o.homeLabel         !== undefined ? o.homeLabel           : DEFAULTS.homeLabel,
            };
        }

        function frame() {
            var opts    = resolveOpts();
            var palette = PALETTES[opts.colorScheme] || PALETTES.green;

            root.style.background = palette.bg;

            /*
             * Use window.innerWidth/Height — these are the iframe's actual viewport
             * dimensions and update correctly when Studio resizes the panel.
             * root.clientWidth/Height can return stale or 0 values inside Studio iframes.
             */
            var cssW = window.innerWidth  || 400;
            var cssH = window.innerHeight || 400;
            if (cssW !== lastW || cssH !== lastH) {
                lastW = cssW;
                lastH = cssH;
                canvas.width  = Math.round(cssW * dpr);
                canvas.height = Math.round(cssH * dpr);
                canvas.style.width  = cssW + 'px';
                canvas.style.height = cssH + 'px';
                /* canvas.width assignment resets the context transform — reapply scale */
                var ctx2 = canvas.getContext('2d');
                if (ctx2 && dpr !== 1) ctx2.scale(dpr, dpr);
            }

            /* Sweep bearing from wall clock — syncs across browser refreshes */
            var sweepMs  = Math.max(0.5, opts.sweepSeconds) * 1000;
            var brg      = ((Date.now() % sweepMs) / sweepMs) * Math.PI * 2;

            /* Build aircraft list for this frame */
            var rows     = parseRows(state.dataSources);
            var aircraft = buildAircraft(rows, opts.centerLat, opts.centerLon, opts.rangeNm);

            /* Detect which blips the sweep passed since the last frame */
            var wrapped = brg < prevBrg;
            for (var i = 0; i < aircraft.length; i++) {
                var b = aircraft[i].brg;
                var passed = wrapped
                    ? (b >= prevBrg || b <= brg)
                    : (b > prevBrg && b <= brg);
                if (passed) litMap[aircraft[i].id] = Date.now();
            }
            prevBrg = brg;

            /* Prune stale entries from litMap (aircraft that left the scope) */
            if (aircraft.length === 0 && Object.keys(litMap).length > 0) {
                litMap = {};
            }

            var ctx = canvas.getContext('2d');
            if (ctx) drawFrame(ctx, cssW, cssH, aircraft, opts, palette, litMap, brg);

            requestAnimationFrame(frame);
        }

        /* Subscribe to Studio events */
        if (typeof api.addOptionsListener === 'function') {
            api.addOptionsListener(function (n) { state.options = n || {}; });
        }
        if (typeof api.addDataSourcesListener === 'function') {
            api.addDataSourcesListener(function (n) { state.dataSources = n || null; });
        }
        /* Initial pull in case events fired before subscription */
        try {
            if (typeof api.getOptions    === 'function') state.options     = api.getOptions()     || {};
            if (typeof api.getDataSources === 'function') state.dataSources = api.getDataSources() || null;
        } catch (e) {}

        requestAnimationFrame(frame);
    }

    bootWhenReady();
})();
