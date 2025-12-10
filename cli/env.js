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

import fs from 'fs-extra';
import path from 'path';

async function writeDotenv({ url, username, password, token }, { destFolder = process.cwd() } = {}) {
    console.log('Writing splunkd credentials to .env');
    
    // Extract host and port from URL if available
    let host = process.env.SPLUNKD_HOST || '';
    let port = process.env.SPLUNKD_PORT || '8089';
    
    if (url) {
        try {
            const urlObj = new URL(url);
            host = urlObj.hostname;
            port = urlObj.port || '8089';
        } catch (e) {
            console.warn('Could not parse SPLUNKD_URL:', e.message);
        }
    }
    
    await fs.writeFile(
        path.join(destFolder, '.env'),
        [
            `SPLUNKD_URL=${url || ''}`,
            `SPLUNKD_HOST=${host}`,
            `SPLUNKD_PORT=${port}`,
            `SPLUNKD_USER=${username || ''}`,
            `SPLUNKD_PASSWORD=${password || ''}`,
            `SPLUNKD_TOKEN=${token || ''}`,
            `NODE_TLS_REJECT_UNAUTHORIZED=${process.env.NODE_TLS_REJECT_UNAUTHORIZED || '1'}`,
            'BROWSER=none',
            '',
        ].join('\n'),
        {
            encoding: 'utf-8',
        }
    );
}

export { writeDotenv };
