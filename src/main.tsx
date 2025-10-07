import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log("=== Application Startup Diagnostics ===");
console.log("1. Script loaded successfully");
console.log("2. React version:", React.version);
console.log("3. Environment:", {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

// Simple test component
const TestApp = () => (
  <div style={{ padding: '20px', fontFamily: 'Arial' }}>
    <h1 style={{ color: 'green' }}>✓ React is Working!</h1>
    <p>Timestamp: {new Date().toISOString()}</p>
  </div>
);

try {
  const rootElement = document.getElementById('root');
  console.log("4. Root element:", rootElement ? "found" : "NOT FOUND");

  if (!rootElement) {
    console.error("FATAL: No root element found!");
    document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;"><h1>Error: Root element not found</h1></div>';
  } else {
    console.log("5. Attempting to create React root...");
    const root = ReactDOM.createRoot(rootElement);
    console.log("6. React root created, rendering...");

    root.render(
      <React.StrictMode>
        <TestApp />
      </React.StrictMode>
    );

    console.log("7. ✓ React app rendered successfully");
  }
} catch (error) {
  console.error("FATAL ERROR:", error);
  console.error("Stack:", error instanceof Error ? error.stack : 'No stack trace');
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: Arial;">
    <h1>Fatal Error Loading Application</h1>
    <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${error instanceof Error ? error.message + '\n\n' + error.stack : String(error)}</pre>
    <p><strong>Check the browser console for more details.</strong></p>
  </div>`;
}
