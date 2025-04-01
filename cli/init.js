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

const prompts = require('./prompts');
const splunkd = require('./splunkd');
const { ux } = require('@oclif/core');
const fs = require('fs-extra');
const path = require('path');
const { exec, Secret } = require('./exec');
const { generate } = require('./builddash');
const chalk = require('chalk');
const { updatePackageJson } = require('./pkgjson');
const { writeDotenv } = require('./env');
const { SPLUNK_DASHBOARDS_APP } = require('./constants');
const { initVercelProject } = require('./vercel');

require('dotenv').config();

const debug = (msg) => {
    if (process.env.DEBUG) {
        console.log(`[DEBUG] ${msg}`);
    }
};

const toFolderName = (projectName) => projectName.toLowerCase().replace(/[\W_]+/g, '-');

const postInitInstructions = ({ folderName }) => chalk`

{green Project successfully generated in {bold ./${folderName}}}

Next steps:

{yellow $} cd ./${folderName}

{gray # Start developing}

{yellow $} yarn dev

{gray Open a browser at http://localhost:3000}
`;

async function findCustomVizJsFilesInDirectory() {
    const dirPath = process.env.DASHPUB_CUSTOM_VIZ_PATH;
    if (!dirPath) {
        debug("Environment variable DASHPUB_CUSTOM_VIZ_PATH is not set.");
        return [];
    }
    try {
        const files = await fs.readdir(dirPath);
        return files.filter(file => file.endsWith('.jsx'));
    } catch (error) {
        console.error("Error reading directory:", error);
        return [];
    }
}

async function updateCustomViz(files, srcFolder, destFolder) {
    const presetFilePath = path.join(destFolder, 'src/preset.js');
    try {
        let customVizEntries = files.map(file => {
            const componentName = file.replace('.jsx', '');
            fs.copy(path.join(srcFolder, file), path.join(destFolder,'src', 'custom_components', file));
            return `'custom.${componentName}': commonFlags(lazy(() => import('./custom_components/${componentName}'))),`;
        }).join('\n    ');

        let data = await fs.readFile(presetFilePath, 'utf8');
        data = data.replace(/const CUSTOM_VIZ = \{\};/, `const CUSTOM_VIZ = {\n    ${customVizEntries}\n};`);
        await fs.writeFile(presetFilePath, data, 'utf8');
        debug('preset.js updated with custom viz files successfully');
    } catch (error) {
        console.error("Error updating preset.js:", error);
    }
}

async function generateDashboards(selectedDashboards, app, splunkdInfo, destFolder) {
    debug('Starting dashboard generation process');
    debug(`Selected dashboards: ${JSON.stringify(selectedDashboards, null, 2)}`);
    debug(`App: ${app}`);
    debug(`Destination folder: ${destFolder}`);
    try {
        await generate(app, selectedDashboards, splunkdInfo, destFolder);
        debug('Dashboard generation completed successfully');
    } catch (error) {
        console.error('[ERROR] Dashboard generation failed:', error);
        throw error;
    }
}

async function parseDashboardsAndTags(dashboards) {
    let selectedDashboards = {};

    if (process.env.DASHPUB_DASHBOARDS) {
        debug('Using dashboards from DASHPUB_DASHBOARDS environment variable');
        const dashboardEntries = process.env.DASHPUB_DASHBOARDS.split(',');
        dashboardEntries.forEach((entry) => {
            const match = entry.match(/^([^[\]]+)(?:\[(.*?)\])?$/);
            if (match) {
                const dashboard = match[1].trim();
                const tags = match[2] ? match[2].split('|').map((tag) => tag.trim()) : [];
                selectedDashboards[dashboard] = { tags };
                debug(`Parsed dashboard: ${dashboard} with tags: ${tags.join(', ')}`);
            } else {
                selectedDashboards[dashboard] = { tags: [] };
                debug(`Parsed dashboard: ${dashboard} with no tags`);
            }
        });
    } else {
        debug('No DASHPUB_DASHBOARDS environment variable, using interactive selection');
        selectedDashboards = await prompts.selectDashboards(dashboards);
    }

    return selectedDashboards;
}

