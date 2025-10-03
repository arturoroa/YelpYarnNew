// Importar extensiones al inicio
import './utils/puppeteerExtensions.js';

// Importaciones
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRoutes from './routes/userRoutes.js';
import testRoutes from './routes/testRoutes.js';
import configRoutes from './routes/configRoutes.js';
import DatabaseManager from './utils/DatabaseManager.js'; // Nueva importación

// Configurar Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// For debugging incorrect paths
app.use('/api/api', (req, res) => {
  console.log('WARNING: Detected double /api prefix in URL path:', req.originalUrl);
  // Redirect to the correct path by removing one /api
  const correctedPath = req.originalUrl.replace('/api/api', '/api');
  console.log('Redirecting to:', correctedPath);
  res.redirect(correctedPath);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Rutas API
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/config', configRoutes);

// Extensiones de Puppeteer
console.log('Puppeteer extensions loaded: waitForTimeout added to Page');

// Inicializar la base de datos antes de arrancar el servidor
async function initializeDatabase() {
  const dbManager = DatabaseManager.getInstance();
  
  try {
    // Try connecting to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yelp-click-tester';
    await dbManager.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.warn('Failed to connect to MongoDB:', error.message);
    
    // Use mock database instead
    await dbManager.mockConnect();
    console.log('Using mock database for development');
  }
}

// Start server after initializing database
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Call the start function
startServer();

// Para pruebas
export default app;





