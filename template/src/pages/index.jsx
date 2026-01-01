import React from 'react';
import Page from '../components/Page';
import Home from '../components/home.jsx';
import Link from '@splunk/react-ui/Link';
import styled from 'styled-components';
import useSplunkTheme from '@splunk/themes/useSplunkTheme';
import { useConfig } from '../contexts/ConfigContext';
import 'bootstrap/dist/css/bootstrap.css';

export default function HomePage() {
  const { focusColor } = useSplunkTheme();
  const { config, loading: configLoading, error: configError } = useConfig();
  
  const Footer = styled.p`
    color: ${focusColor};
    text-align: center;
    padding-bottom: 50px;
    font-size: 120%;
    font-weight: bold;
  `;

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
      baseUrl={config?.baseUrl || null}
      imageUrl={config?.homeScreenshot || null}
      showBreadcrumbs={false}
    >
      <Home />
      {config?.footer !== "false" ? (
        <Footer>
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
