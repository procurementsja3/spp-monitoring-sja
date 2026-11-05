import http from 'http';
import { createExpressApp } from './app.js';

const PORT = Number(process.env.BACKEND_PORT) || 5000;

async function startStandaloneBackend() {
  const app = await createExpressApp();
  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 SJA Backend Standalone Server Aktif!`);
    console.log(`📡 URL API: http://localhost:${PORT}/api`);
    console.log(`💡 Health Check: http://localhost:${PORT}/api/status`);
    console.log(`====================================================`);
  });
}

startStandaloneBackend().catch((err) => {
  console.error('[Backend Error]:', err);
  process.exit(1);
});
