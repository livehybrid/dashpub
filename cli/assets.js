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

import { splunkd } from './splunkd.js';

import fs from 'fs-extra';
const { writeFile } = fs;
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
const fetch = global.fetch;
import 'dotenv/config';

/**
 * Builds the Splunk UI URL from the REST API URL
 * Static assets are served on the UI port (default 8000, or from SPLUNKD_UI_PORT env var)
 */
function getSplunkUIUrl(splunkdInfo) {
    const uiPort = process.env.SPLUNKD_UI_PORT || '8000';
    
    if (!splunkdInfo.url) {
        throw new Error('SPLUNKD_URL is required to fetch static assets');
    }
    
    try {
        const urlObj = new URL(splunkdInfo.url);
        // Replace the port with the UI port
        urlObj.port = uiPort;
        return urlObj.toString();
    } catch (e) {
        throw new Error(`Invalid SPLUNKD_URL format: ${splunkdInfo.url}`);
    }
}

function shortHash(buffer) {
    const h = crypto.createHash('sha256');
    h.write(buffer);
    h.end();
    return h.digest('hex').slice(0, 20);
}

function parseDataUri(dataUri) {
    if (!dataUri.startsWith('data:')) {
        throw new Error('Invalid data URI');
    }
    const semiIdx = dataUri.indexOf(';');
    if (semiIdx < 0) {
        throw new Error('Invalid data URI');
    }
    const mime = dataUri.slice(5, semiIdx);
    if (!dataUri.slice(semiIdx + 1, 7) === 'base64,') {
        throw new Error('Unsupported data URI encoding');
    }
    const data = Buffer.from(dataUri.slice(semiIdx + 8), 'base64');
    return [mime, data];
}

const seenImages = {};

