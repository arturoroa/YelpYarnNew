import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>✓ React is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>Environment Check:</h2>
        <ul>
          <li>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</li>
          <li>Has Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
