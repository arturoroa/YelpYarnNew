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
  type: string;
  loginTime: string;
  ipAddress: string;
  sessionId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSystemAdmin: boolean;
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
    const loadUserData = async () => {
      try {
        // Cargar usuario actual desde localStorage
        const savedUser = localStorage.getItem('authUser');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }

        // Cargar historial de sesiones desde la base de datos
        try {
          const response = await fetch('/api/user-sessions');
          if (response.ok) {
            const sessions = await response.json();
            const formattedSessions = sessions.map((s: any) => ({
              id: s.id,
              username: s.username,
              loginTime: s.loginTime,
              logoutTime: s.logoutTime,
              ipAddress: s.ipAddress,
              status: s.status
            }));
            setSessionHistory(formattedSessions);
          }
        } catch (error) {
          console.error("Error loading session history from database:", error);
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
        localStorage.removeItem('authUser');
      }
    };

    loadUserData();
  }, []);

  const generateSessionId = (): string => {
    return 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  };

  const getIpAddress = (): string => {
    return '192.168.1.' + Math.floor(Math.random() * 255);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();

      if (result.success && result.user) {
        const ipAddress = getIpAddress();
        const sessionId = generateSessionId();
        const loginTime = new Date().toISOString();

        const authUser: AuthUser = {
          username: result.user.username,
          type: result.user.type,
          loginTime,
          ipAddress,
          sessionId
        };

        const newSession: AuthSession = {
          id: sessionId,
          username: result.user.username,
          loginTime,
          ipAddress,
          status: 'active'
        };

        // Guardar sesión en la base de datos
        try {
          await fetch('/api/user-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSession)
          });
        } catch (error) {
          console.error('Error saving session to database:', error);
        }

        // Actualizar usuario y sesión
        setUser(authUser);
        setIsAuthenticated(true);

        // Añadir a historial
        const updatedHistory = [...sessionHistory, newSession];
        setSessionHistory(updatedHistory);

        // Guardar en localStorage
        localStorage.setItem('authUser', JSON.stringify(authUser));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
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

      // Actualizar sesión en la base de datos y log system action via backend
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          sessionId: user.sessionId
        })
      }).catch(error => {
        console.error('Failed to log logout action:', error);
      });

      // Actualizar sesión en la base de datos
      fetch(`/api/user-sessions/${user.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoutTime,
          status: 'completed'
        })
      }).catch(error => {
        console.error('Failed to update session in database:', error);
      });
    }

    // Cerrar sesión
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authUser');
  };
  
  const isSystemAdmin = user?.type === 'SystemUser';

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isSystemAdmin,
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