/*
 * Digital Clock — Splunk Dashboard Studio studio_visualization
 *
 * A seven-segment LCD-style digital clock rendered on an HTML5 Canvas, with an
 * optional ghost (unlit) segment layer for the classic LCD look, a blinking
 * colon, 12/24-hour modes, timezone support and a phosphor glow. Runs via
 * requestAnimationFrame and stays in sync with the wall clock.
 *
 * Companion to the Realtime Clock (analog) viz in the same app.
 *
 * Options (all editable in the Studio Configuration panel via config.json):
 *   color         (string,  default '#00d4aa')  Lit segment / digit colour
 *   background    (string,  default '#050810')  Panel background
 *   timezone      (string,  default 'local')    'local', 'utc', or IANA name
 *   hour24        (boolean, default true)        24-hour vs 12-hour (AM/PM)
 *   showSeconds   (boolean, default true)        Show the seconds pair
 *   showDate      (boolean, default true)        Show the day/date line
 *   showGlow      (boolean, default true)        Phosphor glow on lit segments
 *   blinkColon    (boolean, default true)        Blink the colons each second
 *   ghostSegments (boolean, default true)        Show faint unlit segments (LCD)
 */
(function () {
    'use strict';

    var DEFAULTS = {
        color:         '#00d4aa',
        background:    '#050810',
        timezone:      'local',
        hour24:        true,
        showSeconds:   true,
        showDate:      true,
        showGlow:      true,
        blinkColon:    true,
        ghostSegments: true,
    };

    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

    /* Which of the 7 segments (a,b,c,d,e,f,g) are lit for each digit 0-9. */
    var SEGMENTS = {
        0: ['a','b','c','d','e','f'],
        1: ['b','c'],
        2: ['a','b','g','e','d'],
        3: ['a','b','g','c','d'],
        4: ['f','g','b','c'],
        5: ['a','f','g','c','d'],
        6: ['a','f','g','e','c','d'],
        7: ['a','b','c'],
        8: ['a','b','c','d','e','f','g'],
        9: ['a','b','c','d','f','g'],
    };

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function hexToRgba(hex, alpha) {
        if (!hex) return 'rgba(0,212,170,' + alpha + ')';
        var h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var r = parseInt(h.substring(0, 2), 16);
        var g = parseInt(h.substring(2, 4), 16);
        var b = parseInt(h.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(0,212,170,' + alpha + ')';
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    /*
     * Extract h/m/s/d/mo/yr/dow for the current moment in the given timezone.
     * Supports 'local', 'utc', and any IANA timezone name. Falls back to local.
     */
    function getTimeComponents(tz) {
        var now = new Date();
        var t = (tz || 'local').trim();
        if (t === '' || t.toLowerCase() === 'local') {
            return {
                h: now.getHours(), m: now.getMinutes(), s: now.getSeconds(),
                d: now.getDate(), mo: now.getMonth(), yr: now.getFullYear(),
                dow: now.getDay(), label: '',
            };
        }
        if (t.toLowerCase() === 'utc') {
            return {
                h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds(),
                d: now.getUTCDate(), mo: now.getUTCMonth(), yr: now.getUTCFullYear(),
                dow: now.getUTCDay(), label: 'UTC',
            };
        }
        try {
            var fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: t,
                year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
                hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
            });
            var parts = {};
            fmt.formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
            return {
                h: parseInt(parts.hour, 10) % 24,
                m: parseInt(parts.minute, 10),
                s: parseInt(parts.second, 10),
                d: parseInt(parts.day, 10), mo: parseInt(parts.month, 10) - 1,
                yr: parseInt(parts.year, 10),
                dow: Math.max(0, ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday)),
                label: t.split('/').pop().replace(/_/g, ' '),
            };
        } catch (e) {
            return getTimeComponents('local');
        }
    }

    /* ---- Seven-segment drawing ---- */

    /* Draw one segment as a rounded bar between two points. */
    function bar(ctx, x1, y1, x2, y2, thick) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = thick;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /*
     * Draw a single seven-segment digit in box (x, y, w, h).
     * litSegs is the array of lit segment ids; unlit segments are drawn faintly
     * when ghost is true.
     */
    function drawDigit(ctx, x, y, w, h, litSegs, color, ghost, glow) {
        var t   = Math.max(2, Math.min(w, h) * 0.13);
        var x0  = x + t / 2,  x1 = x + w - t / 2;
        var yT  = y + t / 2,  yM = y + h / 2,  yB = y + h - t / 2;
        var seg = {
            a: [x0, yT, x1, yT],
            b: [x1, yT, x1, yM],
            c: [x1, yM, x1, yB],
            d: [x0, yB, x1, yB],
            e: [x0, yM, x0, yB],
            f: [x0, yT, x0, yM],
            g: [x0, yM, x1, yM],
        };
        var on = {};
        litSegs.forEach(function (s) { on[s] = true; });

        Object.keys(seg).forEach(function (s) {
            var p = seg[s];
            if (on[s]) return; // lit ones drawn in a second pass (with glow)
            if (ghost) {
                ctx.strokeStyle = hexToRgba(color, 0.08);
                ctx.shadowBlur = 0;
                bar(ctx, p[0], p[1], p[2], p[3], t);
            }
        });
        ctx.strokeStyle = color;
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = t * 1.1; }
        litSegs.forEach(function (s) {
            var p = seg[s];
            bar(ctx, p[0], p[1], p[2], p[3], t);
        });
        ctx.shadowBlur = 0;
    }

    /* Draw the colon (two dots) between digit groups. */
    function drawColon(ctx, x, y, h, t, color, visible, glow) {
        var r  = t * 0.55;
        var cy1 = y + h * 0.34, cy2 = y + h * 0.66;
        ctx.fillStyle = visible ? color : hexToRgba(color, 0.08);
        if (glow && visible) { ctx.shadowColor = color; ctx.shadowBlur = t * 1.1; } else { ctx.shadowBlur = 0; }
        [cy1, cy2].forEach(function (cy) {
            ctx.beginPath();
            ctx.arc(x, cy, r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    /* ---- Boot ---- */

    function bootWhenReady() {
        var api = globalThis.DashboardExtensionAPI;
        if (!api) { setTimeout(bootWhenReady, 25); return; }
        var root = document.getElementById('root');
        if (!root) { setTimeout(bootWhenReady, 25); return; }

        document.documentElement.style.cssText = 'width:100%;height:100%;margin:0;padding:0;overflow:hidden;';
        document.body.style.cssText            = 'width:100%;height:100%;margin:0;padding:0;overflow:hidden;box-sizing:border-box;';
        root.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;font-family:"SF Mono","Roboto Mono",Menlo,Consolas,monospace;';

        var canvas = document.createElement('canvas');
        canvas.style.cssText = 'flex:0 0 auto;display:block;';
        root.appendChild(canvas);

        var dateDiv = document.createElement('div');
        root.appendChild(dateDiv);

        var state  = { options: {} };
        var dpr    = Math.min(window.devicePixelRatio || 1, 2);
        var lastW  = 0, lastH = 0;

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function () { lastW = 0; lastH = 0; }).observe(document.body);
        }

        function resolveOpts() {
            var raw = state.options || {};
            var o   = raw.options || raw;
            return {
                color:         o.color      || DEFAULTS.color,
                background:    o.background || DEFAULTS.background,
                timezone:      o.timezone   || DEFAULTS.timezone,
                hour24:        o.hour24        !== undefined ? !!o.hour24        : DEFAULTS.hour24,
                showSeconds:   o.showSeconds   !== undefined ? !!o.showSeconds   : DEFAULTS.showSeconds,
                showDate:      o.showDate      !== undefined ? !!o.showDate      : DEFAULTS.showDate,
                showGlow:      o.showGlow      !== undefined ? !!o.showGlow      : DEFAULTS.showGlow,
                blinkColon:    o.blinkColon    !== undefined ? !!o.blinkColon    : DEFAULTS.blinkColon,
                ghostSegments: o.ghostSegments !== undefined ? !!o.ghostSegments : DEFAULTS.ghostSegments,
            };
        }

        function tick() {
            var cfg = resolveOpts();
            var tc  = getTimeComponents(cfg.timezone);

            var cssW = window.innerWidth  || 400;
            var cssH = window.innerHeight || 200;
            root.style.background = cfg.background;

            /* Build the digit string */
            var hh = tc.h, ampm = '';
            if (!cfg.hour24) {
                ampm = hh >= 12 ? 'PM' : 'AM';
                hh = hh % 12; if (hh === 0) hh = 12;
            }
            var groups = [pad(hh), pad(tc.m)];
            if (cfg.showSeconds) groups.push(pad(tc.s));

            var dateH = cfg.showDate ? Math.max(14, Math.round(cssH * 0.12)) : 0;
            var availW = cssW * 0.92;
            var availH = (cssH - dateH) * 0.78;

            /* Geometry: digits + colons. digitW : digitH ~ 0.6, colon ~ 0.35 digitW */
            var nDigits = groups.length * 2;
            var nColons = groups.length - 1;
            var unit    = availW / (nDigits * 0.62 + nColons * 0.4 + (ampm ? 0.7 : 0));
            var digitH  = Math.min(availH, unit * 1.0);
            var digitW  = digitH * 0.62;
            var colonW  = digitW * 0.55;
            var gap     = digitW * 0.12;

            var totalW = nDigits * digitW + (nDigits - groups.length) * gap +
                         nColons * colonW + (ampm ? digitW * 0.8 : 0);
            /* recompute digitH if width-bound */
            if (totalW > availW) {
                var k = availW / totalW;
                digitW *= k; digitH *= k; colonW *= k; gap *= k; totalW = availW;
            }

            if (cssW !== lastW || cssH !== lastH) {
                lastW = cssW; lastH = cssH;
                canvas.width  = Math.round(cssW * dpr);
                canvas.height = Math.round((cssH - dateH) * dpr);
                canvas.style.width  = cssW + 'px';
                canvas.style.height = (cssH - dateH) + 'px';
            }

            var ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cssW, cssH - dateH);

            var startX = (cssW - totalW) / 2;
            var startY = (cssH - dateH - digitH) / 2;
            var x = startX;

            groups.forEach(function (grp, gi) {
                for (var di = 0; di < grp.length; di++) {
                    var n = parseInt(grp[di], 10);
                    drawDigit(ctx, x, startY, digitW, digitH, SEGMENTS[n], cfg.color, cfg.ghostSegments, cfg.showGlow);
                    x += digitW + (di === 0 ? gap : 0);
                }
                if (gi < groups.length - 1) {
                    var blink = cfg.blinkColon ? (tc.s % 2 === 0) : true;
                    drawColon(ctx, x + colonW / 2, startY, digitH, Math.max(2, Math.min(digitW, digitH) * 0.13), cfg.color, blink, cfg.showGlow);
                    x += colonW;
                }
            });

            if (ampm) {
                ctx.fillStyle = cfg.color;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = '600 ' + Math.round(digitH * 0.22) + 'px "SF Mono","Roboto Mono",monospace';
                if (cfg.showGlow) { ctx.shadowColor = cfg.color; ctx.shadowBlur = 6; }
                ctx.fillText(ampm, x + digitW * 0.12, startY + digitH * 0.05);
                ctx.shadowBlur = 0;
            }

            if (cfg.showDate) {
                var suffix = tc.label ? '  ·  ' + tc.label : '';
                dateDiv.textContent = DAYS[tc.dow] + ' ' + pad(tc.d) + ' ' + MONTHS[tc.mo] + ' ' + tc.yr + suffix;
                dateDiv.style.cssText = 'flex:0 0 auto;margin-top:4px;font-size:' + Math.max(10, Math.round(dateH * 0.42)) +
                    'px;font-weight:600;letter-spacing:2px;color:' + cfg.color + ';opacity:0.8;' +
                    (cfg.showGlow ? 'text-shadow:0 0 8px ' + cfg.color + ';' : '');
            } else {
                dateDiv.textContent = '';
            }

            requestAnimationFrame(tick);
        }

        if (typeof api.addOptionsListener === 'function') {
            api.addOptionsListener(function (n) { state.options = n || {}; });
        }
        try {
            if (typeof api.getOptions === 'function') state.options = api.getOptions() || {};
        } catch (e) {}

        requestAnimationFrame(tick);
    }

    bootWhenReady();
})();
