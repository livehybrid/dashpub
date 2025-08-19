// pages/_app.js
import React, { useEffect } from 'react';
// Import polyfills to fix maplibre-gl script property errors
import '../polyfills';

// Import maplibre-gl CSS - this is needed for the map components
try {
  require('maplibre-gl/dist/maplibre-gl.css');
} catch (error) {
  console.warn('Could not load maplibre-gl CSS:', error.message);
}

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Additional client-side CSS loading if needed
    if (typeof window !== 'undefined') {
      try {
        require('maplibre-gl/dist/maplibre-gl.css');
      } catch (err) {
        console.warn('Could not load maplibre-gl CSS on client:', err.message);
      }
    }
  }, []);

  return React.createElement(Component, pageProps);
}

export default MyApp;
