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

async function findCustomVizJsFilesInDirectory() {
    const dirPath = process.env.DASHPUB_CUSTOM_VIZ_PATH;
    if (!dirPath) {
        console.debug("Environment variable DASHPUB_CUSTOM_VIZ_PATH is not set.");
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
        console.log('preset.js updated with custom viz files successfully');
    } catch (error) {
        console.error("Error updating preset.js:", error);
    }
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

    const selectedDashboardNames = await prompts.selectDashboards(dashboardChoices);
    
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
        
        const apps = await splunkd.getApps(splunkdInfo);
        const dashboards = await splunkd.getDashboards(splunkdInfo, apps);

        const projectName = process.env.DASHPUB_PROJECTNAME ? process.env.DASHPUB_PROJECTNAME : await prompts.string('Project name:');
        const folderName = process.env.DASHPUB_FOLDERNAME
            ? process.env.DASHPUB_FOLDERNAME
            : toFolderName(projectName);

        const selectedDashboards = await parseDashboardsAndTags(dashboards);
        
        if (Object.keys(selectedDashboards).length === 0) {
            console.error('No dashboards selected. Exiting.');
            process.exit(1);
        }

        const app = process.env.DASHPUB_APP && apps.some(a => a.name === process.env.DASHPUB_APP) 
            ? process.env.DASHPUB_APP 
            : await prompts.selectApp(apps);

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

        const jsFiles = await findCustomVizJsFilesInDirectory();
        if (jsFiles.length > 0) {
            await updateCustomViz(jsFiles, process.env.DASHPUB_CUSTOM_VIZ_PATH, destFolder);
        }

        await generateDashboards(selectedDashboards, app, splunkdInfo, destFolder);

        await updatePackageJson(destFolder, projectName, selectedDashboards, app);
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

export { initNewProject, generateDashboards };
