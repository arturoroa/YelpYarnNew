// Sistema centralizado para gestionar las sesiones de usuario

interface UserSession {
  id: string;
  guv: string;
  username: string;
  startTime: string;
  ipAddress: string;
  endTime?: string;
  active: boolean;
}

class SessionSyncManager {
  private static instance: SessionSyncManager;
  private listeners: Array<() => void> = [];
  
  private constructor() {
    // Singleton pattern
  }
  
  public static getInstance(): SessionSyncManager {
    if (!SessionSyncManager.instance) {
      SessionSyncManager.instance = new SessionSyncManager();
    }
    return SessionSyncManager.instance;
  }
  
  // Notifica a todos los componentes que deben actualizar su estado de sesión
  public notifySessionChange(): void {
    console.log('SessionSync: Notifying all listeners of session change');
    this.listeners.forEach(listener => listener());
    
    // También disparar eventos del DOM para componentes que no usen este manager
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('userSessionEnded'));
  }
  
  // Registrar un componente para recibir notificaciones de cambio de sesión
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Devolver función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Obtener la sesión actual desde localStorage
  public getCurrentSession(): UserSession | null {
    const savedSession = localStorage.getItem('currentUserSession');
    if (savedSession) {
      try {
        return JSON.parse(savedSession);
      } catch (error) {
        console.error('Error parsing current session:', error);
      }
    }
    return null;
  }
  
  // Obtener sesiones recientes desde localStorage
  public getRecentSessions(): UserSession[] {
    const savedSessions = localStorage.getItem('recentUserSessions');
    if (savedSessions) {
      try {
        return JSON.parse(savedSessions);
      } catch (error) {
        console.error('Error parsing recent sessions:', error);
      }
    }
    return [];
  }
  
  // Terminar la sesión actual
  public endCurrentSession(): boolean {
    const currentSession = this.getCurrentSession();
    if (!currentSession) return false;
    
    try {
      console.log('SessionSyncManager: Ending current session', currentSession.id);
      
      // Marcar como terminada
      const updatedSession = {
        ...currentSession,
        endTime: new Date().toISOString(),
        active: false
      };
      
      // Eliminar sesión actual
      localStorage.removeItem('currentUserSession');
      
      // Añadir a sesiones recientes
      const recentSessions = this.getRecentSessions();
      const updatedRecentSessions = [
        updatedSession, 
        ...recentSessions.filter(s => s.id !== updatedSession.id)
      ].slice(0, 10); // Máximo 10 sesiones
      
      localStorage.setItem('recentUserSessions', JSON.stringify(updatedRecentSessions));
      console.log('SessionSyncManager: Session moved to recent sessions');
      
      // Notificar el cambio
      this.notifySessionChange();
      
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }
}

export default SessionSyncManager;