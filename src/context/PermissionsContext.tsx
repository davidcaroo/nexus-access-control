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
          'employees:read', 'employees:create', 'employees:update', 'employees:delete',
          'attendance:view', 'attendance:record', 'attendance:delete',
          'leave_requests:view', 'leave_requests:create', 'leave_requests:approve', 'leave_requests:reject',
          'users:read', 'users:create', 'users:update', 'users:delete', 'users:ban',
          'roles:manage', 'permissions:manage'
        ]);
      } else {
        // Para otros roles, obtener permisos del backend
        const data = await apiClient.get('/auth/me/permissions');
        setPermissions(data || []);
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
    return permissions.includes(action);
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