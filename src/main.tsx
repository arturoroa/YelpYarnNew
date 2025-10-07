import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log("Application starting...");
console.log("Environment:", {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("No root element found!");
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
  } else {
    console.log("Root element found, mounting React app...");
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React app mounted successfully");
  }
} catch (error) {
  console.error("Error mounting app:", error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;">
    <h1>Error Loading Application</h1>
    <pre>${error instanceof Error ? error.message : String(error)}</pre>
    <p>Check the browser console for more details.</p>
  </div>`;
}
