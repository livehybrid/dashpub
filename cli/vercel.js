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

// chalk 5 dropped tagged-template support, so build the message from calls.
const postInitInstructions = ({ folderName }) => `

${chalk.green(`Project successfully generated in ${chalk.bold(`./${folderName}`)}`)}

${chalk.gray('Next steps:')}

${chalk.yellow('$')} cd ./${folderName}

${chalk.bold.blue('1)')} ${chalk.gray('Setup the project with Vercel')}

${chalk.yellow('$')} vercel

${chalk.gray('Follow the steps to set up the project')}

${chalk.bold.blue('2)')} ${chalk.gray('Run locally')}

${chalk.yellow('$')} vercel dev --listen 3333

${chalk.gray('Open a browser at http://localhost:3333')}

${chalk.bold.blue('3)')} ${chalk.gray('Deploy to Vercel:')}

${chalk.yellow('$')} vercel --prod

${chalk.bold.blue('4)')} ${chalk.gray('[optional] Push to a Github repository and set up the Vercel Github Integration')}

    ${chalk.gray('https://vercel.com/docs/git-integrations/vercel-for-github')}
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
