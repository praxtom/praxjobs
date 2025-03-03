import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [
        nodePolyfills({
            // Explicitly include node built-in modules
            include: [
                'crypto', 
                'path', 
                'fs', 
                'stream', 
                'util',
                'events'
            ],
            protocolImports: true,
        })
    ],
    resolve: {
        alias: {
            // Provide aliases for common node modules
            'node:crypto': 'crypto-browserify',
            'node:path': 'path-browserify',
            'node:fs': 'browserify-fs',
            'node:stream': 'stream-browserify',
            'node:util': 'util',
            'node:events': 'events',
            
            // Resolve Firebase imports
            'firebase/app': resolve(__dirname, 'node_modules/firebase/app/dist/esm/index.js'),
            'firebase/auth': resolve(__dirname, 'node_modules/firebase/auth/dist/esm/index.js'),
            
            // Fallback for node_modules resolution
            '~': resolve(__dirname, 'node_modules')
        },
        // Add support for importing .mjs files
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },
    optimizeDeps: {
        // Explicitly include problematic dependencies
        include: [
            'firebase-admin', 
            'crypto-browserify', 
            'path-browserify', 
            'browserify-fs',
            'events',
            'firebase/app',
            'firebase/auth'
        ],
        // Exclude known ESM-only or problematic modules
        exclude: ['node:fs']
    },
    define: {
        // Provide global polyfills
        'global': {},
        'process.env': process.env,
        'process.browser': true
    },
    ssr: {
        // Ensure no external modules cause issues
        noExternal: [
            'firebase', 
            'firebase-admin'
        ]
    },
    // Add explicit Node.js module compatibility
    esbuild: {
        target: 'es2020'
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        lib: {
            entry: 'src/index.js',
            formats: ['esm']
        }
    }
});
