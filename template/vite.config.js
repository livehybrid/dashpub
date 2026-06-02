import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { localeFromEnv, applyLocaleToHtml } from './scripts/htmlLocale.mjs';

// Overwrite the dashboard display locale in index.html when DASHPUB_LOCALE is set
// (e.g. DASHPUB_LOCALE=en-GB for 24h time). Runs at dev + build/CLI time. When
// unset, the default baked into index.html is kept.
const dashpubLocalePlugin = () => ({
  name: 'dashpub-html-locale',
  transformIndexHtml(html) {
    const loc = localeFromEnv();
    if (loc) console.log(`[dashpub] DASHPUB_LOCALE set — index.html locale -> ${loc}`);
    return applyLocaleToHtml(html, loc);
  },
});

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

export default defineConfig({
  plugins: [
    // Overwrite index.html display locale from DASHPUB_LOCALE (if set)
    dashpubLocalePlugin(),
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
