import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthSession {
  id: string;
  username: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress: string;
  status: 'active' | 'completed';
}

interface AuthUser {
  username: string;
  loginTime: string;
  ipAddress: string;
  sessionId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionHistory: AuthSession[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<AuthSession[]>([]);

  useEffect(() => {
    try {
      // Cargar usuario actual
      const savedUser = localStorage.getItem('authUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
      
      // Cargar historial de sesiones
      const savedHistory = localStorage.getItem('sessionHistory');
      if (savedHistory) {
        setSessionHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
      localStorage.removeItem('authUser');
    }
  }, []);

  const generateSessionId = (): string => {
    return 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  };

  const getIpAddress = (): string => {
    return '192.168.1.' + Math.floor(Math.random() * 255);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    if (username === 'aroa' && password === '123456789') {
      const ipAddress = getIpAddress();
      const sessionId = generateSessionId();
      const loginTime = new Date().toISOString();
      
      const authUser: AuthUser = { 
        username, 
        loginTime,
        ipAddress,
        sessionId
      };
      
      const newSession: AuthSession = {
        id: sessionId,
        username,
        loginTime,
        ipAddress,
        status: 'active'
      };
      
      // Actualizar usuario y sesión
      setUser(authUser);
      setIsAuthenticated(true);
      
      // Añadir a historial
      const updatedHistory = [...sessionHistory, newSession];
      setSessionHistory(updatedHistory);
      
      // Guardar en localStorage
      localStorage.setItem('authUser', JSON.stringify(authUser));
      localStorage.setItem('sessionHistory', JSON.stringify(updatedHistory));
      
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      // Marcar la sesión actual como completada
      const logoutTime = new Date().toISOString();
      
      const updatedHistory = sessionHistory.map(session => 
        session.id === user.sessionId 
          ? { ...session, logoutTime, status: 'completed' as const } 
          : session
      );
      
      setSessionHistory(updatedHistory);
      localStorage.setItem('sessionHistory', JSON.stringify(updatedHistory));
    }
    
    // Cerrar sesión
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authUser');
  };
  
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    sessionHistory,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};