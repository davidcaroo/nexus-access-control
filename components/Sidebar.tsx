import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, LogOut, ScanLine, Shield } from 'lucide-react';
import { AppContext } from '../App';

export const Sidebar: React.FC = () => {
  const { logout, authState } = React.useContext(AppContext)!;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          NEXUS
        </h1>
        <p className="text-xs text-slate-400 mt-1 pl-10">Control de Acceso</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavLink 
          to="/admin/dashboard" 
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>

        {(authState.user?.role === 'admin' || authState.user?.role === 'superadmin') && (
          <NavLink 
            to="/admin/employees" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            Personal
          </NavLink>
        )}

        <NavLink 
          to="/admin/reports" 
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          <FileBarChart size={20} />
          Reportes
        </NavLink>

        {authState.user?.role === 'superadmin' && (
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Shield size={20} />
            Usuarios y Roles
          </NavLink>
        )}

        <div className="!mt-8 px-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Accesos Rápidos</p>
          <NavLink 
            to="/" 
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-emerald-400 hover:bg-slate-800 transition-colors border border-dashed border-slate-700"
          >
            <ScanLine size={20} />
            Abrir Terminal QR
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        {authState.user && (
          <>
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                {authState.user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{authState.user.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{authState.user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </>
        )}
      </div>
    </aside>
  );
};