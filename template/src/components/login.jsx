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
import { useNavigate, useLocation } from 'react-router-dom';

import User from '@splunk/react-icons/enterprise/User';
import Key from '@splunk/react-icons/Key';

import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Button from '@splunk/react-ui/Button';
import Card from '@splunk/react-ui/Card';
import Heading from '@splunk/react-ui/Heading';
import Message from '@splunk/react-ui/Message';

import 'bootstrap/dist/css/bootstrap.css';

const PageWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoginCard = styled(Card)`
    width: 100%;
    max-width: 400px;
    padding: 40px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    background: white;
`;

const LoginForm = styled.form`
    width: 100%;
`;

const Title = styled(Heading)`
    text-align: center;
    margin-bottom: 8px;
    color: ${variables.textColor};
`;

const SubTitle = styled(Heading)`
    text-align: center;
    margin-bottom: 32px;
    color: ${variables.textColorSecondary};
    font-weight: 400;
`;

const ErrorMessage = styled(Message)`
    margin-bottom: 24px;
`;

const ButtonWrapper = styled.div`
    margin-top: 32px;
    text-align: center;
`;

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    padding: 0 8px;
    color: ${variables.textColorSecondary};
`;

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            error: null
        };
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;

        this.setState({ isLoading: true, error: null });

        try {
            console.log('Attempting login for user:', username);
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            console.log('Login response status:', response.status);

            if (response.ok) {
                // Login successful, redirect to return URL or home
                const queryParams = new URLSearchParams(window.location.search);
                const redirectUrl = queryParams.get('returnTo') || '/';
                
                console.log('Login successful, redirecting to:', redirectUrl);
                console.log('Cookies after login:', document.cookie);
                
                // Small delay to ensure cookie is set
                setTimeout(() => {
                    console.log('Redirecting now, cookies:', document.cookie);
                    window.location.href = redirectUrl;
                }, 100);
            } else {
                const errorData = await response.json();
                this.setState({ 
                    error: errorData.message || 'Login failed',
                    isLoading: false 
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            this.setState({ 
                error: 'Network error. Please try again.',
                isLoading: false 
            });
        }
    };

    render() {
        const { isLoading, error } = this.state;
        const { config } = this.props;

        return (
            <PageWrapper>
                <LoginCard>
                    <Title level={1}>
                        {config?.title || 'Dashboards'}
                    </Title>
                    <SubTitle level={2}>Sign In</SubTitle>
                    
                    {error && (
                        <ErrorMessage
                            type="error"
                            icon="alert-circle"
                        >
                            {error}
                        </ErrorMessage>
                    )}
                    
                    <LoginForm onSubmit={this.handleSubmit}>
                        <ControlGroup 
                            label="Username" 
                            labelPosition="top"
                            help="Enter your username"
                        >
                            <Text
                                name="username"
                                defaultValue=""
                                startAdornment={
                                    <IconWrapper>
                                        <User size={1} />
                                    </IconWrapper>
                                }
                                inline={true}
                                placeholder="Enter username"
                                disabled={isLoading}
                                appearance="filled"
                            />
                        </ControlGroup>
                        
                        <ControlGroup 
                            label="Password" 
                            labelPosition="top"
                            help="Enter your password"
                        >
                            <Text
                                name="password"
                                inline={true}
                                type="password"
                                placeholder="Enter password"
                                startAdornment={
                                    <IconWrapper>
                                        <Key size={1} />
                                    </IconWrapper>
                                }
                                disabled={isLoading}
                                appearance="filled"
                            />
                        </ControlGroup>
                        
                        <ButtonWrapper>
                            <Button 
                                label={isLoading ? "Signing in..." : "Sign In"} 
                                appearance="primary" 
                                type="submit"
                                disabled={isLoading}
                                size="large"
                                style={{ minWidth: '120px' }}
                            />
                        </ButtonWrapper>
                    </LoginForm>
                </LoginCard>
            </PageWrapper>
        );
    }
}
export default Login;
