import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Filter, Globe, User, LogOut } from 'lucide-react';
import { TestSession, Environment } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

type Status = 'pending' | 'running' | 'completed' | 'failed' | 'unknown';

interface DashboardProps {
  onViewSession: (sessionId: string) => void;
  selectedEnvironment: Environment | null;
}

const STATUS_STYLES: Record<Status, { badge: string; icon: JSX.Element }> = {
  running: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Clock className="w-5 h-5 text-blue-500" />,
  },
  completed: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
  },
  failed: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-5 h-5 text-red-500" />,
  },
  pending: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  },
  unknown: {
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <AlertTriangle className="w-5 h-5 text-gray-500" />,
  },
};

export default function Dashboard({ onViewSession, selectedEnvironment }: DashboardProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
  });
  
  const { user, sessionHistory, logout } = useAuth();

  // Convertir historial de sesiones a formato TestSession - usando useMemo para evitar recálculos innecesarios
  const sessions = useMemo(() => {
    const formattedSessions = sessionHistory
      .filter(session => session.status === 'completed')
      .map(session => ({
        id: session.id,
        status: 'completed',
        created_at: session.loginTime,
        guv: session.username,
        ip_address: session.ipAddress,
        ended_at: session.logoutTime
      } as unknown as TestSession));
    
    // Calcular estadísticas
    const newStats = formattedSessions.reduce(
      (acc, s) => {
        acc.total += 1;
        acc.completed += 1; // Todas son completed en este caso
        return acc;
      },
      { total: 0, pending: 0, running: 0, completed: 0, failed: 0 }
    );
    
    // Actualizar las estadísticas
    setStats(newStats);
    
    return formattedSessions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [sessionHistory]);

  const safeStatus = (s?: string): Status =>
    (['pending', 'running', 'completed', 'failed'].includes(s || '') ? (s as Status) : 'unknown');

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Testing Dashboard</h2>
          <p className="text-gray-600 mt-1">Monitor click validation tests and SOX compliance</p>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Globe className="w-4 h-4" />
            <span>{selectedEnvironment?.name || 'No Environment Selected'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Filter className="w-4 h-4" />
            <span>All Filters Active</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card label="Total Sessions" value={stats.total} icon={<TrendingUp className="w-6 h-6 text-gray-600" />} />
        <Card label="Pending" value={stats.pending} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} />
        <Card label="Running" value={stats.running} icon={<Clock className="w-6 h-6 text-blue-600" />} />
        <Card label="Completed" value={stats.completed} icon={<CheckCircle className="w-6 h-6 text-green-600" />} />
        <Card label="Failed" value={stats.failed} icon={<XCircle className="w-6 h-6 text-red-600" />} />
      </div>
      
      {/* Current Session */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Current Session</h3>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                End Session
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-lg font-medium text-gray-900">{user.username}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Login Time</p>
                  <p className="text-lg font-medium text-gray-900">{formatDate(user.loginTime)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">IP Address</p>
                  <p className="text-lg font-medium text-gray-900">{user.ipAddress}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center">
                <p className="text-sm text-gray-500">Session ID: {user.sessionId}</p>
                <span className="ml-2 px-2 py-1 text-xs font-medium rounded-lg border bg-blue-100 text-blue-800 border-blue-200">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Test Sessions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <Th>Session</Th>
                <Th>Status</Th>
                <Th>Username</Th>
                <Th>IP Address</Th>
                <Th>Started</Th>
                <Th>Ended</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No test sessions found. Start a new test to see results here.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const st = safeStatus(session?.status);
                  const styles = STATUS_STYLES[st];
                  const idSuffix = (session?.id && session.id.includes('_')) ? session.id.split('_').pop() : session?.id;
                  const username = (session as any)?.guv ? String((session as any).guv) : '—';
                  const ip = (session as any)?.ip_address ?? '—';
                  const created = formatDate(session?.created_at);
                  const ended = formatDate((session as any)?.ended_at || (session as any)?.logoutTime);

                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {styles.icon}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{idSuffix}</div>
                            <div className="text-sm text-gray-500">Session ID</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg border ${styles.badge}`}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{username}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ip}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{created}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ended}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onViewSession(session.id)}
                          className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* small presentational helpers */
function Card({ label, value, icon }: { label: string; value: number; icon: JSX.Element }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}