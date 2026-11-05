import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrapFullStackServer() {
  // Inisialisasi Backend Express App (Routes /api/*, MySQL connection pool, dll.)
  const app = await createExpressApp();
  const server = http.createServer(app);

  // Layer Serving Frontend (Vite Middleware in Dev / Static dist in Production)
  if (!isProduction) {
    console.log('[Server] Menjalankan Vite Middleware untuk Frontend (Dev Mode)...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback HTML handling untuk Single Page Application
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    console.log('[Server] Menjalankan Frontend Production (Serving static dist)...');
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Aplikasi PT SANTOS JAYA ABADI berjalan di http://0.0.0.0:${PORT}`);
    console.log(`🔌 API Backend tersedia di /api/* (Terkoneksi ke database/storage)`);
  });
}

bootstrapFullStackServer().catch((err) => {
  console.error('[Server Error] Gagal menjalankan server:', err);
  process.exit(1);
});
