import express from 'express';
import DatabaseManager from '../utils/DatabaseManager.js';
import TestLogger from '../utils/TestLogger.js';
import ProductionIsolation from '../utils/ProductionIsolation.js';

const router = express.Router();
const database = DatabaseManager.getInstance();
const logger = TestLogger.getInstance();
const isolation = ProductionIsolation.getInstance();

// Endpoint para obtener la configuración
router.get('/', async (req, res) => {
  try {
    const config = {
      puppeteerOptions: {
        headless: process.env.NODE_ENV === 'production',
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      endpoints: {
        yelpBaseUrl: process.env.YELP_BASE_URL || 'https://www.yelp.com',
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api'
      },
      testDefaults: {
        timeout: 30000,
        retries: 3
      },
      version: '1.0.0'
    };
    
    res.status(200).json(config);
  } catch (err) {
    logger.error('Failed to get config:', err);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// Endpoint para verificar el entorno
router.get('/environment', (req, res) => {
  const safetyCheck = isolation.validateEnvironmentSafety();
  if (safetyCheck.safe) {
    res.status(200).json({ status: 'safe', environment: process.env.NODE_ENV || 'development' });
  } else {
    res.status(403).json({ status: 'unsafe', errors: safetyCheck.errors });
  }
});

// Asegúrate de añadir esta línea para exportar el router como default
export default router;





