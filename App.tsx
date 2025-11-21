import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Employee, AttendanceRecord, AuthState } from './types';
import { Layout } from './components/Layout';
import { supabase } from './src/integrations/supabase/client';
import { ToastProvider } from './src/components/ToastProvider';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from './src/context/SidebarContext';
import { PermissionsProvider } from './src/context/PermissionsContext';
import { ProtectedRoute } from './src/components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessTerminal from './pages/AccessTerminal';
import EmployeeManager from './pages/EmployeeManager';
import Reports from './pages/Reports';
import UserManagement from './src/pages/UserManagement';
import OvertimeReport from './pages/OvertimeReport';
import Settings from './src/pages/Settings';
import PublicLeaveRequest from './src/pages/PublicLeaveRequest'; // Importar la nueva página

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
  employees: Employee[];
  records: AttendanceRecord[];
  isSessionLoading: boolean;
  fetchEmployees: () => void;
  fetchRecords: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addRecord: (cedula: string, metodo: 'manual' | 'qr', tipo?: 'entrada' | 'salida') => Promise<{ success: boolean; message: string; employee?: Employee }>;
  addEmployee: (emp: Partial<Employee>) => Promise<{ error: any }>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<{ error: any }>;
} | null>(null);

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    const { data, error } = await supabase.from('employees').select('*').order('nombre', { ascending: true });
    if (!error) setEmployees(data || []);
    else console.error("Error fetching employees:", error);
  }, []);

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
    else console.error("Error fetching records:", error);
  }, []);

  const refreshUser = useCallback(async () => {
    console.log("Refreshing user session...");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session during refresh:", sessionError);
      setAuthState({ isAuthenticated: false, user: null });
      return;
    }

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
      
      if (profileError) {
        console.error("Error fetching profile during refresh:", profileError);
        setAuthState({ isAuthenticated: false, user: null });
        return;
      }

      const roleName = (profile?.roles as { name: string } | null)?.name; // Acceso seguro a la propiedad anidada
      if (profile && roleName && (roleName === 'admin' || roleName === 'superadmin')) {
        const user: User = {
          id: session.user.id,
          email: session.user.email,
          full_name: profile.full_name,
          role: roleName,
          avatar_url: profile.avatar_url,
        };
        setAuthState({ isAuthenticated: true, user });
        console.log("User refreshed and authenticated:", user.full_name);
      } else {
        console.log("User role not admin/superadmin or profile/role missing during refresh. Signing out.");
        await supabase.auth.signOut();
        setAuthState({ isAuthenticated: false, user: null });
      }
    } else {
      console.log("No session user found during refresh.");
      setAuthState({ isAuthenticated: false, user: null });
    }
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchEmployees();
      fetchRecords();
    }
  }, [authState.isAuthenticated, fetchEmployees, fetchRecords]);

  useEffect(() => {
    console.log("Setting up onAuthStateChange listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange event:", event, "session:", session);
      try {
        if (session) {
          console.log("Session found, fetching profile for user:", session.user.id);
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
          
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            throw profileError; // Re-throw to catch block
          }
          console.log("Profile data:", profile);

          const roleName = (profile?.roles as { name: string } | null)?.name; // Acceso seguro a la propiedad anidada
          if (profile && roleName && (roleName === 'admin' || roleName === 'superadmin')) {
            console.log("User is admin/superadmin.");
            const user: User = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name,
              role: roleName,
              avatar_url: profile.avatar_url,
            };
            setAuthState({ isAuthenticated: true, user });
          } else {
            console.log("User role not admin/superadmin or profile/role missing. Signing out.");
            await supabase.auth.signOut();
            setAuthState({ isAuthenticated: false, user: null });
          }
        } else {
          console.log("No session found.");
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        console.log("Setting isSessionLoading to false.");
        setIsSessionLoading(false);
      }
    });

    return () => {
      console.log("Unsubscribing from onAuthStateChange.");
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const recordsChannel = supabase.channel('public:attendance_records').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => fetchRecords()).subscribe();
    const employeesChannel = supabase.channel('public:employees').on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchEmployees()).subscribe();
    const profilesChannel = supabase.channel('public:profiles').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${authState.user?.id}` }, () => refreshUser()).subscribe();

    return () => {
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [authState.isAuthenticated, fetchRecords, fetchEmployees, refreshUser, authState.user?.id]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthState({ isAuthenticated: false, user: null });
  }, []);

  const addRecord = useCallback(async (cedula: string, metodo: 'manual' | 'qr', tipo?: 'entrada' | 'salida') => {
    const { data, error } = await supabase.rpc('register_attendance', {
      p_cedula: cedula,
      p_metodo: metodo,
      p_tipo: tipo,
    });

    if (error) {
      console.error("Error en RPC register_attendance:", error);
      return { success: false, message: 'Error al procesar el registro.' };
    }
    
    return data;
  }, []);

  const addEmployee = useCallback(async (emp: Partial<Employee>) => {
    const { error } = await supabase.from('employees').insert(emp);
    return { error };
  }, []);

  const updateEmployee = useCallback(async (id: string, emp: Partial<Employee>) => {
    const { id: _, ...updateData } = emp;
    const { error } = await supabase.from('employees').update(updateData).eq('id', id);
    return { error };
  }, []);

  const contextValue = useMemo(() => ({ authState, employees, records, isSessionLoading, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords, refreshUser }), [authState, employees, records, isSessionLoading, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords, refreshUser]);

  return (
    <AppContext.Provider value={contextValue}>
      <ToastProvider />
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppContext.Provider>
  );
};

const AppRoutes = () => {
  const { authState, isSessionLoading } = React.useContext(AppContext)!;

  if (isSessionLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={<AccessTerminal />} />
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      <Route path="/request-leave" element={<PublicLeaveRequest />} /> {/* Nueva ruta pública */}
      <Route path="/admin" element={authState.isAuthenticated ? <SidebarProvider><PermissionsProvider><Layout /></PermissionsProvider></SidebarProvider> : <Navigate to="/login" />}>
        <Route element={<ProtectedRoute permission="dashboard:view" />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute permission="employees:view" />}>
          <Route path="employees" element={<EmployeeManager />} />
        </Route>
        <Route element={<ProtectedRoute permission="overtime:view" />}>
          <Route path="overtime" element={<OvertimeReport />} />
        </Route>
        <Route element={<ProtectedRoute permission="users:view" />}>
          <Route path="users" element={<UserManagement />} />
        </Route>
        <Route element={<ProtectedRoute permission="settings:view" />}>
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route element={<ProtectedRoute permission="reports:view" />}>
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route index element={<Navigate to="/admin/dashboard" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;