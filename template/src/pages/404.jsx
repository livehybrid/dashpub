import React from 'react';

// Simple 404 page without complex dependencies
export default function Custom404() {
    return (
        <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <p>If you're trying to access a Splunk dashboard, please check the URL and try again.</p>
            <a
                href="/"
                style={{ 
                    display: 'inline-block',
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0073aa',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                }}
            >
                Go to Home
            </a>
        </div>
    );
}
