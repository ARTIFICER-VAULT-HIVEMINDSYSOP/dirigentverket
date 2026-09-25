import { copyFileSync, existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { normalizeBasePath } from './src/lib/staticBase'

const tryPack = process.env.TRADERIDER_TRY === '1'

function renameStaticHtml(): Plugin {
  let outDir = resolve(tryPack ? 'dist-try' : 'dist-static')
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
      if (tryPack && existsSync(to)) {
        copyFileSync(resolve('try/README.txt'), resolve(outDir, 'README.txt'))
      }
    },
  }
}

/** One HTML file. Chrome and Edge block external module scripts on file://. */
function inlineTryBundle(): Plugin {
  return {
    name: 'traderider-inline-try',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlKey = Object.keys(bundle).find((name) => name.endsWith('.html'))
      if (!htmlKey) return
      const htmlFile = bundle[htmlKey]
      if (htmlFile.type !== 'asset') return
      let html = typeof htmlFile.source === 'string' ? htmlFile.source : new TextDecoder().decode(htmlFile.source)

      const bundleKey = (url: string) => url.replace(/^\.\//, '').replace(/^\//, '')

      html = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g, '')
      html = html.replace(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)>\s*<\/script>/gi, (full, before: string, src: string, after: string) => {
        const attrs = `${before} ${after}`
        if (!/\btype="module"/.test(attrs) && !/\bmodule\b/.test(full)) return full
        const chunk = bundle[bundleKey(src)]
        if (!chunk || chunk.type !== 'chunk') return full
        const code = chunk.code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
        delete bundle[chunk.fileName]
        return `<script type="module">${code}</script>`
      })
      html = html.replace(/<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/gi, (full, href: string) => {
        const asset = bundle[bundleKey(href)]
        if (!asset || asset.type !== 'asset') return full
        const css =
          typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
        delete bundle[asset.fileName]
        return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`
      })

      for (const name of Object.keys(bundle)) {
        if (name === htmlKey || name.endsWith('.html')) continue
        const baseName = name.split('/').pop() ?? name
        if (!html.includes(baseName)) delete bundle[name]
      }

      htmlFile.source = html
    },
  }
}

export default defineConfig({
  base: tryPack ? './' : normalizeBasePath(process.env.TRADERIDER_BASE),
  define: tryPack
    ? { 'import.meta.env.VITE_TRADERIDER_OFFLINE': JSON.stringify('1') }
    : {},
  plugins: [viteReact(), tailwindcss(), ...(tryPack ? [inlineTryBundle()] : []), renameStaticHtml()],
  build: {
    outDir: tryPack ? 'dist-try' : 'dist-static',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: tryPack ? false : undefined,
    assetsInlineLimit: tryPack ? 100_000_000 : 4096,
    rollupOptions: {
      input: 'static.html',
      ...(tryPack ? { output: { inlineDynamicImports: true } } : {}),
    },
  },
  preview: {
    port: 3019,
    host: true,
  },
})
