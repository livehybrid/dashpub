// pages/_app.js
import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

function MyApp({ Component, pageProps }) {
  return React.createElement(Component, pageProps);
}

export default MyApp;
