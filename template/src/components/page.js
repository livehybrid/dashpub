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
    path,
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
            if (!content) return; // Skip if content is empty/null
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

        // Get current page URL for og:url
        const currentPath = path || window.location.pathname;
        const pageUrl = baseUrl ? fullUrl(baseUrl, currentPath) : window.location.href;
        
        // Convert imageUrl to absolute URL if it's relative
        let absoluteImageUrl = imageUrl;
        if (imageUrl) {
            try {
                // Check if already absolute
                new URL(imageUrl);
                absoluteImageUrl = imageUrl;
            } catch (e) {
                // Relative URL - convert to absolute
                if (baseUrl) {
                    absoluteImageUrl = fullUrl(baseUrl, imageUrl);
                } else {
                    // Fallback to using current origin
                    absoluteImageUrl = new URL(imageUrl, window.location.origin).href;
                }
            }
        }

        // Update meta tags
        if (description) {
            updateMetaTag('description', description);
            updateMetaTag('og:description', description, true);
        }
        
        updateMetaTag('author', 'Splunk');
        updateMetaTag('og:title', `${title} - ${TITLE_SUFFIX}`, true);
        updateMetaTag('og:type', 'website', true);
        updateMetaTag('og:url', pageUrl, true);
        updateMetaTag('og:site_name', title, true);
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', `${title} - ${TITLE_SUFFIX}`);
        updateMetaTag('twitter:creator', '@Splunk');
        updateMetaTag('viewport', 'width=device-width, initial-scale=1');
        
        // Handle image meta tags
        if (absoluteImageUrl) {
            updateMetaTag('og:image', absoluteImageUrl, true);
            updateMetaTag('og:image:width', imageSize.width.toString(), true);
            updateMetaTag('og:image:height', imageSize.height.toString(), true);
            updateMetaTag('twitter:image', absoluteImageUrl);
        }
    }, [title, description, imageUrl, imageSize, baseUrl, path]);

    return children;
}
