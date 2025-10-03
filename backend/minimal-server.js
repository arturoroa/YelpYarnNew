import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Crear aplicación Express
const app = express();

// Middlewares con CORS específico para localhost
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Ruta básica para verificar si el servidor está funcionando
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CRUD Endpoints for Integrations
app.get('/api/integrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/integrations', async (req, res) => {
  try {
    const { name, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const { data, error } = await supabase
      .from('integrations')
      .insert([{
        name,
        type,
        status: 'disconnected',
        config: config || {}
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, config, status, last_sync } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;
    if (last_sync !== undefined) updateData.last_sync = last_sync;

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para probar conexiones de integración
app.post('/api/integrations/test-connection', async (req, res) => {
  console.log('Testing connection for integration:', req.body.type);
  const { type, config } = req.body;

  if (!type || !config) {
    return res.status(400).json({
      success: false,
      error: 'Missing type or config'
    });
  }

  try {
    switch (type) {
      case 'database':
        return await testDatabaseConnection(config, res);
      case 'proxy':
        return await testProxyConnection(config, res);
      case 'vpn':
        return await testVpnConnection(config, res);
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown integration type: ${type}`
        });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

async function testDatabaseConnection(config, res) {
  const { host, port, database, username, password } = config;

  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  const net = await import('net');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = config.timeout || 5000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: 'Connection successful'
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection timeout after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection failed: ${err.message}`
      });
      resolve();
    });

    socket.connect(port || 5432, host);
  });
}

async function testProxyConnection(config, res) {
  const { host, port, protocol } = config;

  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  const net = await import('net');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: 'Connection successful'
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection timeout after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection failed: ${err.message}`
      });
      resolve();
    });

    socket.connect(port || 8080, host);
  });
}

async function testVpnConnection(config, res) {
  const { host, protocol } = config;

  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  if (!protocol) {
    return res.json({
      success: false,
      error: 'Protocol is required for VPN connections'
    });
  }

  const net = await import('net');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;
    const port = protocol.toLowerCase() === 'openvpn' ? 1194 : 51820;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: 'Connection successful'
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection timeout after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection failed: ${err.message}`
      });
      resolve();
    });

    socket.connect(port, host);
  });
}

// Endpoint principal para ejecutar código Puppeteer
app.post('/api/tests/execute-puppeteer', async (req, res) => {
  console.log('Received execute-puppeteer request');
  const { code, headless = true } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  let browser;
  try {
    console.log(`Launching browser with headless: ${headless}`);
    
    // Configuración de puppeteer
    browser = await puppeteer.launch({
      headless: Boolean(headless),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Capturar logs del navegador
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      // Eliminar/reemplazar las declaraciones import/export y otras construcciones ES módulos
      const strippedCode = code
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import removed')
        .replace(/export\s+async\s+function/g, 'async function')
        .replace(/export\s+function/g, 'function')
        .replace(/export\s+const/g, 'const')
        .replace(/export\s+let/g, 'let')
        .replace(/export\s+var/g, 'var')
        .replace(/export\s+default/g, '// export default removed')
        .replace(/import\.meta\.url/g, '"mock_import_meta_url"')
        .replace(/if\s*\(\s*process\s+&&\s+import\.meta\.url\s*===\s*url\.pathToFileURL\s*\(\s*process\.argv\s*\[\s*1\s*\]\s*\)\.href\s*\)\s*\{([\s\S]*?)\}/g, '// Removed process check block');

      console.log('Processed code:', strippedCode);
      
      // Crear mocks para módulos comunes
      const url = {
        pathToFileURL: (path) => ({ href: path })
      };
      
      // Mock básico para @puppeteer/replay
      const createRunner = (extension) => {
        console.log('Creating mock runner with extension:', extension);
        return {
          runBeforeAllSteps: async () => console.log('Mock: runBeforeAllSteps'),
          runAfterAllSteps: async () => console.log('Mock: runAfterAllSteps'),
          runStep: async (step) => {
            console.log(`Mock step: ${step.type}`);
            
            switch(step.type) {
              case 'navigate':
                await page.goto(step.url);
                break;
              case 'click':
                if (step.selectors && step.selectors.length > 0) {
                  try {
                    await page.waitForSelector(step.selectors[0][0], { timeout: 5000 });
                    await page.click(step.selectors[0][0]);
                  } catch (e) {
                    console.log('Click error:', e.message);
                  }
                }
                break;
              case 'setViewport':
                await page.setViewport({
                  width: step.width || 1280,
                  height: step.height || 800,
                  deviceScaleFactor: step.deviceScaleFactor || 1,
                  isMobile: !!step.isMobile,
                  hasTouch: !!step.hasTouch,
                  isLandscape: !!step.isLandscape
                });
                break;
              case 'change':
                if (step.selectors && step.selectors.length > 0) {
                  try {
                    await page.waitForSelector(step.selectors[0][0], { timeout: 5000 });
                    await page.type(step.selectors[0][0], step.value || '');
                  } catch (e) {
                    console.log('Change error:', e.message);
                  }
                }
                break;
              case 'keyDown':
              case 'keyUp':
                try {
                  await page.keyboard.press(step.key || 'Tab');
                } catch (e) {
                  console.log(`Key${step.type} error:`, e.message);
                }
                break;
              default:
                console.log(`Step type '${step.type}' not implemented in mock`);
            }
          }
        };
      };
      
      // Forzar la ejecución de la función run si está presente
      const runCodeWithForcedExecution = `
        ${strippedCode}
        
        // Llamar directamente a run()
        if (typeof run === 'function') {
          await run({});
        }
      `;
      
      // Ejecutar código modificado
      const executeUserCode = new Function('browser', 'page', 'url', 'createRunner', 'process', `
        return (async () => {
          try {
            ${runCodeWithForcedExecution}
            return { success: true, message: "Execition Done" };
          } catch (error) {
            return { error: error.toString() };
          }
        })();
      `);
      
      // Crear un mock para process
      const processMock = {
        argv: ['/path/to/node', '/path/to/script.js']
      };
      
      const result = await executeUserCode(browser, page, url, createRunner, processMock);
      
      await browser.close();
      browser = null;
      
      return res.json({
        output: JSON.stringify(result, null, 2),
        logs: logs.join('\n')
      });
      
    } catch (evalError) {
      console.error('Error al evaluar el código:', evalError);
      
      // Ejecutar código alternativo simple
      await page.goto('https://www.example.com');
      const title = await page.title();
      
      await browser.close();
      browser = null;
      
      return res.json({
        output: JSON.stringify({
          success: false,
          error: evalError.toString(),
          fallbackTitle: title,
          message: "Error on the code,alternative browsing"
        }, null, 2),
        logs: logs.join('\n')
      });
    }
    
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

// Iniciar el servidor
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
  console.log(`Puppeteer endpoint available at: http://localhost:${PORT}/api/tests/execute-puppeteer`);
});
