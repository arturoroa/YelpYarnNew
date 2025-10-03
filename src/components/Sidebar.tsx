import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Settings, Database, Users, File, Shield, BookOpen } from 'lucide-react';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-3 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 rounded-lg ${
        isActive ? 'bg-blue-50 text-blue-700 font-medium' : ''
      }`
    }
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Yelp ClickTester</h2>
        <p className="text-sm text-gray-500">SOX Compliance Testing</p>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          <SidebarLink to="/" icon={<Home size={20} />} label="Dashboard" />
          <SidebarLink to="/tests" icon={<Activity size={20} />} label="Test Runner" />
          <SidebarLink to="/sessions" icon={<Database size={20} />} label="Sessions" />
          <SidebarLink to="/users" icon={<Users size={20} />} label="User Management" />
          <SidebarLink to="/reports" icon={<File size={20} />} label="Reports" />
          <SidebarLink to="/integrations" icon={<Shield size={20} />} label="Integrations" />
          <SidebarLink to="/logs" icon={<BookOpen size={20} />} label="System Logs" />
          <SidebarLink to="/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            YT
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Yelp Testing</p>
            <p className="text-xs text-gray-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;