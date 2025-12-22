import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, LogOut, ScanLine, Shield, AlarmClockPlus, Settings, QrCode, ChevronLeft, CalendarCheck, Key, Clock } from 'lucide-react'; // Añadir Clock icon
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
      className={({ isActive }) => `
        flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium 
        transition-colors group relative
        ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
        ${isCollapsed ? 'md:px-3 md:py-3' : ''}
      `}
      title={isCollapsed ? label : undefined}
    >
      <span className="flex items-center justify-center shrink-0">{icon}</span>
      <span className={`
        transition-all duration-200 whitespace-nowrap
        ${isCollapsed ? 'hidden md:hidden' : 'block'}
      `}>
        {label}
      </span>

      {/* Tooltip al pasar el mouse cuando está colapsado */}
      {isCollapsed && (
        <div className="hidden md:block absolute left-full ml-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { logout, authState } = React.useContext(AppContext)!;
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobileSidebar } = useSidebar();
  const { can, permissions } = usePermissions();
  const navigate = useNavigate();

  // Helper function to check if user can access any permission in a module
  const canAccessModule = (modulePrefix: string): boolean => {
    if (authState.user?.role === 'superadmin') return true;
    // Check if user has ANY permission starting with the module prefix
    // This includes read, view, create, update, delete, etc.
    return permissions.some(perm => perm.startsWith(modulePrefix + ':'));
  };

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
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 text-white flex flex-col z-40 
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Header */}
        <div className={`
          p-6 border-b border-slate-800 flex items-center shrink-0
          transition-all duration-300
          ${isCollapsed ? 'justify-center' : 'justify-start'}
        `}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 flex-shrink-0">
            <ScanLine className="w-6 h-6" />
          </div>
          <div className={`
            transition-all duration-300 overflow-hidden
            ${isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 ml-3'}
          `}>
            <h1 className="text-xl font-bold tracking-tight">NEXUS</h1>
            <p className="text-xs text-slate-400">Control de Acceso</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`
          flex-1 transition-all duration-300
          ${isCollapsed ? 'px-2 py-4 space-y-2 md:px-2 overflow-hidden' : 'p-4 space-y-1 overflow-y-auto'}
        `}>
          {(authState.user?.role === 'superadmin' || can('dashboard:view')) &&
            <SidebarLink to="/admin/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          }
          {canAccessModule('employees') &&
            <SidebarLink to="/admin/employees" icon={<Users size={20} />} label="Personal" />
          }
          {canAccessModule('leave_requests') &&
            <SidebarLink to="/admin/leave-requests" icon={<CalendarCheck size={20} />} label="Solicitudes de Ausencia" />
          }
          {canAccessModule('reports') &&
            <SidebarLink to="/admin/reports" icon={<FileBarChart size={20} />} label="Reportes" />
          }
          {canAccessModule('attendance') &&
            <SidebarLink to="/admin/overtime" icon={<AlarmClockPlus size={20} />} label="Horas Extra" />
          }
          {canAccessModule('users') &&
            <SidebarLink to="/admin/users" icon={<Shield size={20} />} label="Usuarios del Sistema" />
          }
          {canAccessModule('roles') &&
            <SidebarLink to="/admin/roles-permissions" icon={<Key size={20} />} label="Roles y Permisos" />
          }
          {(authState.user?.role === 'superadmin' || canAccessModule('employees')) &&
            <SidebarLink to="/admin/shifts" icon={<Clock size={20} />} label="Horarios" />
          }

          <div className={`
            border-t border-slate-800 my-2
            ${isCollapsed ? 'my-2' : 'my-4'}
          `}></div>

          <SidebarLink to="/" target="_blank" icon={<QrCode size={20} />} label="Terminal de Acceso" />
          {(authState.user?.role === 'superadmin' || can('settings:view')) &&
            <SidebarLink to="/admin/settings" icon={<Settings size={20} />} label="Ajustes" />
          }
        </nav>

        {/* Footer - User Profile */}
        <div className={`
          p-4 border-t border-slate-800 shrink-0
          transition-all duration-300
          ${isCollapsed ? 'space-y-2' : ''}
        `}>
          {authState.user && (
            <div className={`
              flex items-center gap-3 mb-2
              transition-all duration-300
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}>
              {authState.user.avatar_url ? (
                <img
                  src={authState.user.avatar_url}
                  alt="Avatar"
                  className="w-10 h-10 rounded-lg object-cover shrink-0 flex-shrink-0"
                  title={isCollapsed ? authState.user.full_name : undefined}
                />
              ) : (
                <div className={`
                  rounded-lg flex items-center justify-center shrink-0 flex-shrink-0
                  bg-slate-700 text-sm font-bold
                  ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}
                `}>
                  {authState.user.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`
                transition-all duration-300 overflow-hidden
                ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}
              `}>
                <p className="text-sm font-medium truncate">{authState.user.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{authState.user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 text-sm 
              text-red-400 hover:bg-slate-800 rounded-lg transition-colors group
              ${isCollapsed ? 'md:px-3' : 'px-4'}
            `}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut size={18} />
            <span className={`
              transition-all duration-200
              ${isCollapsed ? 'hidden md:hidden' : 'block'}
            `}>
              Cerrar Sesión
            </span>
          </button>
        </div>

        {/* Collapse Button */}
        <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-50">
          <button
            onClick={toggleCollapse}
            className={`
              bg-slate-700 hover:bg-blue-600 text-white rounded-full p-2
              transition-all duration-300 shadow-lg
            `}
            title={isCollapsed ? 'Expandir' : 'Contraer'}
          >
            <ChevronLeft size={16} className={`
              transition-transform duration-300
              ${isCollapsed ? 'rotate-180' : ''}
            `} />
          </button>
        </div>
      </aside>
    </>
  );
};