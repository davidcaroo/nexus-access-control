import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, LogOut, ScanLine, Shield, AlarmClockPlus, Settings, QrCode, ChevronLeft } from 'lucide-react';
import { AppContext } from '../App';
import { useSidebar } from '../src/context/SidebarContext';
import { usePermissions } from '../src/context/PermissionsContext';

interface SidebarLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
  target?: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, target }) => {
  const { isCollapsed, closeMobileSidebar } = useSidebar();
  
  return (
    <NavLink
      to={to}
      target={target}
      onClick={closeMobileSidebar}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors group ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
    >
      {icon}
      <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{label}</span>
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {label}
        </div>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { logout, authState } = React.useContext(AppContext)!;
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobileSidebar } = useSidebar();
  const { can }_usePermissions();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-30 md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
        onClick={closeMobileSidebar}
      ></div>
      <aside className={`fixed top-0 left-0 h-full bg-slate-900 text-white flex flex-col z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className={`p-6 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div className={`overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 ml-2'}`}>
            <h1 className="text-xl font-bold tracking-tight">NEXUS</h1>
            <p className="text-xs text-slate-400">Control de Acceso</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {can('dashboard:view') && <SidebarLink to="/admin/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />}
          {can('employees:view') && <SidebarLink to="/admin/employees" icon={<Users size={20} />} label="Personal" />}
          {can('reports:view') && <SidebarLink to="/admin/reports" icon={<FileBarChart size={20} />} label="Reportes" />}
          {can('overtime:view') && <SidebarLink to="/admin/overtime" icon={<AlarmClockPlus size={20} />} label="Horas Extra" />}
          {can('users:view') && <SidebarLink to="/admin/users" icon={<Shield size={20} />} label="Usuarios y Roles" />}
          
          <div className="!my-4 border-t border-slate-800"></div>
          <SidebarLink to="/" target="_blank" icon={<QrCode size={20} />} label="Terminal de Acceso" />
          {can('settings:view') && <SidebarLink to="/admin/settings" icon={<Settings size={20} />} label="Ajustes" />}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {authState.user && (
            <div className={`mb-2 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              {authState.user.avatar_url ? (
                <img src={authState.user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {authState.user.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 ml-3'}`}>
                <p className="text-sm font-medium truncate">{authState.user.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{authState.user.role}</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors group ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            <span className={isCollapsed ? 'hidden' : ''}>Cerrar Sesión</span>
          </button>
        </div>
        <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
          <button onClick={toggleCollapse} className="bg-slate-700 hover:bg-blue-600 text-white rounded-full p-1.5 transition-all">
            <ChevronLeft size={16} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </>
  );
};