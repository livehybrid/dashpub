import React from 'react';
import Homepage from '../components/home';
import Page from '../components/page';
import Link from '@splunk/react-ui/Link';
import styled from 'styled-components';
import useSplunkTheme from '@splunk/themes/useSplunkTheme';
import 'bootstrap/dist/css/bootstrap.css';
import getScreenshotUrl from '../components/getScreenshotUrl';

export async function getStaticProps() {
    const screenshotUrl = getScreenshotUrl("index");
    return {
        props: {
            screenshotUrl,
        },
    };
}

export default function Home({ screenshotUrl }) {
    const { focusColor } = useSplunkTheme();
    const Footer = styled.p`
        color: ${focusColor};
        text-align: center;
    `;

    return (
        <Page
            title={process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'}
            theme={process.env.NEXT_PUBLIC_HOMETHEME || 'light'}
            imageUrl={screenshotUrl}
            baseUrl={process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null}>
            <Homepage key="home" />
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
                            </Link>{" "}
                        </>
                    ) : (
                        " "
                    )}
                    using{" "}
                    <Link
                        to={
                            process.env.NEXT_PUBLIC_DASHPUBREPO ||
                            "https://github.com/splunk/dashpub"
                        }
                        openInNewContext=""
                    >
                        Dashpub
                    </Link>
                </Footer>
            ) : (
                ""
            )}
        </Page>
    );
}
