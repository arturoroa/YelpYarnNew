// o donde esté tu controlador que maneja la ejecución de Puppeteer

// Importaciones existentes
import puppeteer from 'puppeteer';

export const executePuppeteerCode = async (req, res) => {
  console.log('Executing puppeteer code', req.body);
  const { code, headless = true } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  let browser;
  try {
    console.log(`Launching browser with headless: ${headless}`);
    
    // Configurar opciones de lanzamiento para Puppeteer
    const launchOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    };
    
    // En versiones más recientes de Puppeteer, 'headless' puede ser boolean
    launchOptions['headless'] = Boolean(headless);
    
    browser = await puppeteer.launch(launchOptions);
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    
    // Capturar console.log del navegador
    const logs = [];
    page.on('console', (msg) => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Ejecutar el código en un contexto seguro
    const result = await eval(`
      (async () => {
        try {
          const browser = arguments[0];
          const page = arguments[1];
          ${code}
        } catch (error) {
          return { error: error.toString() };
        }
      })()
    `)(browser, page);
    
    console.log('Code executed successfully');
    await browser.close();
    
    return res.status(200).json({
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
};