// pages/_app.js
import React from 'react';
// Import polyfills to fix maplibre-gl script property errors
import '../polyfills';
// Removed problematic maplibre-gl CSS import that causes script property errors
// import 'maplibre-gl/dist/maplibre-gl.css';

function MyApp({ Component, pageProps }) {
  return React.createElement(Component, pageProps);
}

export default MyApp;
