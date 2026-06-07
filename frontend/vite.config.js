import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-*.png'],
            manifest: {
                name: 'SmartEd Africa',
                short_name: 'SmartEd',
                description: 'AI-powered exam prep for WAEC, JAMB, NECO, GCE, NCE — works offline',
                theme_color: '#16a34a',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'any',
                start_url: '/',
                scope: '/',
                icons: [
                    { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                categories: ['education'],
                lang: 'en',
            },
            workbox: {
                // Cache strategies
                runtimeCaching: [
                    {
                        // API responses — network-first, fall back to cache
                        urlPattern: /^https?:\/\/.*\/api\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                            networkTimeoutSeconds: 10,
                        },
                    },
                    {
                        // AI service — network only (no caching for AI responses)
                        urlPattern: /^https?:\/\/.*\/ask/,
                        handler: 'NetworkOnly',
                    },
                    {
                        // Images — cache-first
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images-cache',
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                    {
                        // Fonts — cache-first
                        urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'fonts-cache',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                        },
                    },
                ],
                // Pre-cache app shell
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
            },
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    ui: ['lucide-react'],
                    store: ['zustand'],
                    charts: ['recharts'],
                    sentry: ['@sentry/react'],
                },
            },
        },
        target: 'esnext',
        sourcemap: false,
        chunkSizeWarningLimit: 500,
    },
    server: {
        port: 5173,
        strictPort: false,
    },
});
