import express from 'express';
import { apiRouter } from './routes/apiRoutes.js';
import { initDatabaseConnection } from './config/database.js';

export async function createExpressApp() {
  const app = express();

  // Inisialisasi koneksi database (Mencoba Laragon MySQL, fallback otomatis ke JSON Storage jika offline)
  await initDatabaseConnection();

  // Middleware: Parsing body JSON berukuran besar (untuk batch import data SPP Excel)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Middleware: CORS (Mendukung pemanggilan dari Frontend terpisah port atau domain berbeda)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);

  return app;
}
