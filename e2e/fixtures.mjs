/*
 * Fixture dashboards for the render suite.
 *
 * One source of truth, used twice:
 *   - e2e/seed-splunk.mjs turns each entry into a Dashboard Studio view in the
 *     `dashpub_e2e` Splunk app (plus the saved search some panels reference).
 *   - template/tests/render.spec.ts reads the same entries to know which panels
 *     must be on the page and which values they must show.
 *
 * Every search is `makeresults` based, so the data is identical on any Splunk
 * and the expected text is exact. Expected values are deliberately odd numbers
 * and `e2e-` prefixed strings: nothing else on the page can produce them, so a
 * panel that renders its frame but not its data cannot pass.
 *
 * Adding a visualization type: add a panel here. The suite fails when the
 * Splunk preset registers a type that no panel covers (see COVERAGE_EXEMPT).
 */

export const APP = 'dashpub_e2e';
export const SAVED_SEARCH = {
    name: 'e2e_saved_report',
    search: '| makeresults | eval saved_value=9191 | table saved_value',
};

// 1x1 red PNG and a two-region SVG, inlined so no asset download is involved.
const PNG_1PX =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const REGION_SVG =
    'data:image/svg+xml;base64,' +
    Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">' +
            '<rect id="region_west" x="0" y="0" width="100" height="100"/>' +
            '<rect id="region_east" x="100" y="0" width="100" height="100"/>' +
            '</svg>'
    ).toString('base64');

const rows = (n) => `| makeresults count=${n} | streamstats count as n`;

