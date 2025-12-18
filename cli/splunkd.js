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

const fetch = global.fetch;
import { XmlDocument } from 'xmldoc';

const qs = obj =>
    Object.entries(obj)
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&');

const splunkd = (
    method,
    path,
    { body, url = process.env.SPLUNKD_URL, username = process.env.SPLUNKD_USER, password = process.env.SPLUNKD_PASSWORD, token= process.env.SPLUNKD_TOKEN } = {},
    returnJson = true
) => {
    console.log(`${url}${path}`);
    const AUTH_HEADER = token ? `Bearer ${token}` : `Basic ${Buffer.from([username, password].join(':')).toString('base64')}`;
    return fetch(`${url}${path}`, {
        method,
        headers: {
            Authorization: AUTH_HEADER
        },
        body,
    }).then(async res => {
        if (res.status > 299) {
            const msg = await extractErrorMessage(res, `Splunkd responded with HTTP status ${res.status} requesting ${path}`);
            throw new Error(msg);
        }
        return returnJson ? res.json() : res;
    });
};

async function extractErrorMessage(response, defaultMsg) {
    if (response.status === 404) {
        return defaultMsg;
    }
    try {
        const json = await response.json();
        console.log(json);
    } catch (e) {
        // ignore
    }
    return defaultMsg;
}

const extractDashboardDefinition = xmlSrc => {
    const doc = new XmlDocument(xmlSrc);
    const def = JSON.parse(doc.childNamed('definition').val);
    const theme = doc.attr['theme'];
    return theme ? { ...def, theme } : def;
};

const loadDashboard = (
    name,
    app,
    { url = process.env.SPLUNKD_URL, username = process.env.SPLUNKD_USER, password = process.env.SPLUNKD_PASSWORD, token=process.env.SPLUNKD_TOKEN } = {}
) => {
    console.log(`/servicesNS/nobody/${encodeURIComponent(app)}/data/ui/views/${encodeURIComponent(name)}?output_mode=json`);    
    return splunkd('GET', `/servicesNS/nobody/${encodeURIComponent(app)}/data/ui/views/${encodeURIComponent(name)}?output_mode=json`, {
        url,    
        username,
        password,
        token,
    }).then(
        data => {
            return extractDashboardDefinition(data.entry[0].content['eai:data']);
        }
    );
}
const listDashboards = async (
    app,
    { url = process.env.SPLUNKD_URL, username = process.env.SPLUNKD_USER, password = process.env.SPLUNKD_PASSWORD, token = process.env.SPLUNKD_TOKEN } = {}
) => {
    const res = await splunkd(
        'GET',
        `/servicesNS/-/${encodeURIComponent(app)}/data/ui/views?${qs({
            output_mode: 'json',
            count: 0,
            offset: 0,
            search: `(isDashboard=1 AND isVisible=1 AND (version=2 OR version=1))`,
        })}`,
        {
            url,
            username,
            password,
            token,
        }
    );
    return res.entry
        .filter(entry => entry.acl.app === app)
        .map(entry => ({
            name: entry.name,
            label: entry.content.label,
        }));
};

const getUsername = async (
    { url = process.env.SPLUNKD_URL, token = process.env.SPLUNKD_TOKEN } = {}
) => {
    const res = await splunkd(
        'GET',
        `/services/authentication/current-context/context?${qs({
            output_mode: 'json'
        })}`,
        {
            url,
            token,
        }
    );
    console.log(res.entry[0].content.username);

    return res.entry[0].content.username
};

const listApps = async (
    { url = process.env.SPLUNKD_URL, username = process.env.SPLUNKD_USER, password = process.env.SPLUNKD_PASSWORD, token = process.env.SPLUNKD_TOKEN } = {}
) => {
    const res = await splunkd(
        'GET',
        `/services/apps/local?${qs({
            output_mode: 'json',
            count: 0,
            offset: 0,
            search: `(disabled=0)`,
        })}`,
        {
            url,
            username,
            password,
            token,
        }
    );

    return res.entry
        .map(entry => ({
            name: entry.name,
            label: entry.content.label,
        }));
};

async function validateAuth({ url, user, password }) {
    try {
        await splunkd('GET', '/services/server/info', { url, username: user, password });
        return true;
    } catch (e) {
        return false;
    }
}

async function getSplunkdInfo() {
    // Build SPLUNKD_URL if not provided
    let url = process.env.SPLUNKD_URL;
    if (!url && process.env.SPLUNKD_HOST) {
        const host = process.env.SPLUNKD_HOST;
        const port = process.env.SPLUNKD_PORT || '8089';
        const protocol = process.env.SPLUNKD_PROTOCOL || 'https';
        url = `${protocol}://${host}:${port}`;
        console.log(`Constructed SPLUNKD_URL from components: ${url}`);
    }

    // Get username - either from env or fetch from API using token
    let username = process.env.SPLUNKD_USER;
    const token = process.env.SPLUNKD_TOKEN;
    
    if (!username && token && url) {
        console.log('SPLUNKD_USER not provided, fetching from Splunk API...');
        try {
            username = await getUsername({ url, token });
            console.log(`Fetched username from Splunk: ${username}`);
        } catch (error) {
            console.warn('Failed to fetch username from Splunk API:', error.message);
            // username remains undefined
        }
    }

    return {
        url,
        username,
        password: process.env.SPLUNKD_PASSWORD,
        token
    };
}

export {
    splunkd,
    loadDashboard,
    listApps,
    listDashboards,
    validateAuth,
    getUsername,
    getSplunkdInfo,
    qs,
};
