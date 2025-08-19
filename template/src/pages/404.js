import React from 'react';
import Page from '../components/page';

export default function Custom404() {
    return React.createElement(Page, {
        title: "Page Not Found",
        theme: "light",
        baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    },
        React.createElement('div', {
            style: { 
                textAlign: 'center', 
                padding: '2rem',
                maxWidth: '600px',
                margin: '0 auto'
            }
        },
            React.createElement('h1', null, "404 - Page Not Found"),
            React.createElement('p', null, "The page you're looking for doesn't exist."),
            React.createElement('p', null, "If you're trying to access a Splunk dashboard, please check the URL and try again."),
            React.createElement('a', {
                href: "/",
                style: { 
                    display: 'inline-block',
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0073aa',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                }
            }, "Go to Home")
        )
    );
}
