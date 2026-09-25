import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { normalizeBasePath } from './src/lib/staticBase'

function renameStaticHtml(): Plugin {
  return {
    name: 'rename-static-html',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('static.html')) {
          file.fileName = file.fileName.replace(/static\.html$/, 'index.html')
        }
      }
    },
    closeBundle() {
      const from = resolve('dist-static/static.html')
      const to = resolve('dist-static/index.html')
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
