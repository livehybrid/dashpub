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

import User from '@splunk/react-icons/enterprise/User';
import Key from '@splunk/react-icons/Key';

import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Button from '@splunk/react-ui/Button';

import 'bootstrap/dist/css/bootstrap.css';

const PageWrapper = styled.div`
    margin: 5%;
    text-align: center;
`;

const LoginForm = styled.form`
    margin: 20px 25%;
    width: 50%;
`;

const Title = styled.h1`
    color: ${variables.textColor};
`;
const SubTitle = styled.h2`
    color: ${variables.textColor};
`;

class Login extends Component {

    render() {
        const handleSubmit = async (event) => {
            event.preventDefault();
            const username = event.target.username.value;
            const password = event.target.password.value;

            const queryParams = new URLSearchParams(window.location.search);
            const redirectUrl = queryParams.get('returnTo'); // Assuming 'redirectUrl' is your query parameter
            // Send the credentials to your API route
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                // Redirect on successful login
                window.location.href = redirectUrl;
            } else {
                // Handle errors, e.g., display an alert
                alert('Login failed. Please check your credentials.');
            }
        };

        return React.createElement(PageWrapper, null,
            React.createElement(Title, null, process.env.NEXT_PUBLIC_DASHPUBTITLE || 'Dashboards'),
            React.createElement(SubTitle, null, "Login"),
            React.createElement(LoginForm, { onSubmit: handleSubmit },
                React.createElement(ControlGroup, { label: "Username" },
                    React.createElement(Text, {
                        name: "username",
                        defaultValue: "",
                        startAdornment: React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', padding: '0 8px' }
                        }, React.createElement(User, { size: 1 })),
                        inline: true,
                        placeholder: "Username"
                    })
                ),
                React.createElement(ControlGroup, { label: "Password" },
                    React.createElement(Text, {
                        name: "password",
                        inline: true,
                        type: "password",
                        onChange: this.handleChange,
                        placeholder: "*******",
                        startAdornment: React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', padding: '0 8px' }
                        }, React.createElement(Key, { size: 1 }))
                    })
                ),
                React.createElement('br', null),
                React.createElement('br', null),
                React.createElement(Button, { 
                    label: "Login >", 
                    appearance: "primary", 
                    type: "submit" 
                })
            )
        );
    }
}
export default Login;