export const DASHBOARDS = [
    {
        id: 'e2e_values',
        title: 'E2E Values',
        layout: 'grid',
        panels: [
            {
                id: 'viz_singlevalue',
                type: 'splunk.singlevalue',
                query: '| makeresults | eval value=4242 | table value',
                expectText: ['4,242'],
            },
            {
                id: 'viz_singlevalueicon',
                type: 'splunk.singlevalueicon',
                query: '| makeresults | eval value=1717 | table value',
                expectText: ['1,717'],
            },
            {
                id: 'viz_singlevalueradial',
                type: 'splunk.singlevalueradial',
                query: '| makeresults | eval value=73 | table value',
                expectText: ['73'],
            },
            {
                id: 'viz_markergauge',
                type: 'splunk.markergauge',
                query: '| makeresults | eval value=58 | table value',
                expectText: ['58'],
            },
            {
                id: 'viz_fillergauge',
                type: 'splunk.fillergauge',
                query: '| makeresults | eval value=36 | table value',
                expectText: ['36'],
            },
            {
                id: 'viz_table',
                type: 'splunk.table',
                query:
                    `${rows(3)} | eval host="e2e-host-".n, ` +
                    'status=case(n=1,"e2e-ok",n=2,"e2e-warn",n=3,"e2e-crit"), latency=n*111 ' +
                    '| table host status latency',
                expectText: ['e2e-host-1', 'e2e-host-3', 'e2e-crit', '333'],
            },
            {
                // Two-hop ds.chain: 50+75+100 over the base search. Resolving only
                // one hop would run the last post-process on its own and show nothing.
                id: 'viz_chain',
                type: 'splunk.singlevalue',
                dataSource: 'ds_chain_total',
                expectText: ['225'],
            },
            {
                id: 'viz_savedsearch',
                type: 'splunk.singlevalue',
                dataSource: 'ds_saved',
                expectText: ['9,191'],
            },
            {
                id: 'viz_events',
                type: 'splunk.events',
                query: `${rows(3)} | eval _raw="e2e raw event number ".n | table _time _raw`,
                expectText: ['e2e raw event number 2'],
            },
            {
                id: 'viz_markdown',
                type: 'splunk.markdown',
                options: { markdown: '## E2E markdown heading\n\nBody text with **e2e-bold** in it.' },
                expectText: ['E2E markdown heading', 'e2e-bold'],
            },
        ],
        extraDataSources: {
            ds_chain_base: {
                name: 'ds_chain_base',
                type: 'ds.search',
                options: { query: `${rows(4)} | eval team="e2e-team-".n, score=n*25 | table team score` },
            },
            ds_chain_filtered: {
                name: 'ds_chain_filtered',
                type: 'ds.chain',
                options: { extend: 'ds_chain_base', query: '| where score>=50' },
            },
            ds_chain_total: {
                name: 'ds_chain_total',
                type: 'ds.chain',
                options: { extend: 'ds_chain_filtered', query: '| stats sum(score) as chained_total' },
            },
            ds_saved: {
                name: 'ds_saved',
                type: 'ds.savedSearch',
                options: { ref: SAVED_SEARCH.name },
            },
        },
    },
    {
        id: 'e2e_charts',
        title: 'E2E Charts',
        layout: 'grid',
        panels: [
            {
                id: 'viz_line',
                type: 'splunk.line',
                query:
                    `${rows(6)} | eval _time=relative_time(now(),"@h")-n*3600, e2e_line_a=n*10, e2e_line_b=n*7 ` +
                    '| table _time e2e_line_a e2e_line_b',
                // Legend below the chart: beside it, the series names are truncated.
                options: { legendDisplay: 'bottom' },
                expectText: ['e2e_line_a', 'e2e_line_b'],
            },
            {
                id: 'viz_area',
                type: 'splunk.area',
                query:
                    `${rows(6)} | eval _time=relative_time(now(),"@h")-n*3600, e2e_area_a=n*3, e2e_area_b=n*9 ` +
                    '| table _time e2e_area_a e2e_area_b',
                // Legend below the chart: beside it, the series names are truncated.
                options: { legendDisplay: 'bottom' },
                expectText: ['e2e_area_a', 'e2e_area_b'],
            },
            {
                id: 'viz_column',
                type: 'splunk.column',
                query: `${rows(4)} | eval category="e2e-col-".n, e2e_col_count=n*11 | table category e2e_col_count`,
                expectText: ['e2e-col-1', 'e2e-col-4'],
            },
            {
                id: 'viz_bar',
                type: 'splunk.bar',
                query: `${rows(4)} | eval category="e2e-bar-".n, e2e_bar_count=n*13 | table category e2e_bar_count`,
                expectText: ['e2e-bar-1', 'e2e-bar-4'],
            },
            {
                id: 'viz_pie',
                type: 'splunk.pie',
                query: `${rows(3)} | eval slice="e2e-slice-".n, share=n*20 | table slice share`,
                expectText: ['e2e-slice-1', 'e2e-slice-3'],
            },
            {
                id: 'viz_scatter',
                type: 'splunk.scatter',
                query: `${rows(5)} | eval e2e_scatter_x=n*2, e2e_scatter_y=n*n | table e2e_scatter_x e2e_scatter_y`,
                expectText: ['e2e_scatter_x', 'e2e_scatter_y'],
            },
            {
                id: 'viz_bubble',
                type: 'splunk.bubble',
                query:
                    `${rows(5)} | eval e2e_bubble_x=n*3, e2e_bubble_y=n*5, e2e_bubble_size=n*n ` +
                    '| table e2e_bubble_x e2e_bubble_y e2e_bubble_size',
                expectText: ['e2e_bubble_x', 'e2e_bubble_y'],
            },
            {
                id: 'viz_punchcard',
                type: 'splunk.punchcard',
                query:
                    `${rows(6)} | eval day="e2e-day-".(n%3), slot="e2e-slot-".(n%2), hits=n*4 ` +
                    '| table day slot hits',
                expectText: ['e2e-day-1', 'e2e-slot-0'],
            },
        ],
    },
    {
        id: 'e2e_flow',
        title: 'E2E Flow',
        layout: 'grid',
        panels: [
            {
                id: 'viz_sankey',
                type: 'splunk.sankey',
                query:
                    `${rows(3)} | eval source="e2e-src-".n, target="e2e-dst-".(n%2), value=n*10 ` +
                    '| table source target value',
                expectText: ['e2e-src-1', 'e2e-dst-0'],
            },
            {
                id: 'viz_linkgraph',
                type: 'splunk.linkgraph',
                query:
                    `${rows(3)} | eval tier_one="e2e-a-".n, tier_two="e2e-b-".(n%2), tier_three="e2e-c-0" ` +
                    '| table tier_one tier_two tier_three',
                expectText: ['e2e-a-1', 'e2e-c-0'],
            },
            {
                id: 'viz_parallel',
                type: 'splunk.parallelcoordinates',
                query:
                    `${rows(5)} | eval e2e_dim_one=n, e2e_dim_two=n*n, e2e_dim_three=10-n ` +
                    '| table e2e_dim_one e2e_dim_two e2e_dim_three',
                expectText: ['e2e_dim_one', 'e2e_dim_three'],
            },
            {
                id: 'viz_timeline',
                type: 'splunk.timeline',
                query:
                    `${rows(4)} | eval _time=relative_time(now(),"@h")-n*3600, lane="e2e-lane-".(n%2), duration=1800 ` +
                    '| table _time lane duration',
                expectText: ['e2e-lane-0', 'e2e-lane-1'],
            },
            {
                id: 'viz_networkgraph',
                type: 'splunk.networkGraph',
                query: `${rows(3)} | eval from="e2e-node-".n, to="e2e-node-".(n+1) | table from to`,
                expectText: ['e2e-node-1', 'e2e-node-3'],
            },
        ],
    },
    {
        id: 'e2e_canvas',
        title: 'E2E Canvas',
        layout: 'tabs',
        tabs: [
            {
                label: 'E2E Shapes',
                panels: [
                    {
                        id: 'viz_rectangle',
                        type: 'splunk.rectangle',
                        options: { fillColor: '#3366cc' },
                        expectSelector: 'rect',
                    },
                    {
                        id: 'viz_ellipse',
                        type: 'splunk.ellipse',
                        options: { fillColor: '#cc6633' },
                        expectSelector: 'ellipse',
                    },
                    {
                        id: 'viz_image',
                        type: 'splunk.image',
                        options: { src: PNG_1PX },
                        expectSelector: 'img',
                    },
                    {
                        id: 'viz_shape_label',
                        type: 'splunk.markdown',
                        options: { markdown: 'e2e-shapes-tab-label' },
                        expectText: ['e2e-shapes-tab-label'],
                    },
                    {
                        id: 'viz_tab_value',
                        type: 'splunk.singlevalue',
                        query: '| makeresults | eval value=6363 | table value',
                        expectText: ['6,363'],
                    },
                ],
                lines: [{ id: 'viz_connector', from: { x: 40, y: 560 }, to: { x: 640, y: 560 } }],
            },
            {
                label: 'E2E Geo',
                panels: [
                    {
                        id: 'viz_choropleth',
                        type: 'splunk.choropleth.svg',
                        query:
                            `${rows(2)} | eval region=if(n=1,"region_west","region_east"), load=n*40 ` +
                            '| table region load',
                        options: { svg: REGION_SVG },
                        expectSelector: '[data-test="svgChoroplethDynamic"]',
                    },
                    {
                        id: 'viz_map',
                        type: 'splunk.map',
                        query: `${rows(3)} | eval lat=53.8+n/10, lon=-1.5-n/10, e2e_map_value=n*5 | table lat lon e2e_map_value`,
                        options: {
                            center: [53.8, -1.5],
                            zoom: 6,
                            layers: [
                                {
                                    type: 'marker',
                                    latitude: "> primary | seriesByName('lat')",
                                    longitude: "> primary | seriesByName('lon')",
                                },
                            ],
                        },
                        // One DOM marker per row: the map engine started AND the data reached it.
                        expectSelector: '.maplibregl-marker',
                        expectCount: 3,
                    },
                    {
                        id: 'viz_geo_value',
                        type: 'splunk.singlevalue',
                        query: '| makeresults | eval value=8484 | table value',
                        expectText: ['8,484'],
                    },
                ],
            },
        ],
    },
];

