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

import React, { Component } from 'react';
import styled from 'styled-components';
import { variables } from '@splunk/themes';
import dashboardManifest from '../_dashboards.json';
//import {Tag} from '@styled-icons/bootstrap';
import { Tag } from 'react-bootstrap-icons';

import Message from '@splunk/react-ui/Message';
import Paragraph from '@splunk/react-ui/Paragraph';
import Divider from '@splunk/react-ui/Divider';
import Link from '@splunk/react-ui/Link';

import dynamic from 'next/dynamic';
//import {CardLayout, Card, Chip, Button} from '../utils/react-ui';
import 'bootstrap/dist/css/bootstrap.css';

export const CardLayout = dynamic(() => import('@splunk/react-ui/CardLayout'), { ssr: false });

export const CardDefault = dynamic(() => import('@splunk/react-ui/Card'), { ssr: false });

export const CardHeader = dynamic(() => import('@splunk/react-ui/Card').then((lib) => lib.Header), { ssr: false });

export const CardBody = dynamic(() => import('@splunk/react-ui/Card').then((lib) => lib.Body), { ssr: false });

export const CardFooter = dynamic(() => import('@splunk/react-ui/Card').then((lib) => lib.Footer), { ssr: false });

CardDefault.Header = CardHeader;
CardDefault.Body = CardBody;
CardDefault.Footer = CardFooter;
export const Card = CardDefault;

export const Chip = dynamic(() => import('@splunk/react-ui/Chip'), { ssr: false });

export const Button = dynamic(() => import('@splunk/react-ui/Button'), { ssr: false });


const PageWrapper = styled.div`
    margin: 5%;
    text-align: center;
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
        `;
        return (
            <div>
                <TagTitle>Tags:</TagTitle>
                <Button
                    selected={selectedTag === ''}
                    icon={<Tag className={`ba bi-tag mr-2 tag-all`} />}
                    key={'all'}
                    onClick={() => tagClick('')}
                    className={'badge badge-pill m-2'}
                >
                    All
                </Button>
                {uniqueTags
                    .filter((tag) => tag !== 'hidden')
                    .map((tag) => {
                        const colorClass = selectedTag === tag ? 'secondary' : 'outline-secondary';
                        return (
                            <Button
                                selected={selectedTag === tag}
                                icon={<Tag className={`ba bi-tag mr-2 tag-{tag}`} />}
                                key={tag}
                                onClick={() => tagClick(tag)}
                                variant={colorClass}
                                className={'badge badge-pill'}
                            >
                                {tag}
                            </Button>
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
                    <Card.Body>
                        <Screenshot style={{ width: 330 }} src={`/screenshots/${k}.jpg`} alt={dashboardManifest[k]['title']} />
                    </Card.Body>
                );
            }
        };

        const renderTags = (k) => {
            if (this.state.uniqueTags.length > 0) {
                return (
                    <Card.Footer>
                        <TagContainer>
                            {dashboardManifest[k]['tags'].map((tag) => (
                                <Chip className="m-1" key={tag} icon={<Tag />}>
                                    {tag}
                                </Chip>
                            ))}
                        </TagContainer>
                    </Card.Footer>
                );
            } else {
                return null;
            }
        };
        const renderCardTitle = (k) => {
            if (INSERT_SCREENSHOTS) {
                return <Card.Header title={dashboardManifest[k]['title']} subtitle={dashboardManifest[k]['description']} />;
            } else {
                return (
                    <Card.Body>
                        <CardTitle>{dashboardManifest[k]['title']}</CardTitle>
                        <CardSubTitle>{dashboardManifest[k]['description']}</CardSubTitle>
                    </Card.Body>
                );
            }
        };
        return (
            <PageWrapper>
                <Title>{process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'}</Title>
                <Message appearance="fill" type="info">
                <Paragraph>
                    Want to publish your own dashboards? Its easy! Check out the Dashpub-plus repo for more information at <Link to="https://github.com/livehybrid/dashpub-plus">https://github.com/livehybrid/dashpub-plus</Link>
                </Paragraph>
                <Paragraph>
                    Check out some of the other dashpub deployments out in the wild: <br />
                    <ul>
                    <li><Link to="https://monitoring.splunk.digital.nhs.uk/public/bov_overview">NHS Digital - Public Overview</Link></li>
                    <li><Link to="https://home.splunk.engineer">Splunked Home - Find them in the source=*Pavilion</Link></li>
                    <li><Link to="https://santa.splunk.engineer">Santa Tracker</Link></li>
                    </ul>
                    <br />
                    Need help? Get in touch via email at <Link to="mailto:dashpub@livehybrid.com">dashpub@livehybrid.com</Link>
                </Paragraph>
            </Message>
                <AllTags tagClick={this.handleTagClick} selectedTag={this.state.selectedTag} uniqueTags={this.state.uniqueTags} />
                <DashWrapper>
                    <CardLayout alignCards="center" cardMaxWidth="370px" cardMinWidth="370px">
                        {Object.keys(dashboardManifest)
                            .filter(
                                (k) =>
                                    !dashboardManifest[k].tags.includes('hidden') &&
                                    (dashboardManifest[k].tags.includes(this.state.selectedTag) || !this.state.selectedTag)
                            )
                            .map((k) => (
                                <Card minWidth="350px" key={k} to={`/${k}`}>
                                    {renderCardTitle(k)}
                                    {renderScreenshot(k)}
                                    {renderTags(k)}
                                </Card>
                            ))}
                    </CardLayout>
                </DashWrapper>
            </PageWrapper>
        );
    }
}
export default Home;
