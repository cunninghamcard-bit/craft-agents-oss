import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// NOTE: Source map upload to Sentry is intentionally disabled.
// To re-enable, uncomment the sentryVitePlugin below and add SENTRY_AUTH_TOKEN,
// SENTRY_ORG, SENTRY_PROJECT to CI secrets. See CLAUDE.md "Sentry Error Tracking" section.
// import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  experimental: {
    rolldownBundler: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          // Jotai HMR support: caches atom instances in globalThis.jotaiAtomCache
          // so that HMR module re-execution returns stable atom references
          // instead of creating new (empty) atoms that orphan existing data.
          'jotai/babel/plugin-debug-label',
          ['jotai/babel/plugin-react-refresh', { customAtomNames: ['atomFamily'] }],
        ],
      },
    }),
    tailwindcss(),
    // Sentry source map upload — intentionally disabled. See CLAUDE.md for re-enabling instructions.
    // sentryVitePlugin({
    //   org: process.env.SENTRY_ORG,
    //   project: process.env.SENTRY_PROJECT,
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    //   disable: !process.env.SENTRY_AUTH_TOKEN,
    //   sourcemaps: {
    //     filesToDeleteAfterUpload: ['**/*.map'],
    //   },
    // }),
  ],
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyDirBeforeWrite: true,
    emptyOutDir: true,
    sourcemap: true,  // Source maps generated for debugging. Not uploaded to Sentry (see CLAUDE.md).
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
        playground: resolve(__dirname, 'src/renderer/playground.html'),
        'browser-toolbar': resolve(__dirname, 'src/renderer/browser-toolbar.html'),
        'browser-empty-state': resolve(__dirname, 'src/renderer/browser-empty-state.html'),
      },
      external: ['electron', /^electron\//, 'electron-log'],
      onwarn(warning, warn) {
        // Suppress Node.js builtin externalization warnings for dependencies that
        // resolve to Node-only codepaths (electron-log main entry, etc.).
        // These are safe in Electron renderer but Rolldown still warns during resolution.
        if (warning.message?.includes('has been externalized for browser compatibility')) return
        // Suppress direct-eval warnings from third-party dependencies
        if (warning.code === 'EVAL') return
        warn(warning)
      },
    }
  },
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src/renderer') },
      { find: '@config', replacement: resolve(__dirname, '../../packages/shared/src/config') },
      // Force all React imports to use the root node_modules React
      // Bun hoists deps to root. This prevents "multiple React copies" error from @craft-agent/ui
      { find: 'react', replacement: resolve(__dirname, '../../node_modules/react') },
      { find: 'react-dom', replacement: resolve(__dirname, '../../node_modules/react-dom') },
      // Redirect electron-log main entry to renderer entry to avoid Node builtin warnings
      { find: /^electron-log$/, replacement: resolve(__dirname, '../../node_modules/electron-log/src/renderer/index.js') },
    ],
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'jotai', 'pdfjs-dist'],
    exclude: ['@craft-agent/ui'],
    rolldownOptions: {
      target: 'esnext'
    }
  },
  server: {
    port: 5173,
    open: false
  }
})
