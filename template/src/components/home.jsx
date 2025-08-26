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
import dashboardManifest from '../_dashboards.json';
import getScreenshotUrl from './getScreenshotUrl';
import { Tag } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.css';
import HomeHeader from "./home_header";
import ClientOnly from './ClientOnly';

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
    margin: 5%;
    text-align: center;
    background-color: ${variables.backgroundColor};
`;
const DashWrapper = styled.div``;

const Screenshot = styled.img`
    width: 330px;
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

class Home extends Component {
    handleTagClick = (tag) => {
        this.setState({ selectedTag: tag });
    };
    state = {
        uniqueTags: [],
        selectedTag: '',
    };

    componentDidMount() {
        let tagList = [];
        Object.keys(dashboardManifest).forEach((k) => {
            let dashboard = dashboardManifest[k];
            dashboard.tags.forEach((tag) => {
                tagList.push(tag);
            });
        });
        const uniqueTags = Array.from(new Set(tagList));
        this.setState({ uniqueTags: uniqueTags });
    }

    render() {
        const INSERT_SCREENSHOTS = process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTS || false;                
        const renderScreenshot = (k) => {
            if (INSERT_SCREENSHOTS) {
                return (
                    <ClientOnly fallback={null} key={`screenshot-${k}`}>
                        <LazyComponent component={CardBody}>
                            <Screenshot
                                style={{ width: 330 }} 
                                src={getScreenshotUrl(k)} 
                                alt={dashboardManifest[k]?.title || "Screenshot"}
                            />
                        </LazyComponent>
                    </ClientOnly>
                );
            }
            return null;
        };

        const renderTags = (k) => {
            if (this.state.uniqueTags.length > 0) {
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
                <Title>{process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'}</Title>
                <HomeHeader />
                <AllTags 
                    tagClick={this.handleTagClick} 
                    selectedTag={this.state.selectedTag} 
                    uniqueTags={this.state.uniqueTags} 
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
                                    (dashboardManifest[k].tags.includes(this.state.selectedTag) || !this.state.selectedTag)
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
export default Home;
