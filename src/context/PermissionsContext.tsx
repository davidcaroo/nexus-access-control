import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
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
      const { data, error } = await supabase.rpc('get_my_permissions');
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [authState.isAuthenticated]);

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