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
    
    // New Splunk credentials to add/update
    const splunkVars = {
        'SPLUNKD_URL': url || '',
        'SPLUNKD_HOST': host,
        'SPLUNKD_PORT': port,
        'SPLUNKD_USER': username || '',
        'SPLUNKD_PASSWORD': password || '',
        'SPLUNKD_TOKEN': token || '',
        'NODE_TLS_REJECT_UNAUTHORIZED': process.env.NODE_TLS_REJECT_UNAUTHORIZED || '1',
        'BROWSER': 'none'
    };
    
    // Always write to destFolder (typically ./app)
    const destEnvPath = path.join(destFolder, '.env');
    
    // Check if .env exists in CWD first - read it to merge values
    const cwdEnvPath = path.join(process.cwd(), '.env');
    let existingContent = '';
    let sourceInfo = '';
    
    if (await fs.pathExists(cwdEnvPath)) {
        // Read CWD .env to merge its values
        existingContent = await fs.readFile(cwdEnvPath, 'utf-8');
        sourceInfo = ' (merged from CWD .env)';
        console.log(`Reading .env from current directory (${cwdEnvPath}) and merging with Splunk credentials`);
        console.log(`Will write merged content to: ${destEnvPath}`);
    } else if (await fs.pathExists(destEnvPath)) {
        // Fallback: read existing destFolder .env if CWD .env doesn't exist
        existingContent = await fs.readFile(destEnvPath, 'utf-8');
        sourceInfo = ' (updating existing)';
        console.log('Updating existing .env file in', destFolder);
    } else {
        console.log('Creating new .env file in', destFolder);
    }
    
    // Parse existing .env content
    const lines = existingContent.split('\n');
    const existingVars = {};
    const otherLines = [];
    const commentLines = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Keep comments
        if (trimmed.startsWith('#')) {
            commentLines.push(line);
            continue;
        }
        
        // Skip empty lines (we'll add our own spacing)
        if (!trimmed) {
            continue;
        }
        
        const match = trimmed.match(/^([^=#]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            existingVars[key] = value;
        } else {
            // Keep non-variable lines as-is
            otherLines.push(line);
        }
    }
    
    // Merge: Splunk vars override existing ones, but preserve all other vars from CWD
    const mergedVars = { ...existingVars, ...splunkVars };
    
    // Debug: Log what we found
    if (existingVars && Object.keys(existingVars).length > 0) {
        console.log(`Found ${Object.keys(existingVars).length} existing environment variables to merge`);
    }
    
    // Build the new .env content
    // 1. Keep comments from original
    // 2. Keep other non-variable lines
    // 3. Add all variables (existing + new Splunk vars)
    const envLines = [];
    
    // Add comments from original file
    if (commentLines.length > 0) {
        envLines.push(...commentLines);
        envLines.push(''); // Blank line after comments
    }
    
    // Add other non-variable lines
    if (otherLines.length > 0) {
        envLines.push(...otherLines);
        envLines.push(''); // Blank line
    }
    
    // Add Splunk connection section
    envLines.push('# Splunk connection settings (updated by dashpub CLI)');
    
    // Add all variables, sorted for readability (Splunk vars first, then others)
    const splunkKeys = Object.keys(splunkVars);
    const otherKeys = Object.keys(mergedVars).filter(k => !splunkKeys.includes(k));
    
    // Add Splunk variables
    for (const key of splunkKeys) {
        envLines.push(`${key}=${mergedVars[key]}`);
    }
    
    // Add other variables if any
    if (otherKeys.length > 0) {
        envLines.push(''); // Blank line between sections
        for (const key of otherKeys.sort()) {
            envLines.push(`${key}=${mergedVars[key]}`);
        }
    }
    
    envLines.push(''); // Trailing newline
    
    await fs.writeFile(destEnvPath, envLines.join('\n'), {
        encoding: 'utf-8',
    });
    
    console.log(`✓ Updated .env file at: ${destEnvPath}${sourceInfo}`);
}

export { writeDotenv };
