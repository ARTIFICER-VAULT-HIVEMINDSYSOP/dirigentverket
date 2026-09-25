import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { installNodeRequestPatch } from './src/server/install-node-request-patch'

installNodeRequestPatch()

export default defineConfig({
  server: {
    port: 3017,
    host: true,
  },
  plugins: [
    tanstackStart(),
    nitro({
      config: {
        plugins: ['./src/server/patch-node-request.ts'],
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
})
