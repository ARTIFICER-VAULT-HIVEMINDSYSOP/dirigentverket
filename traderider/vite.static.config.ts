import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { normalizeBasePath } from './src/lib/staticBase'

function renameStaticHtml(): Plugin {
  let outDir = resolve('dist-static')
  return {
    name: 'rename-static-html',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const from = resolve(outDir, 'static.html')
      const to = resolve(outDir, 'index.html')
      if (existsSync(from) && !existsSync(to)) renameSync(from, to)
    },
  }
}

export default defineConfig({
  base: normalizeBasePath(process.env.TRADERIDER_BASE),
  plugins: [viteReact(), tailwindcss(), renameStaticHtml()],
  build: {
    outDir: 'dist-static',
    emptyOutDir: true,
    rollupOptions: {
      input: 'static.html',
    },
  },
  preview: {
    port: 3019,
    host: true,
  },
})
