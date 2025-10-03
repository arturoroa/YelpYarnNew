import express from 'express';
import DatabaseManager from '../utils/DatabaseManager.js';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// GET /api/logs - Get all logs
router.get('/', async (req, res) => {
  try {
    const logs = await dbManager.getLogs();
    res.status(200).json(logs);
  } catch (err) {
    const error = err as Error;
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /api/logs/:sessionId - Get logs by session ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = await dbManager.getLogs(sessionId);
    res.status(200).json(logs);
  } catch (err) {
    const error = err as Error;
    console.error(`Error retrieving logs for session ${req.params.sessionId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve logs for this session' });
  }
});

// POST /api/logs - Create a new log entry
router.post('/', async (req, res) => {
  try {
    const logData = req.body;
    await dbManager.addLog(logData);
    res.status(201).json({ message: 'Log created successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

export default router;





