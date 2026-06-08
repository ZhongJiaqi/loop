import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Loop',
          short_name: 'Loop',
          description: 'Thoughts create feelings. Feelings drive actions. Actions shape you.',
          theme_color: '#F5F2EC',
          background_color: '#F5F2EC',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          importScripts: ['/push-handler.js'],
          // 让新 SW 一旦 install 完成就立即跳过 waiting + 接管所有 client。
          // 跟 registerType: 'autoUpdate' 配套，避免新 SW 长期停在 waiting
          // 等到所有 tab 关闭。iOS PWA 上「关闭所有 tab」几乎不会发生，
          // 不开这两个会让用户长期跑在旧 SW 上，且新 SW 一直 install/waiting，
          // navigator.serviceWorker.ready 容易陷入 W3C ServiceWorker issue #357
          // 描述的 race（ready promise 锁在 outdated registration 上）。
          skipWaiting: true,
          clientsClaim: true,
          // Firebase Auth OAuth handler 反代路径，必须直通到 Vercel rewrite，禁止 SW 拦截 + 替换为 SPA index.html
          navigateFallbackDenylist: [/^\/__\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase SDK — large, stable, benefits most from long-term caching
            if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
              return 'vendor-firebase';
            }
            // Motion / framer-motion and their sub-packages
            if (
              id.includes('/node_modules/motion/') ||
              id.includes('/node_modules/motion-dom/') ||
              id.includes('/node_modules/motion-utils/') ||
              id.includes('/node_modules/framer-motion/')
            ) {
              return 'vendor-motion';
            }
            // date-fns
            if (id.includes('/node_modules/date-fns/')) {
              return 'vendor-date-fns';
            }
            // lucide-react icon set
            if (id.includes('/node_modules/lucide-react/')) {
              return 'vendor-lucide';
            }
            // canvas-confetti — only loaded with TodayView, modest size but worth isolating
            if (id.includes('/node_modules/canvas-confetti/')) {
              return 'vendor-confetti';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      exclude: ['tests/e2e/**', 'node_modules/**', 'functions/**'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