// Types the Splunk preset registers that have no fixture panel, each with the
// reason. Keep this short: an entry here is a type nobody is checking.
export const COVERAGE_EXEMPT = {};

/* ------------------------------------------------------------------------- */
/* Definition builder                                                         */
/* ------------------------------------------------------------------------- */

const COLS = 3;
const CELL_W = 400;
const CELL_H = 300;

function panelDataSourceId(panel) {
    if (panel.dataSource) return panel.dataSource;
    if (panel.query) return `ds_${panel.id.replace(/^viz_/, '')}`;
    return null;
}

function collect(panels, visualizations, dataSources) {
    for (const p of panels) {
        const dsId = panelDataSourceId(p);
        visualizations[p.id] = {
            type: p.type,
            title: p.id,
            options: p.options || {},
            ...(dsId ? { dataSources: { primary: dsId } } : {}),
        };
        if (p.query) {
            dataSources[dsId] = { type: 'ds.search', name: dsId, options: { query: p.query } };
        }
    }
}

const blocks = (panels) =>
    panels.map((p, i) => ({
        item: p.id,
        type: 'block',
        position: {
            x: (i % COLS) * CELL_W,
            y: Math.floor(i / COLS) * CELL_H,
            w: CELL_W,
            h: CELL_H,
        },
    }));