async function initNewProject() {
    console.log(`Welcome to DASHPUB, let's setup a new project.\n`);
    let configObj,
        projectName,
        folderName,
        splunkdUrl,
        splunkdToken,
        splunkdUser,
        selectedApp,
        selectedDashboards,
        splunkdInfo,
        splunkdPassword;
    if (process.env.DASHPUB_CONFIGFILE) {
        debug('Using configuration from DASHPUB_CONFIGFILE');
        try {
            configObj = await fs.readJson(process.env.DASHPUB_CONFIGFILE);
            debug('Config file loaded successfully');
        } catch (err) {
            console.error(err);
        }
        projectName = configObj.dashpub.projectName;
        folderName = 'app';
        splunkdUrl = configObj.dashpub.splunkd.url;
        splunkdToken = process.env.SPLUNKD_TOKEN;
        splunkdInfo = {
            url: splunkdUrl,
            token: splunkdToken,
        };
        splunkdUser = await splunkd.getUsername(splunkdInfo);
        selectedApp = configObj.dashpub.app;
        selectedDashboards = configObj.dashpub.dashboards;
        debug(`Project configured from file: ${projectName} in ${folderName}`);
    } else {
        debug('Using interactive/environment variable configuration');
        projectName = process.env.DASHPUB_PROJECTNAME ? process.env.DASHPUB_PROJECTNAME : await prompts.string('Project name:');
        folderName = process.env.DASHPUB_FOLDERNAME
            ? process.env.DASHPUB_FOLDERNAME
            : await prompts.string('Folder name:', {
                  default: toFolderName(projectName),
              });

        if (!process.env.SPLUNKD_URL) console.log('\nEnter information to access your dashboards in Splunk Enterprise:');

        splunkdUrl = process.env.SPLUNKD_URL ? process.env.SPLUNKD_URL : await prompts.splunkdUrl();
        splunkdToken = process.env.SPLUNKD_TOKEN ? process.env.SPLUNKD_TOKEN : await prompts.splunkdToken(splunkdUrl);

        if (!splunkdToken) {
            debug('No token provided, using username/password authentication');
            splunkdUser = process.env.SPLUNKD_USER ? process.env.SPLUNKD_USER : await prompts.splunkdUsername();
            splunkdPassword = process.env.SPLUNKD_PASSWORD
                ? process.env.SPLUNKD_PASSWORD
                : await prompts.splunkdPassword(splunkdUrl, splunkdUser);
            splunkdInfo = {
                url: splunkdUrl,
                username: splunkdUser,
                password: splunkdPassword,
            };
        } else {
            debug('Using token authentication');
            splunkdInfo = {
                url: splunkdUrl,
                token: splunkdToken,
            };
            splunkdUser = await splunkd.getUsername(splunkdInfo);
            splunkdPassword = '';
        }

        debug('Loading available apps from Splunk');
        ux.action.start(`Loading apps`);
        const apps = await splunkd.listApps(splunkdInfo);
        ux.action.stop(`found ${apps.length} apps`);
        appNames = Object.entries(apps).map(([key, app]) => app['name']);

        selectedApp =
            process.env.DASHPUB_APP && appNames.includes(process.env.DASHPUB_APP) ? process.env.DASHPUB_APP : await prompts.selectApp(apps);
        debug(`Selected app: ${selectedApp}`);

        debug(`Loading dashboards from ${selectedApp}`);
        ux.action.start(`Loading dashboards from ${selectedApp} app`);
        const dashboards = await splunkd.listDashboards(selectedApp, splunkdInfo);
        ux.action.stop(`found ${dashboards.length} dashboards`);

        selectedDashboards = await parseDashboardsAndTags(dashboards);
        debug('Selected dashboards:', selectedDashboards);
    }

    debug(`Creating project in ./${folderName}`);
    console.log(`\nCreating project in ./${folderName}`);
    const srcFolder = path.join(__dirname, '..');
    const destFolder = path.join(process.cwd(), folderName);
    await fs.mkdir(destFolder);

    await fs.copy(path.join(srcFolder, 'template'), destFolder, { recursive: true });
    debug('Template files copied');

    const jsFiles = await findCustomVizJsFilesInDirectory();
    if (jsFiles.length > 0) {
        debug(`Found ${jsFiles.length} custom visualization files`);
        await updateCustomViz(jsFiles, process.env.DASHPUB_CUSTOM_VIZ_PATH, destFolder);
    }

    debug('Updating package.json');
    await updatePackageJson(
        { folderName, version: '1.0.0', projectName, splunkdUrl, splunkdUser, selectedApp, selectedDashboards },
        { destFolder }
    );
    debug('Writing .env file');
    await writeDotenv({ splunkdUrl, splunkdUser, splunkdPassword, splunkdToken }, { destFolder });

    debug('Installing dependencies');
    await exec('yarn', ['install'], { cwd: destFolder });
    await generateDashboards(selectedDashboards, selectedApp, splunkdInfo, destFolder);

    debug('Initializing git repository');
    await exec('git', ['init'], { cwd: destFolder });
    await exec('git', ['add', '.'], { cwd: destFolder });
    await exec('git', ['commit', '-m', 'initialized dashpub project'], { cwd: destFolder });

    if (!process.env.DASHPUB_VERCEL) {
        if (await prompts.confirm(`Setup Vercel project?`)) {
            debug('Setting up Vercel project');
            await initVercelProject({ folderName, destFolder, splunkdUrl, splunkdUser, splunkdPassword });
        } else {
            debug('Skipping Vercel setup');
            console.log(postInitInstructions({ folderName }));
        }
    } else if (process.env.DASHPUB_VERCEL.toLowerCase() == 'y') {
        debug('Setting up Vercel project (automated)');
        await initVercelProject({ folderName, destFolder, splunkdUrl, splunkdUser, splunkdPassword });
    } else {
        debug('Skipping Vercel setup (automated)');
        console.log(postInitInstructions({ folderName }));
    }
}

module.exports = {
    initNewProject,
    generateDashboards,
};
