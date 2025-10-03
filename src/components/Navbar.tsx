import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Clock, MapPin } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  console.log("Navbar rendered, user:", user?.username);

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
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">Yelp Click Tester</span>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-blue-500 mr-1.5" />
                  <span className="font-medium">{user.username}</span>
                </div>
                
                <div className="hidden md:flex items-center text-gray-500">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm">{user.ipAddress}</span>
                </div>
                
                <div className="hidden md:flex items-center text-gray-500">
                  <Clock className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm">{formatDate(user.loginTime)}</span>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;