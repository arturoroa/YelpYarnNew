import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

// Crear aplicación Express
const app = express();

// Middlewares con CORS específico para localhost
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Ruta específica para ejecutar código Puppeteer
app.post('/api/tests/execute-puppeteer', async (req, res) => {
  console.log('Recibida solicitud para ejecutar código Puppeteer', req.body);
  const { code, headless = true } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  let browser;
  try {
    console.log(`Launching browser with headless: ${headless}`);
    
    browser = await puppeteer.launch({
      headless: Boolean(headless),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
      timeout: 30000 // Añadir timeout para operaciones del navegador
    });
    
    const page = await browser.newPage();
    
    // Capturar logs del navegador
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // IMPORTANTE: Corregir el problema con 'export'
    // Ejecutar el código del usuario en un contexto seguro evitando la sintaxis de módulos
    const sanitizedCode = code.replace(/export|import/g, '// $&');
    
    const result = await eval(`
      (async () => {
        try {
          const browser = arguments[0];
          const page = arguments[1];
          ${sanitizedCode}
          return { success: true };
        } catch (error) {
          return { error: error.toString() };
        }
      })()
    `)(browser, page);
    
    await browser.close();
    
    return res.json({
      output: JSON.stringify(result, null, 2),
      logs: logs.join('\n')
    });
    
  } catch (error) {
    console.error('Error executing Puppeteer code:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return res.status(500).json({
      error: `Error executing code: ${error.message}`
    });
  }
});

// Ruta básica para verificar si el servidor está funcionando
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock para la ruta sessions
app.get('/api/tests/sessions', (req, res) => {
  res.json([]);
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint available at: http://localhost:${PORT}/api/tests/execute-puppeteer`);
});