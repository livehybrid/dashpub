import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Custom plugin to transform .js files with JSX before Rollup parses them
const jsxInJsPlugin = () => ({
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    // Only transform .js files in src/components that contain JSX syntax
    if (id.endsWith('.js') && id.includes('src/components') && /<[A-Za-z]/.test(code)) {
      try {
        const result = await transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
          target: 'es2015',
        });
        return {
          code: result.code,
          map: result.map || null,
        };
      } catch (error) {
        console.warn(`Failed to transform ${id}:`, error);
        return null;
      }
    }
    return null;
  },
});

// @splunk/visualizations' Map does `require('maplibre-gl/dist/maplibre-gl.css')`
// and interpolates the result into a styled-components template, so it needs
// the stylesheet as a STRING (Splunk's own build uses a raw loader). Left to
// the bundler, that require yields a module object instead; styled-components
// then walks the object, calls the first function it finds as a style rule and
// the map panel dies with "Class constructor ... cannot be invoked without
// 'new'". Hand Splunk's packages the stylesheet text instead. Our own
// `import 'maplibre-gl/dist/maplibre-gl.css'` (Dashboard.jsx) is untouched and
// still loads the stylesheet the normal way.
const MAPLIBRE_CSS = 'maplibre-gl/dist/maplibre-gl.css';
const MAPLIBRE_CSS_TEXT_ID = '\0dashpub:maplibre-css-text';
const maplibreCssAsText = () => ({
  name: 'dashpub-maplibre-css-as-text',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source === MAPLIBRE_CSS && importer && /node_modules[\\/]@splunk[\\/]/.test(importer)) {
      return MAPLIBRE_CSS_TEXT_ID;
    }
    return null;
  },
  load(id) {
    if (id === MAPLIBRE_CSS_TEXT_ID) {
      return `import css from '${MAPLIBRE_CSS}?inline';\nexport default css;\n`;
    }
    return null;
  },
});

export default defineConfig({
  plugins: [
    maplibreCssAsText(),
    // Transform .js files with JSX before React plugin
    jsxInJsPlugin(),
    react({
      // Include .jsx files (jsxInJsPlugin handles .js files)
      include: /\.jsx$/,
      jsxRuntime: 'automatic',
    }),
    nodePolyfills({
      // Whether to polyfill specific globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill `global`
      overrides: {
        // Since `fs` is not supported in browser, we can exclude it
        fs: false,
        net: false,
        tls: false,
      },
      // Whether to polyfill specific modules
      protocolImports: true,
    })
  ],
  
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: [
      'react', 'react-dom',
      '@splunk/dashboard-core',
      '@splunk/dashboard-context',
      '@splunk/dashboard-presets',
      '@splunk/dashboard-utils',
      'jspdf', 'fflate', 'react-resize-detector'
    ],
  },

  // Handle module resolution
  resolve: {
    alias: {
      // Vite handles CSS imports natively, no need to mock maplibre-gl CSS
    },
    // Force CommonJS resolution for problematic packages
    mainFields: ['module', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },

  // Build configuration
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {},
    // Ensure all dependencies are bundled
    modulePreload: false,
    // Handle dynamic imports properly
    dynamicImportVarsOptions: {
      warnOnError: false
    }
  },

  // Server configuration
  server: {
    port: 5173,
    host: true,
    open: false,
    proxy: {
      // Proxy API calls to the Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  // CSS configuration
  css: {
    modules: false,
    preprocessorOptions: {
      css: {
        // Handle CSS imports that might fail
        additionalData: ''
      }
    }
  },

  // Global definitions
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.version': '"v16.0.0"',
    'process.platform': '"browser"',
    'process.browser': true,
    'process.node': false
  }
});
