#!/usr/bin/env node

/*
Copyright 2020 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as prompts from './prompts.js';
import * as splunkd from './splunkd.js';
import fs from 'fs-extra';
import path from 'path';
import { generate } from './builddash.js';
import chalk from 'chalk';
import { updatePackageJson } from './pkgjson.js';
import { writeDotenv } from './env.js';
import { initVercelProject } from './vercel.js';
import dotenv from 'dotenv';

dotenv.config();

const toFolderName = (projectName) => projectName.toLowerCase().replace(/[\W_]+/g, '-');

const postInitInstructions = ({ folderName }) => chalk`

{green Project successfully generated in {bold ./${folderName}}}

Next steps:

{yellow $} cd ./${folderName}

{gray # Start developing}

{yellow $} npm run dev:full

{gray Open a browser at http://localhost:3000}
`;

// Resolve the directory of mounted Splunk app folders to sideload custom
// visualizations from, or null. DASHPUB_CUSTOM_VIZ_PATH points at a directory
// containing one or more *extracted Splunk app folders* (not archives), each
// of which may ship one or more Dashboard Studio (10.x) custom visualizations.
async function customVizSourceDir() {
    const dirPath = process.env.DASHPUB_CUSTOM_VIZ_PATH;
    if (!dirPath) {
        console.debug("DASHPUB_CUSTOM_VIZ_PATH is not set — no custom viz to sideload.");
        return null;
    }
    if (!(await fs.pathExists(dirPath))) {
        console.warn(`DASHPUB_CUSTOM_VIZ_PATH is set but does not exist: ${dirPath}`);
        return null;
    }
    return dirPath;
}

// Parse a Splunk app's app id from app.manifest (info.id.name), falling back to
// the app folder name. This is the "<app-id>" half of the Studio viz type.
async function readAppId(appDir) {
    const manifestPath = path.join(appDir, 'app.manifest');
    if (await fs.pathExists(manifestPath)) {
        try {
            const manifest = await fs.readJson(manifestPath);
            const name = manifest && manifest.info && manifest.info.id && manifest.info.id.name;
            if (name) return name;
        } catch (e) {
            console.warn(`Could not parse ${manifestPath}: ${e.message}`);
        }
    }
    return path.basename(appDir);
}

// Find the viz names in an app that are registered as Dashboard Studio custom
// visualizations (framework_type = studio_visualization) in visualizations.conf.
async function studioVizNames(appDir) {
    const confPath = path.join(appDir, 'default', 'visualizations.conf');
    if (!(await fs.pathExists(confPath))) return [];
    const conf = await fs.readFile(confPath, 'utf8');
    const names = [];
    let current = null;
    let isStudio = false;
    const flush = () => { if (current && isStudio) names.push(current); };
    for (const raw of conf.split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith('[') && line.endsWith(']')) {
            flush();
            current = line.slice(1, -1).split('.')[0]; // stanza head, ignore [viz.option] sub-stanzas
            isStudio = false;
        } else if (/^framework_type\s*=\s*studio_visualization\s*$/.test(line)) {
            isStudio = true;
        }
    }
    flush();
    return [...new Set(names)];
}

// Ingest every Dashboard Studio custom viz from the mounted Splunk app folders:
//   - copy its static bundle (visualization.js/.css + config.json) into
//     public/custom_viz/<type>/  (served by the dashpub server at /custom_viz/…)
//   - emit a one-line shim into src/custom_components/<type>/index.jsx that
//     points the generic StudioExtensionHost at that type.
// The shim is auto-registered at build time by preset.js (import.meta.glob).
// Nothing here requires the user to write or edit any code.
async function ingestCustomVizApps(srcFolder, destFolder) {
    const publicDest = path.join(destFolder, 'public', 'custom_viz');
    const compDest = path.join(destFolder, 'src', 'custom_components');
    await fs.ensureDir(publicDest);
    await fs.ensureDir(compDest);

    const entries = await fs.readdir(srcFolder, { withFileTypes: true });
    const appDirs = entries.filter(e => e.isDirectory()).map(e => path.join(srcFolder, e.name));

    let count = 0;
    for (const appDir of appDirs) {
        const appId = await readAppId(appDir);
        const vizNames = await studioVizNames(appDir);
        if (vizNames.length === 0) continue;

        for (const vizName of vizNames) {
            const vizSrc = path.join(appDir, 'appserver', 'static', 'visualizations', vizName);
            const bundle = path.join(vizSrc, 'visualization.js');
            if (!(await fs.pathExists(bundle))) {
                console.warn(`  ! ${appId}.${vizName}: no visualization.js at ${vizSrc} — skipping`);
                continue;
            }
            const type = `${appId}.${vizName}`;

            // 1. Static assets -> public/custom_viz/<type>/
            const assetDest = path.join(publicDest, type);
            await fs.ensureDir(assetDest);
            for (const file of ['visualization.js', 'visualization.css', 'config.json']) {
                const from = path.join(vizSrc, file);
                if (await fs.pathExists(from)) await fs.copy(from, path.join(assetDest, file));
            }

            // 2. Detect the bundle flavour and pick the matching host:
            //    - AMD module (define([...], factory) exporting a React
            //      definition)  -> StudioAmdHost (renders inline, shared React)
            //    - IIFE talking to globalThis.DashboardExtensionAPI
            //                     -> StudioExtensionHost (sandboxed iframe)
            const bundleSrc = await fs.readFile(bundle, 'utf8');
            const isAmd = /(^|[^\w.])define\s*\(/.test(bundleSrc) && /\.amd\b/.test(bundleSrc)
                || /(^|[^\w.])define\s*\(\s*\[/.test(bundleSrc);
            const host = isAmd ? 'StudioAmdHost' : 'StudioExtensionHost';
            const hostNote = isAmd
                ? 'AMD module rendered inline (official Studio framework, shared React)'
                : 'iframe + DashboardExtensionAPI';

            // 3. Host shim -> src/custom_components/<type>/index.jsx
            const shimDir = path.join(compDest, type);
            await fs.ensureDir(shimDir);
            const shim =
                `// Auto-generated by 'dashpub init' from the mounted Splunk app '${appId}'.\n` +
                `// Hosts the packaged Dashboard Studio custom viz '${type}'\n` +
                `// via ${host} (${hostNote}). Do not edit.\n` +
                `import makeHost from '../../components/${host}';\n\n` +
                `export default makeHost('${type}');\n`;
            await fs.writeFile(path.join(shimDir, 'index.jsx'), shim, 'utf8');

            console.log(`  + custom viz: ${type}  [${isAmd ? 'amd' : 'iframe'}]  (from ${path.basename(appDir)})`);
            count++;
        }
    }

    if (count === 0) {
        console.warn(
            `No Dashboard Studio custom viz found under ${srcFolder}. ` +
            `Expected extracted Splunk app folders containing ` +
            `default/visualizations.conf (framework_type = studio_visualization) ` +
            `and appserver/static/visualizations/<viz>/visualization.js.`
        );
    } else {
        console.log(`${count} custom viz sideloaded from mounted Splunk apps (auto-registered at build time)`);
    }
    return count;
}

async function generateDashboards(selectedDashboards, app, splunkdInfo, destFolder) {
    await generate(app, selectedDashboards, splunkdInfo, destFolder);
}

async function parseDashboardsAndTags(dashboards) {
    let selectedDashboards = {};

    if (process.env.DASHPUB_DASHBOARDS) {
        const dashboardEntries = process.env.DASHPUB_DASHBOARDS.split(',');
        dashboardEntries.forEach((entry) => {
            const match = entry.match(/^([^[\]]+)(?:\[(.*?)\])?$/); // Match dashboard name optionally followed by [tags]
            if (match) {
                const dashboard = match[1].trim();
                const tags = match[2] ? match[2].split('|').map((tag) => tag.trim()) : [];
                selectedDashboards[dashboard] = { tags }; // Structure as per requirement
            } else {
                // If no match, use the entry as-is
                const dashboard = entry.trim();
                selectedDashboards[dashboard] = { tags: [] };
            }
        });
        return selectedDashboards;
    }

    // Fallback to prompts if DASHPUB_DASHBOARDS is not defined
    const dashboardChoices = dashboards.map(({ name, label }) => ({ 
        name: `${label} [${name}]`, 
        value: name 
    }));

    const selectedDashboardNames = await prompts.selectDashboards(dashboards);
    
    selectedDashboardNames.forEach(dashboardName => {
        selectedDashboards[dashboardName] = { tags: [] };
    });

    return selectedDashboards;
}

async function createFrontendConfig(destFolder) {
    try {
        const configPath = path.join(destFolder, 'src/config.js');
        const configContent = `// Auto-generated configuration from environment variables
export const config = {
    title: '${process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'}',
    screenshots: ${process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTS === 'true' ? 'true' : 'false'},
    screenshotDir: '${process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTDIR || 'screenshots'}',
    screenshotExt: '${process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTEXT || 'png'}',
    theme: '${process.env.NEXT_PUBLIC_HOMETHEME || 'light'}',
    footer: '${process.env.NEXT_PUBLIC_DASHPUBFOOTER || 'Hosted Splunk Dashboards'}',
    hostedBy: '${process.env.NEXT_PUBLIC_DASHPUBHOSTEDBY || ''}',
    hostedByUrl: '${process.env.NEXT_PUBLIC_DASHPUBHOSTEDURL || '#'}',
    repo: '${process.env.NEXT_PUBLIC_DASHPUBREPO || ''}',
    vercelUrl: '${process.env.NEXT_PUBLIC_URL || ''}'
};

export default config;
`;
        
        await fs.writeFile(configPath, configContent, 'utf8');
        console.log('Frontend configuration file created:', configPath);
    } catch (error) {
        console.error('Error creating frontend config:', error);
    }
}

async function initNewProject() {
    try {
        let configObj = {};
        
        if (process.env.DASHPUB_CONFIGFILE) {
            console.log("Loading configuration from file:", process.env.DASHPUB_CONFIGFILE);
            configObj = await fs.readJson(process.env.DASHPUB_CONFIGFILE);
        }

        const splunkdInfo = await splunkd.getSplunkdInfo();
        
        const apps = await splunkd.listApps(splunkdInfo);
        
        const app = process.env.DASHPUB_APP && apps.some(a => a.name === process.env.DASHPUB_APP) 
            ? process.env.DASHPUB_APP 
            : await prompts.selectApp(apps);

        // Only get dashboards if DASHPUB_DASHBOARDS is not set
        let dashboards = [];
        if (!process.env.DASHPUB_DASHBOARDS) {
            dashboards = await splunkd.listDashboards(app, splunkdInfo);
        }

        const projectName = process.env.DASHPUB_PROJECTNAME ? process.env.DASHPUB_PROJECTNAME : await prompts.string('Project name:');
        const folderName = process.env.DASHPUB_FOLDERNAME
            ? process.env.DASHPUB_FOLDERNAME
            : toFolderName(projectName);

        const selectedDashboards = await parseDashboardsAndTags(dashboards);
        
        if (Object.keys(selectedDashboards).length === 0) {
            console.error('No dashboards selected. Exiting.');
            process.exit(1);
        }

        const destFolder = path.join(process.cwd(), folderName);

        if (await fs.pathExists(destFolder)) {
            const confirmed = await prompts.confirm(`Folder ${folderName} already exists. Overwrite?`, false);
            if (!confirmed) {
                console.log('Operation cancelled.');
                process.exit(0);
            }
            await fs.remove(destFolder);
        }

        await fs.ensureDir(destFolder);
        const templatePath = path.join(path.dirname(new URL(import.meta.url).pathname), '../template');
        await fs.copy(templatePath, destFolder);

        const customVizSrc = await customVizSourceDir();
        if (customVizSrc) {
            await ingestCustomVizApps(customVizSrc, destFolder);
        }

        await generateDashboards(selectedDashboards, app, splunkdInfo, destFolder);

        await updatePackageJson(
            { 
                projectName, 
                selectedApp: app, 
                selectedDashboards 
            }, 
            { destFolder }
        );
        await writeDotenv(splunkdInfo, { destFolder });


        if (!process.env.DASHPUB_VERCEL) {
            const deployToVercel = await prompts.confirm('Deploy to Vercel?', true);
            if (deployToVercel) {
                await initVercelProject({ 
                    folderName, 
                    destFolder, 
                    splunkdUrl: splunkdInfo.url, 
                    splunkdUser: splunkdInfo.username, 
                    splunkdPassword: splunkdInfo.password 
                });
            }
        } else if (process.env.DASHPUB_VERCEL.toLowerCase() == 'y') {
            await initVercelProject({ 
                folderName, 
                destFolder, 
                splunkdUrl: splunkdInfo.url, 
                splunkdUser: splunkdInfo.username, 
                splunkdPassword: splunkdInfo.password 
            });
        }

        console.log(postInitInstructions({ folderName }));

    } catch (error) {
        console.error('Error initializing project:', error);
        process.exit(1);
    }
}

export { initNewProject, generateDashboards, customVizSourceDir, ingestCustomVizApps };
