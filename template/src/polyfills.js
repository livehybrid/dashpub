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

export const polyfillTextDecoder = () => {
    if (typeof window !== 'undefined' && typeof window.TextDecoder !== 'function') {
        return import('fast-text-encoding');
    } else {
        return Promise.resolve();
    }
};

// Polyfills for compatibility issues

// Fix maplibre-gl script property error
if (typeof window !== 'undefined') {
  // Polyfill for Canadian_Aboriginal script property
  if (!window.Intl || !window.Intl.Segmenter) {
    // Create a basic polyfill for script property
    window.Intl = window.Intl || {};
    window.Intl.Segmenter = window.Intl.Segmenter || function() {
      return {
        segment: function(input) {
          return [input];
        }
      };
    };
  }
  
  // Fix for maplibre-gl script property validation
  if (window.Intl && window.Intl.Segmenter) {
    const originalSegmenter = window.Intl.Segmenter;
    window.Intl.Segmenter = function(locale, options) {
      try {
        return new originalSegmenter(locale, options);
      } catch (error) {
        // If there's a script property error, return a fallback
        if (error.message.includes('Canadian_Aboriginal')) {
          console.warn('Using fallback segmenter due to script property issue');
          return {
            segment: function(input) {
              return [input];
            }
          };
        }
        throw error;
      }
    };
  }
}

// Polyfills for Node.js modules that don't exist in the browser
if (typeof window !== 'undefined') {
  // Polyfill for util.deprecate
  if (!window.util) {
    window.util = {
      deprecate: (fn, message) => fn
    };
  }
}
