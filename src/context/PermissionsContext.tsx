import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { AppContext } from '../../App';

interface PermissionsContextType {
  permissions: string[];
  loading: boolean;
  can: (action: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState } = useContext(AppContext)!;
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!authState.isAuthenticated) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Para superadmin, dar todos los permisos
      if (authState.user?.role === 'superadmin') {
        setPermissions([
          // Employees
          'employees:read', 'employees:create', 'employees:update', 'employees:delete',
          // Attendance
          'attendance:view', 'attendance:record', 'attendance:delete',
          // Leave requests
          'leave_requests:view', 'leave_requests:create', 'leave_requests:approve', 'leave_requests:reject',
          // Users
          'users:read', 'users:create', 'users:update', 'users:delete', 'users:ban',
          // Roles & permissions
          'roles:manage', 'permissions:manage',
          // Shifts module permissions (important for admin/superadmin UX)
          'shifts:create', 'shifts:read', 'shifts:update', 'shifts:delete', 'shifts:manage'
        ]);
      } else {
        // Para otros roles, obtener permisos del backend
        const data = await apiClient.get('/auth/me/permissions');
        // El backend devuelve { permissions: [...] }, extraer el array
        const perms = Array.isArray(data) ? data : (data?.permissions || []);
        console.log('Permisos cargados para el usuario:', authState.user?.role, perms);
        setPermissions(perms);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [authState.isAuthenticated, authState.user?.role]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = (action: string): boolean => {
    return Array.isArray(permissions) ? permissions.includes(action) : false;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};