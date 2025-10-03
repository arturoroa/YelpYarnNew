import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
});

// Controlador temporal simplificado para pruebas
export const executePuppeteerCode = async (req, res) => {
  console.log('Received execute-puppeteer request', req.body);
  return res.json({ 
    output: "Test successful - No browser launched",
    logs: "This is a test response" 
  });
};

// Asegúrate de que tu package.json tenga estos scripts
{
  "scripts": {
    "start:backend": "node backend/dist/server.js",
    "build:backend": "tsc --project backend/tsconfig.json",
    "dev:backend": "nodemon --watch backend --ext ts --exec \"npm run build:backend && node backend/dist/server.js\""
  }
}
