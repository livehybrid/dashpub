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

import React, { Component, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { variables } from '@splunk/themes';
import { Tag } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.css';
import HomeHeader from "./home_header";
import ClientOnly from './clientOnly';
import { useConfig } from '../contexts/ConfigContext';

// Use lazy loading for Vite compatibility instead of Next.js dynamic
const CardLayout = lazy(() => import('@splunk/react-ui/CardLayout'));
const CardDefault = lazy(() => import('@splunk/react-ui/Card'));
const CardHeader = lazy(() => import('@splunk/react-ui/Card').then((lib) => ({ default: lib.Header })));
const CardBody = lazy(() => import('@splunk/react-ui/Card').then((lib) => ({ default: lib.Body })));
const CardFooter = lazy(() => import('@splunk/react-ui/Card').then((lib) => ({ default: lib.Footer })));
const Chip = lazy(() => import('@splunk/react-ui/Chip'));
const Button = lazy(() => import('@splunk/react-ui/Button'));

// Create a wrapper component for lazy-loaded components
const LazyComponent = ({ component: Component, fallback = null, ...props }) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

const PageWrapper = styled.div`
    margin: 2% 5%;
    text-align: center;
`;
const DashWrapper = styled.div``;

const Screenshot = styled.img`
    width: 310px;
`;

const Title = styled.h1`
    color: ${variables.textColor};
`;
const CardTitle = styled.h4`
    color: ${variables.textColor};
`;
const CardSubTitle = styled.h5`
    color: ${variables.textColor};
`;

const TagContainer = styled.div`
    padding: 5px;
    margin-bottom: 5px;
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    // gap: 2px;
`;

// Component to handle screenshot display with retry logic
class ScreenshotComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            imageSrc: props.screenshotUrl,
            retryCount: 0,
            isLoading: true,
            hasError: false
        };
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    componentDidMount() {
        this.loadImage();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.screenshotUrl !== this.props.screenshotUrl) {
            this.setState({
                imageSrc: this.props.screenshotUrl,
                retryCount: 0,
                isLoading: true,
                hasError: false
            });
            this.loadImage();
        }
    }

    loadImage = () => {
        const { imageSrc } = this.state;
        if (!imageSrc) {
            this.setState({ isLoading: false, hasError: true });
            return;
        }

        const img = new Image();
        
        img.onload = () => {
            console.log('Screenshot loaded successfully:', imageSrc);
            this.setState({ isLoading: false, hasError: false });
        };

        img.onerror = () => {
            console.warn(`Screenshot failed to load (attempt ${this.state.retryCount + 1}):`, imageSrc);
            this.handleImageError();
        };

        // Add cache busting parameter to force fresh load
        const cacheBuster = `?t=${Date.now()}`;
        const urlWithCacheBuster = imageSrc.includes('?') 
            ? `${imageSrc}&_cb=${Date.now()}` 
            : `${imageSrc}${cacheBuster}`;
        
        img.src = urlWithCacheBuster;
    };

    handleImageError = () => {
        const { retryCount } = this.state;
        
        if (retryCount < this.maxRetries) {
            console.log(`Retrying screenshot load in ${this.retryDelay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
            setTimeout(() => {
                this.setState(prevState => ({ retryCount: prevState.retryCount + 1 }));
                this.loadImage();
            }, this.retryDelay * (retryCount + 1)); // Exponential backoff
        } else {
            console.error('Screenshot failed to load after all retries:', this.state.imageSrc);
            this.setState({ isLoading: false, hasError: true });
        }
    };

    render() {
        const { title, screenshotUrl } = this.props;
        const { isLoading, hasError } = this.state;

        if (!screenshotUrl) {
            return null;
        }

        if (hasError) {
            return (
                <div style={{ 
                    width: 310, 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    color: '#666',
                    fontSize: '12px'
                }}>
                    Screenshot unavailable
                </div>
            );
        }

        if (isLoading) {
            return (
                <div style={{ 
                    width: 310, 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    color: '#666',
                    fontSize: '12px'
                }}>
                    Loading screenshot...
                </div>
            );
        }

        return (
            <Screenshot
                style={{ width: 310 }} 
                src={this.state.imageSrc} 
                alt={title}
                onError={this.handleImageError}
            />
        );
    }
}

class AllTags extends Component {
    render() {
        const { tagClick, uniqueTags, selectedTag } = this.props;

        if (uniqueTags.length === 0) {
            return null;
        }
        const TagTitle = styled.span`
            font-weight: bold;
            color: ${variables.textColor};
            background-color: ${variables.backgroundColor};
        `;
        return (
            <div>
                <TagTitle>Tags:</TagTitle>
                <LazyComponent
                    component={Button}
                    selected={selectedTag === ''}
                    icon={<Tag className="ba bi-tag mr-2 tag-all" />}
                    key="all"
                    onClick={() => tagClick('')}
                    className="badge badge-pill m-2"
                >
                    All
                </LazyComponent>
                {uniqueTags
                    .filter((tag) => tag !== 'hidden')
                    .map((tag) => {
                        const colorClass = selectedTag === tag ? 'secondary' : 'outline-secondary';
                        return (
                            <LazyComponent
                                key={tag}
                                component={Button}
                                selected={selectedTag === tag}
                                icon={<Tag className={`ba bi-tag mr-2 tag-${tag}`} />}
                                onClick={() => tagClick(tag)}
                                variant={colorClass}
                                className="badge badge-pill m-1"
                            >
                                {tag}
                            </LazyComponent>
                        );
                    })}
            </div>
        );
    }
}

// Wrapper component to use config context with class component
const HomeWithConfig = () => {
    const { config, loading: configLoading, error: configError } = useConfig();
    
    if (configLoading) {
        return (
            <PageWrapper>
                <Title>Loading...</Title>
                <HomeHeader />
                <div>Loading configuration...</div>
            </PageWrapper>
        );
    }
    
    if (configError) {
        return (
            <PageWrapper>
                <Title>Error</Title>
                <HomeHeader />
                <div>Error loading configuration: {configError}</div>
            </PageWrapper>
        );
    }
    
    return <Home config={config} />;
};

class Home extends Component {
    handleTagClick = (tag) => {
        this.setState({ selectedTag: tag });
    };
    state = {
        uniqueTags: [],
        selectedTag: '',
        dashboardManifest: {},
        loading: true,
        error: null
    };

    async componentDidMount() {
        try {
            // Fetch dashboard manifest from API
            const response = await fetch('/api/dashboards/manifest');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Extract unique tags from dashboard data
            let tagList = [];
            Object.keys(data.dashboards).forEach((k) => {
                let dashboard = data.dashboards[k];
                dashboard.tags.forEach((tag) => {
                    tagList.push(tag);
                });
            });
            const uniqueTags = Array.from(new Set(tagList));
            
            this.setState({ 
                uniqueTags: uniqueTags,
                dashboardManifest: data.dashboards,
                loading: false
            });

            // Enable screenshots at runtime
            this.enableScreenshots();
        } catch (error) {
            console.error('Failed to load dashboard manifest:', error);
            this.setState({ 
                error: error.message,
                loading: false
            });
        }
    }

    // Method to enable screenshots at runtime
    enableScreenshots() {
        const { config } = this.props;
        // Check if screenshots should be enabled
        const shouldEnable = config?.screenshots?.enabled || false;
        
        if (shouldEnable) {
            this.setState({ screenshotsEnabled: true });
            console.log('Screenshots enabled at runtime');
        } else {
            console.log('Screenshots disabled at runtime');
        }
    }

    render() {
        const { dashboardManifest, loading, error, uniqueTags, selectedTag } = this.state;
        const { config } = this.props;
        const INSERT_SCREENSHOTS = config?.screenshots?.enabled || false;    
        console.log("INSERT_SCREENSHOTS", INSERT_SCREENSHOTS);

        // Handle loading state
        if (loading) {
            return (
                <PageWrapper>
                    <Title>{config?.title || 'Dashboards'}</Title>
                    <HomeHeader />
                    <div>Loading dashboards...</div>
                </PageWrapper>
            );
        }

        // Handle error state
        if (error) {
            return (
                <PageWrapper>
                    <Title>{config?.title || 'Dashboards'}</Title>
                    <HomeHeader />
                    <div>Error loading dashboards: {error}</div>
                </PageWrapper>
            );
        }

        const renderScreenshot = (k) => {
            if (INSERT_SCREENSHOTS && dashboardManifest[k]?.screenshotUrl) {
                const screenshotUrl = dashboardManifest[k].screenshotUrl;
                console.log(`Rendering screenshot for ${k}:`, screenshotUrl);
                
                // Test if the URL is accessible
                fetch(screenshotUrl, { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            console.log(`Screenshot URL is accessible: ${screenshotUrl}`);
                        } else {
                            console.warn(`Screenshot URL returned ${response.status}: ${screenshotUrl}`);
                        }
                    })
                    .catch(error => {
                        console.error(`Screenshot URL test failed: ${screenshotUrl}`, error);
                    });
                
                return (
                    <ClientOnly fallback={null} key={`screenshot-${k}`}>
                        <LazyComponent component={CardBody}>
                            <ScreenshotComponent 
                                title={dashboardManifest[k]?.title || "Screenshot"}
                                screenshotUrl={screenshotUrl}
                            />
                        </LazyComponent>
                    </ClientOnly>
                );
            }
            return null;
        };

        const renderTags = (k) => {
            if (uniqueTags.length > 0) {
                return (
                    <LazyComponent component={CardFooter}>
                        <TagContainer>
                            {dashboardManifest[k]['tags'].map((tag) => (
                                <LazyComponent
                                    key={tag}
                                    component={Chip}
                                    className="m-1"
                                    icon={<Tag />}
                                    style={{ width: 'max-content' }}
                                >
                                    {tag}
                                </LazyComponent>
                            ))}
                        </TagContainer>
                    </LazyComponent>
                );
            } else {
                return null;
            }
        };
        
        const renderCardTitle = (k) => {
            if (INSERT_SCREENSHOTS) {
                return (
                    <LazyComponent
                        component={CardHeader}
                        title={dashboardManifest[k]['title']}
                        subtitle={dashboardManifest[k]['description'] || ''}
                    />
                );
            } else {
                return (
                    <LazyComponent component={CardBody}>
                        <CardTitle>{dashboardManifest[k]['title']}</CardTitle>
                        <CardSubTitle>{dashboardManifest[k]['description'] || ''}</CardSubTitle>
                    </LazyComponent>
                );
            }
        };
        
        return (
            <PageWrapper>
                <Title>{config?.title || 'Dashboards'}</Title>
                <HomeHeader />
                <AllTags 
                    tagClick={this.handleTagClick} 
                    selectedTag={selectedTag} 
                    uniqueTags={uniqueTags} 
                />
                <DashWrapper>
                    <LazyComponent
                        component={CardLayout}
                        alignCards="center"
                        cardMaxWidth="370px"
                        cardMinWidth="370px"
                    >
                        {Object.keys(dashboardManifest)
                            .filter(
                                (k) =>
                                    !dashboardManifest[k].tags.includes('hidden') &&
                                    (dashboardManifest[k].tags.includes(selectedTag) || !selectedTag)
                            )
                            .map((k) => (
                                <LazyComponent
                                    key={k}
                                    component={CardDefault}
                                    minWidth="350px"
                                    to={`/${k}`}
                                >
                                    {renderCardTitle(k)}
                                    {renderScreenshot(k)}
                                    {renderTags(k)}
                                </LazyComponent>
                            ))}
                    </LazyComponent>
                </DashWrapper>
            </PageWrapper>
        );
    }
}
export default HomeWithConfig;
