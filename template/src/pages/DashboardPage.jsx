import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import Page from '../components/Page';
import DashboardComponent from '../components/Dashboard';
import customPreset from '../preset';
import Loading from '../components/Loading';
import NoSSR from '../components/NoSSR';

export default function DashboardPage({ baseUrl }) {
    const [definition, setDefinition] = useState(null);
    const [loading, setLoading] = useState(true);

    // Use React Router's useParams instead of Next.js useRouter
    const { dashboard } = useParams();
    
    console.log('Dashboard ID:', dashboard);

    useEffect(() => {
        // Fetch the dashboard definition from the API if dashboard is present
        async function fetchDashboardDefinition() {
            if (!dashboard) return;
            
            try {
                const response = await fetch(`/api/dashboards/${dashboard}/definition`);
                if (!response.ok) {
                    throw new Error(`Failed to load dashboard: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setDefinition(data);
            } catch (error) {
                console.error('Error fetching dashboard definition:', error);
            } finally {
                setLoading(false);
            }
        }
        
        if (dashboard) {
            fetchDashboardDefinition();
        }
    }, [dashboard]);

    if (loading) {
        return <Loading />;
    }

    return (
        <Page
            title={definition?.title || 'Dashboard'}
            description={definition?.description}
            imageUrl={`/screenshot/${dashboard}.jpg`}
            path={`/${dashboard}`}
            theme={definition?.theme || 'light'}
            baseUrl={baseUrl}
        >
            <NoSSR>
                <Suspense fallback={<Loading />}>
                    <DashboardComponent preset={customPreset} definition={definition} />
                </Suspense>
            </NoSSR>
        </Page>
    );
}
