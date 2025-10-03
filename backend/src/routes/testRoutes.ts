import express from 'express';
import { executePuppeteerCode } from '../controllers/testController.js';

const router = express.Router();

// Esta ruta debe coincidir exactamente con la que está usando en el frontend
router.post('/execute-puppeteer', executePuppeteerCode);

export default router;