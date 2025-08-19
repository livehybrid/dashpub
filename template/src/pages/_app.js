// pages/_app.js
import React from 'react';
// Import polyfills to fix maplibre-gl script property errors
import '../polyfills';

// Import the CSS loader component instead of direct CSS import
import MaplibreCSSLoader from '../components/maplibreCSSLoader';

function MyApp({ Component, pageProps }) {
  return React.createElement(React.Fragment, null,
    React.createElement(MaplibreCSSLoader, null),
    React.createElement(Component, pageProps)
  );
}

export default MyApp;
