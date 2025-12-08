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
import { exec, Secret } from './exec.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ux } from '@oclif/core';

const postInitInstructions = ({ folderName }) => chalk`

{green Project successfully generated in {bold ./${folderName}}}

{gray Next steps:}

{yellow $} cd ./${folderName}

{gray {bold.blue 1)} Setup the project with Vercel}

{yellow $} vercel

{gray Follow the steps to set up the project}

{gray {bold.blue 2)} Run locally}

{yellow $} vercel dev --listen 3333

{gray Open a browser at http://localhost:3333}

{gray {bold.blue 3)} Deploy to Vercel:}

{yellow $} vercel --prod

{gray {bold.blue 4)} [optional] Push to a Github repository and set up the Vercel Github Integration

    https://vercel.com/docs/git-integrations/vercel-for-github}
`;

async function initVercelProject({ folderName, destFolder, splunkdUrl, splunkdUser, splunkdPassword = process.env.SPLUNKD_PASSWORD }) {
    const nowSplunkdPasswordSecret = `dashpub-${folderName}-splunkd-password`;
    const nowSplunkdTokenSecret = `dashpub-${folderName}-splunkd-token`;
    ux.action.start('Creating vercel.json');
    await fs.writeFile(
        path.join(destFolder, 'vercel.json'),
        JSON.stringify(
            {
                version: 2,
                env: {
                    SPLUNKD_URL: splunkdUrl,
                    SPLUNKD_USER: splunkdUser,
                    SPLUNKD_PASSWORD: `@${nowSplunkdPasswordSecret}`,
                    SPLUNKD_TOKEN: `@${nowSplunkdTokenSecret}`,
                },
            },
            null,
            2
        )
    );
    ux.action.stop();

    await exec('vercel', ['secret', 'add', nowSplunkdPasswordSecret, new Secret(splunkdPassword)]);
    await exec('vercel', ['secret', 'add', nowSplunkdTokenSecret, new Secret(splunkdToken)]);
    await exec('git', ['add', '.'], { cwd: destFolder });
    await exec('git', ['commit', '-m', 'initialized vercel project'], { cwd: destFolder });

    console.log(postInitInstructions({ folderName }));
}

export { initVercelProject };