export function buildDefinition(dash) {
    const visualizations = {};
    const dataSources = { ...(dash.extraDataSources || {}) };
    let layout;

    if (dash.layout === 'tabs') {
        const layoutDefinitions = {};
        const items = [];
        dash.tabs.forEach((tab, i) => {
            const layoutId = `layout_${i + 1}`;
            collect(tab.panels, visualizations, dataSources);
            const structure = blocks(tab.panels);
            for (const line of tab.lines || []) {
                visualizations[line.id] = { type: 'abslayout.line', options: {} };
                structure.push({ item: line.id, type: 'line', position: { from: line.from, to: line.to } });
            }
            layoutDefinitions[layoutId] = {
                type: 'absolute',
                structure,
                options: { width: COLS * CELL_W, height: 700, display: 'auto' },
            };
            items.push({ layoutId, label: tab.label });
        });
        layout = { options: {}, globalInputs: [], tabs: { items }, layoutDefinitions };
    } else {
        collect(dash.panels, visualizations, dataSources);
        layout = {
            type: dash.layout,
            options: { width: COLS * CELL_W },
            structure: blocks(dash.panels),
            globalInputs: [],
        };
    }

    return {
        title: dash.title,
        description: 'dashpub render-suite fixture. Generated by e2e/fixtures.mjs; do not edit in Splunk.',
        visualizations,
        dataSources,
        defaults: {},
        inputs: {},
        layout,
    };
}

export function allPanels(dash) {
    if (dash.layout === 'tabs') {
        return dash.tabs.flatMap((tab) => [
            ...tab.panels.map((p) => ({ ...p, tab: tab.label })),
            ...(tab.lines || []).map((l) => ({ id: l.id, type: 'abslayout.line', tab: tab.label })),
        ]);
    }
    return dash.panels;
}

export function viewXml(dash) {
    const def = JSON.stringify(buildDefinition(dash), null, 2);
    if (def.includes(']]>')) throw new Error(`definition for ${dash.id} contains a CDATA terminator`);
    return (
        `<dashboard version="2" theme="light">\n  <label>${dash.title}</label>\n` +
        `  <definition><![CDATA[\n${def}\n  ]]></definition>\n</dashboard>\n`
    );
}
