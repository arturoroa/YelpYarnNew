import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
import mysql from 'mysql2/promise.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Create require from project root to load better-sqlite3 correctly
const require = createRequire(join(projectRoot, 'package.json'));
const Database = require('better-sqlite3');

dotenv.config();

let supabase;
try {
  supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  console.log('Supabase client initialized');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message);
  process.exit(1);
}

// Crear aplicación Express
const app = express();

// Middlewares con CORS específico para localhost
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Ruta básica para verificar si el servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    console.log('Deleting integration with id:', id);

    const { data, error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully deleted integration:', data);
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
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

async function testDatabaseConnection(config, res) {
  const { host, port, database, username, password, protocol } = config;
  const dbProtocol = (protocol || 'postgresql').toLowerCase();

  if (!host && dbProtocol !== 'sqlite') {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  const actualPort = parseInt(port) || 5432;
  const timeout = parseInt(config.timeout) || 15000;

  try {
    if (dbProtocol.includes('postgres') || dbProtocol === 'postgresql') {
      const { Client } = pg;

      const client = new Client({
        host,
        port: actualPort,
        database: database || 'postgres',
        user: username || 'postgres',
        password: password || '',
        connectionTimeoutMillis: timeout,
      });

      try {
        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        return res.json({
          success: true,
          message: `Successfully connected to PostgreSQL database at ${host}:${actualPort}/${database || 'postgres'}`
        });
      } catch (err) {
        try { await client.end(); } catch {}

        let errorMsg = err.message;
        if (err.code === '28P01') {
          errorMsg = `Authentication failed for user "${username}". Check username and password.`;
        } else if (err.code === '3D000') {
          errorMsg = `Database "${database}" does not exist.`;
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused to ${host}:${actualPort}. PostgreSQL service may be down.`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMsg = `Connection to ${host}:${actualPort} timed out.`;
        } else if (err.code === 'ENOTFOUND') {
          errorMsg = `Host ${host} not found. Check hostname.`;
        }

        return res.json({
          success: false,
          error: errorMsg
        });
      }
    } else if (dbProtocol.includes('mysql')) {
      try {
        const connection = await mysql.createConnection({
          host,
          port: actualPort,
          database: database || 'mysql',
          user: username || 'root',
          password: password || '',
          connectTimeout: timeout,
        });

        await connection.query('SELECT 1');
        await connection.end();

        return res.json({
          success: true,
          message: `Successfully connected to MySQL database at ${host}:${actualPort}/${database || 'mysql'}`
        });
      } catch (err) {
        console.error('MySQL connection error:', err);
        let errorMsg = err.message;
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
          errorMsg = `Authentication failed for user "${username}". Check username and password.`;
        } else if (err.code === 'ER_BAD_DB_ERROR') {
          errorMsg = `Database "${database}" does not exist.`;
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused to ${host}:${actualPort}. MySQL service may be down or port is blocked.`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMsg = `Connection to ${host}:${actualPort} timed out after ${timeout}ms. This could mean:\n- The host is not reachable\n- Firewall is blocking the connection\n- The server is not responding`;
        } else if (err.code === 'ENOTFOUND') {
          errorMsg = `Host ${host} not found. Check hostname or DNS settings.`;
        } else if (err.errno === -111) {
          errorMsg = `Connection refused to ${host}:${actualPort}. The MySQL service may be down or the port is blocked by a firewall.`;
        } else if (err.errno === 'ETIMEDOUT' || err.sqlState === 'HY000') {
          errorMsg = `Connection to ${host}:${actualPort} timed out (${timeout}ms). Possible causes:\n- Host is unreachable from this server\n- Firewall blocking port ${actualPort}\n- MySQL server not accepting remote connections`;
        }

        return res.json({
          success: false,
          error: errorMsg,
          details: {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState
          }
        });
      }
    } else if (dbProtocol === 'sqlite') {
      const { filePath } = config;

      if (!filePath) {
        return res.json({
          success: false,
          error: 'File path is required for SQLite'
        });
      }

      try {
        let db;
        let wasCreated = false;

        try {
          db = new Database(filePath, { readonly: true, fileMustExist: true });
        } catch (openErr) {
          if (openErr.code === 'SQLITE_CANTOPEN' || openErr.message.includes('ENOENT')) {
            db = new Database(filePath);
            wasCreated = true;
          } else {
            throw openErr;
          }
        }

        const result = db.prepare('SELECT 1 as test').get();
        db.close();

        return res.json({
          success: true,
          message: wasCreated
            ? `SQLite database created and connected successfully at ${filePath}`
            : `Successfully connected to SQLite database at ${filePath}`
        });
      } catch (err) {
        console.error('SQLite connection error:', err);
        let errorMsg = err.message;

        if (err.message.includes('not a database')) {
          errorMsg = `File at ${filePath} is not a valid SQLite database`;
        } else if (err.code === 'EACCES') {
          errorMsg = `Permission denied accessing ${filePath}`;
        } else {
          errorMsg = `Failed to connect to SQLite database: ${err.message}`;
        }

        return res.json({
          success: false,
          error: errorMsg,
          details: {
            code: err.code,
            errno: err.errno
          }
        });
      }
    } else {
      return res.json({
        success: false,
        error: `Unsupported database protocol: ${dbProtocol}. Supported: postgresql, mysql, sqlite`
      });
    }
  } catch (err) {
    console.error('Database connection test error:', err);
    if (!res.headersSent) {
      return res.json({
        success: false,
        error: `Error testing connection: ${err.message}`
      });
    }
  }
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
    const actualPort = port || 8080;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: `Successfully connected to proxy ${host}:${actualPort}`
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection to ${host}:${actualPort} timed out after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      let errorMsg = err.message;
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused to ${host}:${actualPort}. Proxy service may be down or unreachable.`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = `Connection to ${host}:${actualPort} timed out.`;
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = `Host ${host} not found. Check hostname.`;
      } else if (err.code === 'ENETUNREACH') {
        errorMsg = `Network unreachable to ${host}:${actualPort}.`;
      }
      res.json({
        success: false,
        error: errorMsg
      });
      resolve();
    });

    socket.connect(actualPort, host);
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
        message: `Successfully connected to VPN ${host}:${port} (${protocol})`
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection to ${host}:${port} timed out after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      let errorMsg = err.message;
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused to ${host}:${port}. VPN service may be down or unreachable.`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = `Connection to ${host}:${port} timed out.`;
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = `Host ${host} not found. Check hostname.`;
      } else if (err.code === 'ENETUNREACH') {
        errorMsg = `Network unreachable to ${host}:${port}.`;
      }
      res.json({
        success: false,
        error: errorMsg
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
// System Logs endpoint
app.get('/api/logs/system/recent', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    // Return mock logs for now - in production, this would read actual system logs
    res.json([
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started successfully',
        source: 'system'
      }
    ]);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Test session endpoints
app.get('/api/tests/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching test sessions:', error);
    res.status(500).json({ error: 'Failed to fetch test sessions' });
  }
});

app.post('/api/tests/start', async (req, res) => {
  try {
    const sessionData = req.body;
    const { data, error } = await supabase
      .from('test_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error starting test session:', error);
    res.status(500).json({ error: 'Failed to start test session' });
  }
});

app.get('/api/tests/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data, error } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching test session:', error);
    res.status(500).json({ error: 'Failed to fetch test session' });
  }
});

app.post('/api/tests/stop/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data, error } = await supabase
      .from('test_sessions')
      .update({ status: 'stopped', ended_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error stopping test session:', error);
    res.status(500).json({ error: 'Failed to stop test session' });
  }
});

// User endpoints
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('yelp_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/users/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { data, error } = await supabase
      .from('yelp_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;
    res.json({ exists: !!data, user: data });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
});

app.post('/api/users/create', async (req, res) => {
  try {
    const userData = req.body;
    const { data, error } = await supabase
      .from('yelp_users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
  console.log(`Puppeteer endpoint available at: http://localhost:${PORT}/api/tests/execute-puppeteer`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying to restart...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('Server error:', error);
  }
});
