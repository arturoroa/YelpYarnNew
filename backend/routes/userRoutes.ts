import express from 'express';
import DatabaseManager from '../utils/DatabaseManager.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// Obtener lista de usuarios
router.get('/list', async (req, res) => {
  try {
    // Usar datos mockeados si no hay conexión a la base de datos
    const mockUsers = [
      {
        guv: 'mock-guv-1',
        username: 'testuser',
        email: 'test@example.com',
        status: 'active',
        sessionCount: 3,
        createdAt: new Date().toISOString()
      },
      {
        guv: 'mock-guv-2',
        username: 'demouser',
        email: 'demo@example.com',
        status: 'pending',
        sessionCount: 1,
        createdAt: new Date().toISOString()
      }
    ];
    
    console.log('Returning mock users list');
    res.status(200).json(mockUsers);
  } catch (err) {
    console.error('Error retrieving users:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Verificar si un nombre de usuario existe
router.get('/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    // Siempre devolver null para permitir la creación de usuarios en el demo
    res.status(200).json(null);
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// Crear usuario
router.post('/create', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        requiredFields: ['username', 'email', 'password']
      });
    }
    
    // Crear un nuevo usuario con datos simulados
    const newUser = {
      guv: `user-${uuidv4().substring(0, 8)}`,
      username,
      email,
      status: 'active',
      sessionCount: 0,
      createdAt: new Date().toISOString()
    };
    
    console.log('Created mock user:', newUser);
    res.status(201).json(newUser);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Incrementar contador de sesiones
router.post('/:guv/increment-session', async (req, res) => {
  try {
    const { guv } = req.params;
    console.log(`Incrementing session count for user: ${guv}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error incrementing session count:', err);
    res.status(500).json({ error: 'Failed to increment session count' });
  }
});

export default router;