async function nameAndStoreImage(data, mimeType, { name = 'img', projectDir }) {
    let optimzed = data;
    let filename;

    switch (mimeType) {
        case 'image/svg+xml':
            filename = `${name}.svg`;
            break;
        case 'image/jpeg':
        case 'image/jpg':
            filename = `${name}.jpg`;
            optimzed = await sharp(data)
                .jpeg()
                .toBuffer();
            break;
        case 'image/png':
            filename = `${name}.png`;
            optimzed = await sharp(data)
                .png()
                .toBuffer();
            break;
        case 'image/webp':
            filename = `${name}.webp`;
            optimzed = await sharp(data)
                .webp({effort: 6})
                .toBuffer();
            break;
        case 'image/gif':
            filename = `${name}.gif`;
            break;
        default:
            throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    filename = `${shortHash(optimzed)}_${filename}`;
    await writeFile(path.join(projectDir, 'public/assets', filename), optimzed);
    return filename;
}

async function storeImage(data, filename, {name = 'img', projectDir}) {
    await writeFile(path.join(projectDir, 'public/assets', filename), data);
    return filename;
}

async function streamToBuffer(readableStream) {
    const reader = readableStream.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }


async function downloadImage(src, assetType, splunkdInfo, projectDir) {
    if (!src) {
        return src;
    }
    
    // Trim whitespace from src - some dashboard definitions have leading/trailing spaces
    src = src.trim();
    
    if (src in seenImages) {
        return seenImages[src];
    }
    
    // Debug logging
    const debugMode = process.env.DEBUG_ASSETS === 'true';
    if (debugMode) {
        console.log(`[DEBUG] downloadImage called with:`, {
            src,
            assetType,
            splunkdUrl: splunkdInfo?.url,
            hasToken: !!splunkdInfo?.token,
            hasUsername: !!splunkdInfo?.username
        });
    }
    
    if (src.startsWith("<svg")) {
        const filename = await nameAndStoreImage(src, "image/svg+xml" , { projectDir });
        // If the DASHPUB_FQDN env is set and its an SVG then return the link with FQDN prepended
        if (process.env.DASHPUB_FQDN) {
            var newUri = `${process.env.DASHPUB_FQDN}/assets/${filename}`;
        } else {
            var newUri = `/assets/${filename}`;
        }
        seenImages[src] = newUri;
        return newUri;
    }
    
    // Handle static paths (e.g., /static/app/...)
    // Static assets are served on the UI port, not the REST API port
    const isStaticPath = src.startsWith('/static/') || (src.startsWith('/') && !src.includes('://'));
    
    // Always log static path detection for debugging
    if (src.includes('static') || src.startsWith('/')) {
        console.log(`[ASSETS] Processing image path:`, {
            src,
            startsWithStatic: src.startsWith('/static/'),
            startsWithSlash: src.startsWith('/'),
            includesProtocol: src.includes('://'),
            isStaticPath,
            locale: process.env.SPLUNKD_LOCALE || 'en-US'
        });
    }
    
    if (debugMode) {
        console.log(`[DEBUG] Path check:`, {
            src,
            startsWithStatic: src.startsWith('/static/'),
            startsWithSlash: src.startsWith('/'),
            includesProtocol: src.includes('://'),
            isStaticPath
        });
    }
    
    if (isStaticPath) {
        try {
            const uiUrl = getSplunkUIUrl(splunkdInfo);
            // Ensure no double slashes (remove trailing slash from uiUrl if present)
            const baseUrl = uiUrl.replace(/\/$/, '');
            
            // Splunk UI requires a locale prefix (e.g., /en-US) before /static/ paths
            // Default to en-US if not specified via environment variable
            const locale = process.env.SPLUNKD_LOCALE || 'en-US';
            const fullUrl = `${baseUrl}/${locale}${src}`;
            
            if (debugMode) {
                console.log(`[DEBUG] Constructed URL:`, {
                    uiUrl,
                    baseUrl,
                    locale,
                    src,
                    fullUrl
                });
            }
            
            // Build auth header for UI requests
            const AUTH_HEADER = splunkdInfo.token 
                ? `Bearer ${splunkdInfo.token}` 
                : `Basic ${Buffer.from([splunkdInfo.username, splunkdInfo.password].join(':')).toString('base64')}`;
            
            if (debugMode) {
                console.log(`[DEBUG] Fetching:`, {
                    fullUrl,
                    hasAuth: !!AUTH_HEADER,
                    authType: splunkdInfo.token ? 'Bearer' : 'Basic'
                });
            }
            
            const res = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    Authorization: AUTH_HEADER
                }
            });
            
            if (debugMode) {
                console.log(`[DEBUG] Fetch response:`, {
                    status: res.status,
                    statusText: res.statusText,
                    contentType: res.headers.get('Content-Type'),
                    contentLength: res.headers.get('Content-Length')
                });
            }
            
            if (res.status > 299) {
                const errorText = await res.text().catch(() => 'Unable to read error response');
                throw new Error(`Failed to fetch static asset ${src}: HTTP ${res.status} ${res.statusText} (tried: ${fullUrl})\nResponse: ${errorText.substring(0, 200)}`);
            }
            
            const data = await streamToBuffer(res.body);
            
            // Determine MIME type from Content-Type header or file extension
            let mimeType = res.headers.get('Content-Type');
            if (!mimeType) {
                const ext = path.extname(src).toLowerCase();
                const mimeMap = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.webp': 'image/webp'
                };
                mimeType = mimeMap[ext] || 'image/png';
            }
            
            const orig_filename = path.basename(src);
            const filename = await nameAndStoreImage(data, mimeType, { name: orig_filename.replace(/\.[^/.]+$/, ''), projectDir });
            
            // If the DASHPUB_FQDN env is set and its an SVG then return the link with FQDN prepended
            if (process.env.DASHPUB_FQDN && mimeType === 'image/svg+xml') {
                var newUri = `${process.env.DASHPUB_FQDN}/assets/${filename}`;
            } else if (mimeType === 'image/svg+xml') {
                const base64SVG = data.toString('base64');
                var newUri = `data:image/svg+xml;base64,${base64SVG}`;
            } else {
                var newUri = `/assets/${filename}`;
            }
            seenImages[src] = newUri;
            return newUri;
        } catch (error) {
            if (debugMode) {
                console.error(`[DEBUG] Error downloading static asset:`, {
                    src,
                    error: error.message,
                    stack: error.stack
                });
            }
            // Re-throw with more context
            throw new Error(`Failed to download image ${src}: ${error.message}`);
        }
    }
    
    const [type, id] = src.split('://');
    
    if (debugMode) {
        console.log(`[DEBUG] Checking protocol-based types:`, {
            src,
            type,
            id,
            splitResult: src.split('://')
        });
    }

    if (type === 'https' || type === 'http') {
        const res = await fetch(src);

        const data = await res.buffer();
        const mimeType = res.headers.get('Content-Type');

        const filename = await storeImage(data, mimeType, { projectDir });
        const newUri = `/assets/${filename}`;
        seenImages[src] = newUri;
        return newUri;
    }

    if (type === 'splunk-enterprise-kvstore') {
        const imgData = await splunkd(
            'GET',
            `/servicesNS/nobody/splunk-dashboard-studio/storage/collections/data/splunk-dashboard-${assetType}/${encodeURIComponent(
                id
            )}`,
            splunkdInfo
        );

        const [mimeType, data] = parseDataUri(imgData.dataURI);
        const filename = await nameAndStoreImage(data, mimeType, { name: id, projectDir });
        // If the DASHPUB_FQDN env is set and its an SVG then return the link with FQDN prepended
        if (process.env.DASHPUB_FQDN && mimeType=="image/svg+xml") {
            var newUri = `${process.env.DASHPUB_FQDN}/assets/${filename}`;
        } else if (mimeType=="image/svg+xml") {
            const base64SVG = data.toString('base64');
            var newUri = `data:image/svg+xml;base64,${base64SVG}`;
        // Else return the SVG XML content and embed into dash definition
//          var newUri = data.toString();
        } else {
            var newUri = `/assets/${filename}`;
        }
        seenImages[src] = newUri;
        return newUri;
    }
    if (type.includes('splunkd/__raw')) {
        const imgData = await splunkd(
            'GET',
            type.split("splunkd/__raw")[1],
            splunkdInfo,
            returnJson=false
        );
        const data = await streamToBuffer(imgData.body);

        const orig_filename = type.split("/").pop()
        const filename = await storeImage(data, orig_filename, { name: id, projectDir });
        // If the DASHPUB_FQDN env is set and its an SVG then return the link with FQDN prepended
        if (process.env.DASHPUB_FQDN) {
            var newUri = `${process.env.DASHPUB_FQDN}/assets/${filename}`;
        } else {
            var newUri = `/assets/${filename}`;
        }
        seenImages[src] = newUri;
        return newUri;
    }

    // If we get here, we couldn't determine the image type
    const errorMsg = `Unexpected image type: ${type || 'undefined'} (src: ${src})`;
    if (debugMode) {
        console.error(`[DEBUG] ${errorMsg}`);
        console.error(`[DEBUG] Full context:`, {
            src,
            type,
            id,
            startsWithStatic: src.startsWith('/static/'),
            startsWithSlash: src.startsWith('/'),
            includesProtocol: src.includes('://'),
            splitResult: src.split('://')
        });
    }
    throw new Error(errorMsg);
}

export { downloadImage };
