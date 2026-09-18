import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function ekonomiFile(urlPath) {
  const raw = String(urlPath || '').split('?')[0];
  if (!raw.startsWith('/ekonomi/')) return null;
  const rel = decodeURIComponent(raw.slice('/ekonomi/'.length));
  if (!rel || rel.includes('..')) return null;
  const root = path.resolve('ekonomi');
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return file;
}

function ekonomiPlugin() {
  const middleware = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const file = ekonomiFile(req.url);
    if (!file) return next();
    const ext = path.extname(file).toLowerCase();
    const type =
      ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.md' || ext === '.txt'
          ? 'text/plain; charset=utf-8'
          : 'application/octet-stream';
    res.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: 'ekonomi-avtal',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    closeBundle() {
      const src = path.resolve('ekonomi');
      const dest = path.resolve('dist/ekonomi');
      if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [ekonomiPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8765',
      '/magasin.json': 'http://127.0.0.1:8765',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 4096,
  },
});
