import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only cache the shared profile route pattern
      workbox: {
        navigateFallback: null,
        // Cache the shared profile page shell and static assets only.
        //
        // IMPORTANT: Supabase REST/RPC responses (children, personal_info,
        // profile_entries, get_shared_profile) are deliberately NOT cached
        // here. Caching them would persist a child's medical/behavioral
        // data in Cache Storage on whatever device viewed the shared page —
        // including shared/public devices (a classroom computer, a hospital
        // kiosk) — for as long as the cache entry lives, and that cache
        // would keep serving data even after a parent disables sharing or
        // updates a field (e.g. a corrected medication dose). Workbox only
        // caches GET requests by default, and get_shared_profile is called
        // via POST, so this mostly self-excludes anyway — but the rule
        // below made the intent explicit when this was GET-based, so it's
        // removed rather than left as a false sense of caching.
        runtimeCaching: [
          {
            // Match /s/<token> URLs — short NetworkFirst cache so the page
            // shell still loads if the network briefly drops, but a parent
            // revoking sharing or a browser reload always prefers a fresh
            // fetch over serving a long-lived stale copy.
            urlPattern: ({ url }) => url.pathname.startsWith('/s/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'shared-profiles',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes — shell only, not the data itself
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static assets — cache first
            urlPattern: /\.(?:js|css|woff2?|png|jpg|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Myndigo',
        short_name: 'Myndigo',
        description: 'Child profile sharing for ASD families',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
