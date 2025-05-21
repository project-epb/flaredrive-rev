/// <reference types="vite/client" />

import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { cloudflare } from '@cloudflare/vite-plugin'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import VueRouter from 'unplugin-vue-router/vite'
import UnoCSS from 'unocss/vite'

const IS_PROD = process.env.NODE_ENV === 'production' && process.env.BUILD_ENV !== 'development'

export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: 'frontend/pages',
      dts: 'frontend/typed-router.d.ts',
    }),
    Vue(),
    VueJsx(),
    AutoImport({
      dts: 'frontend/auto-imports.d.ts',
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      vueTemplate: true,
      vueDirectives: true,
      dirs: ['frontend/composables', 'frontend/stores', 'frontend/utils', 'common/'],
    }),
    Components({
      dts: 'frontend/components.d.ts',
      dirs: ['frontend/components'],
      directoryAsNamespace: true,
      collapseSamePrefixes: true,
      resolvers: [NaiveUiResolver()],
    }),
    UnoCSS({}),
    cloudflare(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  esbuild: {
    drop: IS_PROD ? ['console'] : [],
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'frontend'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5880,
    cors: true,
  },
})
