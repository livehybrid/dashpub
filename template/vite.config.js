import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCommonjs from 'vite-plugin-commonjs';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Custom plugin to handle problematic CSS imports
const cssMockPlugin = () => ({
  name: 'css-mock',
  resolveId(id) {
    if (id.endsWith('.css') && id.includes('maplibre-gl')) {
      return id; // Return the id to mark it as resolved
    }
    return null;
  },
  load(id) {
    if (id.endsWith('.css') && id.includes('maplibre-gl')) {
      return '/* Mock CSS file for maplibre-gl */'; // Return empty CSS comment
    }
    return null;
  }
});

export default defineConfig({
  plugins: [
    react(),
    viteCommonjs({
      // Handle CommonJS packages that don't work well with Vite
      include: [
        '@splunk/**',
        'jspdf',
        'fflate',
        'react-resize-detector',
        'tinyglobby'
      ],
      // Force CommonJS transformation for problematic packages
      transformMixedEsModules: true,
      // Handle specific problematic packages
      requireReturnsDefault: 'auto'
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
    }),
    cssMockPlugin()
  ],
  
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: [
      'react', 'react-dom', 
      '@splunk/dashboard-core', 
      '@splunk/dashboard-context',
      '@splunk/dashboard-presets', 
      '@splunk/dashboard-utils',
      'maplibre-gl', 'jspdf', 'fflate', 'react-resize-detector'
    ],
    exclude: [
      // No packages to exclude
    ],
    esbuildOptions: {
      // Node.js global to browser global mapping
      define: {
        global: 'globalThis'
      }
    }
  },

  // Handle module resolution
  resolve: {
    alias: {
      // Mock maplibre-gl CSS import to prevent module loading issues
      'maplibre-gl/dist/maplibre-gl.css': path.resolve(__dirname, 'src/maplibre-css-mock.js'),

    },
    // Force CommonJS resolution for problematic packages
    mainFields: ['module', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },

  // Build configuration
  build: {
    target: 'es2015',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      plugins: [
        {
          name: 'css-import-resolver',
          resolveId(id) {
            if (id.endsWith('.css') && id.includes('maplibre-gl')) {
              return id;
            }
            return null;
          },
          load(id) {
            if (id.endsWith('.css') && id.includes('maplibre-gl')) {
              return '/* Mock CSS file for maplibre-gl */';
            }
            return null;
          }
        }
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          splunk: ['@splunk/dashboard-core', '@splunk/dashboard-context']
        }
      }
    },
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
