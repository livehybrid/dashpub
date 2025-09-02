import './polyfills.js';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SplunkThemeProvider, variables } from '@splunk/themes';
import App from './App.jsx';
import './index.css';
import getTheme from '@splunk/themes/getTheme';


function AppWithTheme() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error('Error fetching config:', err);
        // Fallback to default config
        setConfig({ theme: 'light' });
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Apply background color directly to html and body elements
  useEffect(() => {
    const applyBackgroundColor = () => {
      const baseTheme = getTheme({family: 'enterprise', colorScheme: config?.theme || 'light', density: 'compact' });
      const backgroundColor = `${baseTheme.backgroundColorPage}`;
      
      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.minHeight = '100vh';
      document.body.style.minHeight = '100vh';
    };

    applyBackgroundColor();
  }, [config]);

  if (loading) {
    // Show loading with default theme
    return (
      <SplunkThemeProvider family="enterprise" colorScheme="light" density="comfortable">
        <div>Loading...</div>
      </SplunkThemeProvider>
    );
  }

  return (
    <SplunkThemeProvider family="enterprise" colorScheme={config?.theme || 'light'} density="comfortable">
      <App />
    </SplunkThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <AppWithTheme />
  // </React.StrictMode>
);
