import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { User, Lock, Shield, Globe } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const success = await login(username, password);
      if (!success) {
        setError("Usuario o contraseña incorrectos");
      }
    } catch (error) {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            <Globe className="h-10 w-10 text-blue-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">YELP (YAR) Testing Platform</h1>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
            <p className="text-gray-600 mt-1">Acceda a la plataforma de pruebas de Yelp</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 flex items-center">
                <span className="mr-2">⚠️</span> {error}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="aroa"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456789"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {loading ? (
                <>
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-sm text-center text-gray-500 border-t border-gray-200 pt-4">
            <p>Para este demo use: <span className="font-semibold">aroa</span> / <span className="font-semibold">123456789</span></p>
            <p className="mt-2">Esta plataforma es para validación SOX y pruebas de Yelp Ad Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;