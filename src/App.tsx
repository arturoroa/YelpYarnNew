import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import TestRunner from "./components/TestRunner";
import SystemLogs from "./components/SystemLogs";
import Integrations from "./components/Integrations";
import EnvironmentSelector from "./components/EnvironmentSelector";
import { Header } from "./components/Header";
import SessionViewer from "./components/SessionViewer";
import TestLogs from "./components/TestLogs";
import { LogOut, User, Clock } from 'lucide-react';

type ActiveView = 'dashboard' | 'test-runner' | 'session-viewer' | 'test-logs' | 'system-logs' | 'integrations' | 'environment-settings';

// Componente de barra de usuario
const UserBar: React.FC = () => {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center h-10">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <User className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-gray-700 font-medium">{user.username}</span>
            </div>
            <div className="hidden md:flex items-center">
              <Clock className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-gray-500">{formatDate(user.loginTime)}</span>
            </div>
            <div className="hidden md:block text-gray-500">
              IP: {user.ipAddress}
            </div>
            <button
              onClick={logout}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center"
            >
              <LogOut className="w-4 h-4 mr-1" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contenido de la aplicación con lógica de autenticación
const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedEnvironment, setSelectedEnvironment] = useState<any>(null);
  const { isAuthenticated } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Función para manejar la visualización de sesiones
  const handleViewSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveView('session-viewer');
  };

  // Determinar qué vista mostrar según activeView
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
          onViewSession={handleViewSession}
          selectedEnvironment={selectedEnvironment} 
        />;
      case 'test-runner':
        return <TestRunner />;
      case 'session-viewer':
        return <SessionViewer />;
      case 'test-logs':
        return <TestLogs />;
      case 'system-logs':
        return <SystemLogs />;
      case 'integrations':
        return <Integrations />;
      case 'environment-settings':
        return <EnvironmentSelector 
          selectedEnvironment={selectedEnvironment}
          onEnvironmentChange={setSelectedEnvironment}
        />;
      default:
        return <Dashboard 
          onViewSession={handleViewSession}
          selectedEnvironment={selectedEnvironment} 
        />;
    }
  };

  // Si no está autenticado, mostrar pantalla de login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Si está autenticado, mostrar la aplicación completa con su diseño original
  return (
    <div className="min-h-screen bg-gray-50">
      <UserBar />
      <Header activeView={activeView} onViewChange={setActiveView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </main>
    </div>
  );
};

// Componente App con el provider de autenticación
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;