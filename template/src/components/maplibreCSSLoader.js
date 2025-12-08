import React, { useEffect } from 'react';

// Component to dynamically load maplibre-gl CSS
export default function MaplibreCSSLoader() {
  useEffect(() => {
    // Dynamically load maplibre-gl CSS on client side
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/node_modules/maplibre-gl/dist/maplibre-gl.css';
    link.onerror = () => {
      console.warn('Could not load maplibre-gl CSS from node_modules, trying CDN fallback');
      // Fallback to CDN if local file not found
      const cdnLink = document.createElement('link');
      cdnLink.rel = 'stylesheet';
      cdnLink.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css';
      document.head.appendChild(cdnLink);
    };
    document.head.appendChild(link);
    
    return () => {
      // Cleanup on unmount
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}
