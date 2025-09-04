import React from 'react';
import Login from '../components/login.jsx';
import Page from '../components/Page';
import Link from '@splunk/react-ui/Link';
import styled, { css } from 'styled-components';
import useSplunkTheme from '@splunk/themes/useSplunkTheme';
import { useConfig } from '../contexts/ConfigContext';
import 'bootstrap/dist/css/bootstrap.css';

// Define Footer outside of LoginPage
const Footer = styled.p`
    text-align: center;
    ${(props) => props.focusColor && css`
        color: ${props.focusColor};
    `}
`;

export default function LoginPage() {
    const { focusColor } = useSplunkTheme();
    const { config, loading: configLoading, error: configError } = useConfig();

    // Handle loading state
    if (configLoading) {
        return (
            <Page title="Loading..." theme="light">
                <div>Loading configuration...</div>
            </Page>
        );
    }

    // Handle error state
    if (configError) {
        return (
            <Page title="Error" theme="light">
                <div>Error loading configuration: {configError}</div>
            </Page>
        );
    }

    return (
        <Page
            title={config?.title || 'Dashboards'}
            theme={config?.theme || 'light'}
            baseUrl={config?.baseUrl || null}
            imageUrl={config?.homeScreenshot || null}
        >
            <Login config={config} />
            {config?.footer !== "false" ? (
                <Footer focusColor={focusColor || '#defaultColor'}>
                    {config?.footer || "Hosted Splunk Dashboards"}
                    {config?.hostedBy ? (
                        <>
                            {" by "}
                            <Link
                                to={config?.hostedByUrl || '#'}
                                openInNewContext=""
                            >
                                {config?.hostedBy}
                            </Link>
                            {" "}
                        </>
                    ) : " "}
                    {"using "}
                    <Link
                        to={config?.repo || "https://github.com/splunk/dashpub"}
                        openInNewContext=""
                    >
                        Dashpub
                    </Link>
                </Footer>
            ) : null}
        </Page>
    );
}
