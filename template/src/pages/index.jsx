import React from 'react';
import { SplunkThemeProvider } from '@splunk/themes';
import Page from '../components/Page';
import Home from '../components/home.jsx';
import Link from '@splunk/react-ui/Link';
import styled from 'styled-components';
import useSplunkTheme from '@splunk/themes/useSplunkTheme';
import 'bootstrap/dist/css/bootstrap.css';

export default function HomePage() {
  const { focusColor } = useSplunkTheme();
  
  const Footer = styled.p`
    color: ${focusColor};
    text-align: center;
  `;

  return (
    <SplunkThemeProvider>
      <Page 
        title={process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'}
        theme={process.env.NEXT_PUBLIC_HOMETHEME || 'light'}
        baseUrl={process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null}
      >
        <Home />
        {process.env.NEXT_PUBLIC_DASHPUBFOOTER !== "false" ? (
          <Footer>
            {process.env.NEXT_PUBLIC_DASHPUBFOOTER || "Hosted Splunk Dashboards"}
            {process.env.NEXT_PUBLIC_DASHPUBHOSTEDBY ? (
              <>
                {" by "}
                <Link
                  to={process.env.NEXT_PUBLIC_DASHPUBHOSTEDURL || '#'}
                  openInNewContext=""
                >
                  {process.env.NEXT_PUBLIC_DASHPUBHOSTEDBY}
                </Link>
                {" "}
              </>
            ) : " "}
            {"using "}
            <Link
              to={process.env.NEXT_PUBLIC_DASHPUBREPO || "https://github.com/splunk/dashpub"}
              openInNewContext=""
            >
              Dashpub
            </Link>
          </Footer>
        ) : null}
      </Page>
    </SplunkThemeProvider>
  );
}
