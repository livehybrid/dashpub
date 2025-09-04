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

import React, { useEffect } from 'react';
import { startAutoUpdateCheck } from '../autoupdate';
import 'bootstrap/dist/css/bootstrap.css';
import ClientOnly from './clientOnly';
const TITLE_SUFFIX = 'Splunk Dashboard';

const fullUrl = (baseUrl, path) => {
    console.log("baseUrl", baseUrl);
    console.log("path", path);
    try {
        // Check if the path is already an absolute URL
        const url = new URL(path);
        return url.href;
    } catch (e) {
        // If it's not an absolute URL, construct it using baseUrl
        if (!baseUrl) {
            return path;
        }
        const u = new URL(baseUrl);
        u.pathname = path;
        return u.href;
    }
};

export default function Page({
    title,
    description,
    imageUrl,
    imageSize = { width: 700, height: 340 },
    baseUrl,
    children,
}) {
    useEffect(() => {
        startAutoUpdateCheck();
    }, []);

    // Update document head
    useEffect(() => {
        // Update title
        document.title = `${title} - ${TITLE_SUFFIX}`;
        
        // Helper function to update or create meta tag
        const updateMetaTag = (name, content, property = false) => {
            const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
            let meta = document.querySelector(selector);
            if (!meta) {
                meta = document.createElement('meta');
                if (property) {
                    meta.setAttribute('property', name);
                } else {
                    meta.setAttribute('name', name);
                }
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        // Update meta tags
        if (description) {
            updateMetaTag('description', description);
            updateMetaTag('og:description', description, true);
        }
        
        updateMetaTag('author', 'Splunk');
        updateMetaTag('og:title', `${title} - ${TITLE_SUFFIX}`, true);
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', `${title} - ${TITLE_SUFFIX}`);
        updateMetaTag('twitter:creator', '@Splunk');
        updateMetaTag('viewport', 'width=device-width, initial-scale=1');
        // Handle image meta tags
        if (imageUrl ) {
            updateMetaTag('og:image', imageUrl, true);
            updateMetaTag('og:image:width', imageSize.width, true);
            updateMetaTag('og:image:height', imageSize.height, true);
            updateMetaTag('twitter:image', imageUrl);
        }
    }, [title, description, imageUrl, imageSize, baseUrl]);

    return children;
}
