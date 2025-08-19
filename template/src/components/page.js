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
import { createGlobalStyle } from 'styled-components';
import Head from 'next/head';
import { startAutoUpdateCheck } from '../autoupdate';
import { SplunkThemeProvider, variables } from '@splunk/themes';
import 'bootstrap/dist/css/bootstrap.css';
import ClientOnly from './clientOnly';
const TITLE_SUFFIX = 'Splunk Dashboard';

const GlobalBackgroundStyle = createGlobalStyle`
    html, body {
        background-color: ${(props) => props.backgroundColor || variables.backgroundColor(props)};
    }
`;

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
    theme = 'light',
    backgroundColor,
    imageUrl,
    imageSize = { width: 700, height: 340 },
    baseUrl,
    children,
}) {
    useEffect(() => {
        startAutoUpdateCheck();
    }, []);

    return React.createElement(React.Fragment, null,
        React.createElement(Head, null,
            React.createElement('title', null, `${title} - ${TITLE_SUFFIX}`),
            description && React.createElement('meta', { name: "description", content: description }),
            React.createElement('meta', { name: "author", content: "Splunk" }),
            React.createElement('meta', { property: "og:title", content: `${title} - ${TITLE_SUFFIX}` }),
            description && React.createElement('meta', { property: "og:description", content: description }),
            imageUrl != null && baseUrl != null && 
                React.createElement(ClientOnly, { 
                    fallback: null,
                    key: "og-image-meta"
                },
                    React.createElement(React.Fragment, null,
                        React.createElement('meta', { property: "og:image", content: fullUrl(baseUrl, imageUrl) }),
                        React.createElement('meta', { property: "og:image:width", content: imageSize.width }),
                        React.createElement('meta', { property: "og:image:height", content: imageSize.height })
                    )
                ),
            React.createElement('meta', { name: "twitter:card", content: "summary_large_image" }),
            React.createElement('meta', { name: "twitter:title", content: `${title} - ${TITLE_SUFFIX}` }),
            React.createElement('meta', { name: "twitter:creator", content: "@Splunk" }),
            imageUrl != null && baseUrl != null && 
                React.createElement(ClientOnly, { 
                    fallback: null,
                    key: "twitter-image-meta"
                },
                    React.createElement('meta', { property: "twitter:image", content: fullUrl(baseUrl, imageUrl) })
                ),
            React.createElement('meta', { name: "viewport", content: "width=device-width, initial-scale=1" })
        ),
        React.createElement(SplunkThemeProvider, { family: "enterprise", colorScheme: theme },
            React.createElement(GlobalBackgroundStyle, { backgroundColor: backgroundColor }),
            children
        )
    );
}
