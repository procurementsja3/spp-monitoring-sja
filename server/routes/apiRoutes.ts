import { Router } from 'express';
import { getAllSPPItems, saveSPPItemsBatch, upsertSPPItems, deleteSPPItem } from '../controllers/sppController.js';
import { getAreaConfigs, saveAreaConfig } from '../controllers/configController.js';
import {
  proxyGoogleSheetPush,
  proxyGoogleSheetPull,
  proxyGoogleSheetTest,
  proxyGoogleSheetClear,
} from '../controllers/googleSheetProxy.js';
import { isUsingMySQL, DB_CONFIG } from '../config/database.js';

export const apiRouter = Router();

// 1. Health check & database connection status
apiRouter.get('/status', (_req, res) => {
  res.json({
    status: 'online',
    databaseEngine: isUsingMySQL() ? 'mysql_laragon' : 'persistent_json_disk',
    mysqlConfig: {
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      database: DB_CONFIG.database,
      connected: isUsingMySQL(),
    },
    timestamp: new Date().toISOString(),
    message: 'Backend SJA Monitoring API Aktif',
  });
});

// 2. Branch & Sheet Configurations
apiRouter.get('/area-configs', getAreaConfigs);
apiRouter.post('/area-configs', saveAreaConfig);

// 3. SPP & PO Items CRUD
apiRouter.get('/spp-items', getAllSPPItems);
apiRouter.post('/spp-items', saveSPPItemsBatch);
apiRouter.post('/spp-items/upsert', upsertSPPItems);
apiRouter.delete('/spp-items/:id', deleteSPPItem);

// 4. Google Sheets Proxy Endpoints
apiRouter.post('/google-sheet/push', proxyGoogleSheetPush);
apiRouter.get('/google-sheet/pull', proxyGoogleSheetPull);
apiRouter.get('/google-sheet/test', proxyGoogleSheetTest);
apiRouter.post('/google-sheet/clear', proxyGoogleSheetClear);
