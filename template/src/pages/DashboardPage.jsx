import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Page from '../components/Page';
import DashboardComponent from '../components/Dashboard';
import customPreset from '../preset';
import Loading from '../components/Loading';
import NoSSR from '../components/NoSSR';
import ViewSourceModal from '../components/ViewSourceModal';
import { useConfig } from '../contexts/ConfigContext';

export default function DashboardPage() {
    const [definition, setDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const { config } = useConfig();

    // Use React Router's useParams instead of Next.js useRouter
    const { dashboard } = useParams();
    const [searchParams] = useSearchParams();

    // Fullscreen / kiosk mode: hides breadcrumbs, dashboard tabs and the
    // tab-rotator overlay so the dashboard fills the screen.
    // Enable via ?fullscreen=true (also accepts ?fullscreen=1 or ?kiosk=true).
    const isTruthy = (v) => v === '' || v === 'true' || v === '1' || v === 'yes';
    const fullscreen = isTruthy(searchParams.get('fullscreen')) || isTruthy(searchParams.get('kiosk'));

    console.log('Dashboard ID:', dashboard);

    // Toggle a body class so global CSS can hide the Splunk-rendered tab bar
    // (which lives inside DashboardCore's own DOM, out of React's reach here).
    useEffect(() => {
        const cls = 'dashpub-fullscreen';
        document.body.classList.toggle(cls, fullscreen);
        return () => document.body.classList.remove(cls);
    }, [fullscreen]);

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
            imageUrl={(() => {
                // First priority: screenshotUrl from dashboard definition
                if (definition?.screenshotUrl) {
                    return definition.screenshotUrl;
                }
                
                // Second priority: construct URL from config if screenshots are enabled
                if (config?.screenshots?.enabled) {
                    const baseUrl = config.screenshots.baseUrl || '';
                    const dir = config.screenshots.dir || 'screenshots';
                    const ext = config.screenshots.ext || 'jpg';
                    
                    // If baseUrl is empty, use dashboard name; otherwise use hash
                    const filename = (!baseUrl || baseUrl === '') 
                        ? dashboard 
                        : (definition?.screenshotHash || dashboard);
                    
                    if (baseUrl && baseUrl !== '') {
                        return `${baseUrl}/${dir}/${filename}.${ext}`;
                    } else {
                        // Relative path when baseUrl is empty
                        return `/${dir}/${filename}.${ext}`;
                    }
                }
                
                // Fallback: hardcoded path
                return `/screenshot/${dashboard}.jpg`;
            })()}
            path={`/${dashboard}`}
            theme={definition?.theme || 'light'}
            baseUrl={config?.baseUrl || null}
            showBreadcrumbs={!fullscreen}
        >
            <NoSSR>
                {config?.viewSource && (
                    <ViewSourceModal definition={definition} title={definition?.title} />
                )}
                <Suspense fallback={<Loading />}>
                    <DashboardComponent preset={customPreset} definition={definition} />
                </Suspense>
            </NoSSR>
        </Page>
    );
}
