import React from 'react';

// Disable static generation to prevent prerendering issues
export const getStaticProps = async () => {
    return {
        props: {},
        // Disable static generation
        revalidate: false,
    };
};

// Simple 404 page without complex dependencies to avoid prerendering issues
export default function Custom404() {
    return React.createElement('div', {
        style: { 
            textAlign: 'center', 
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
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
    );
}
