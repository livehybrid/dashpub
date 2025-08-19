import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';
import Loading from '../components/loading';
import NoSSR from '../components/nossr';
import Page from '../components/page';
import getScreenshotUrl from '../components/getScreenshotUrl';

const Dashboard = dynamic(() => import('../components/dashboard'), {
  ssr: false,
});

export default function DashboardPage({ definition, dashboardId, baseUrl }) {
    // Only get screenshot URL on client side to prevent hydration mismatch
    const [screenshotUrl, setScreenshotUrl] = React.useState(null);
    
    React.useEffect(() => {
        // Set screenshot URL only after component mounts on client
        setScreenshotUrl(getScreenshotUrl(dashboardId));
    }, [dashboardId]);

    return React.createElement(Page, {
        title: definition.title || 'Dashboard',
        description: definition.description,
        imageUrl: screenshotUrl,
        path: `/${dashboardId}`,
        //  backgroundColor={"#171d21"}
        theme: definition.theme || 'light',
        baseUrl: baseUrl
    },
        React.createElement(NoSSR, null,
            React.createElement(Suspense, { fallback: React.createElement(Loading, null) },
                React.createElement(Dashboard, { definition: definition })
            )
        )
    );
}

export async function getStaticProps({ params }) {
    const definition = require(`../dashboards/${params.dashboard}/definition.json`);
    return {
        props: {
            definition,
            dashboardId: params.dashboard,
            baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        },
    };
}

export async function getStaticPaths() {
    const dashboards = require('../_dashboards.json');
    return {
        paths: Object.keys(dashboards)
            .filter((d) => d !== 'timelapse')
            .map((d) => ({ params: { dashboard: d } })),
        fallback: false,
    };
}
