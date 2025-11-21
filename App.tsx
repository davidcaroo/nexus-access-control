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
  addRecord: (cedula: string, tipo: 'entrada' | 'salida', metodo: 'manual' | 'qr') => Promise<{ success: boolean; message: string; employee?: Employee }>;
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
  }, []);

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
      if (profile) {
        const user: User = {
          id: session.user.id,
          email: session.user.email,
          full_name: profile.full_name,
          // @ts-ignore
          role: profile.roles.name,
          avatar_url: profile.avatar_url,
        };
        setAuthState({ isAuthenticated: true, user });
      }
    }
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchEmployees();
      fetchRecords();
    }
  }, [authState.isAuthenticated, fetchEmployees, fetchRecords]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
          
          // @ts-ignore
          if (profile && profile.roles && (profile.roles.name === 'admin' || profile.roles.name === 'superadmin')) {
            const user: User = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name,
              // @ts-ignore
              role: profile.roles.name,
              avatar_url: profile.avatar_url,
            };
            setAuthState({ isAuthenticated: true, user });
          } else {
            await supabase.auth.signOut();
            setAuthState({ isAuthenticated: false, user: null });
          }
        } else {
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        setIsSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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

  const addRecord = useCallback(async (cedula: string, tipo: 'entrada' | 'salida', metodo: 'manual' | 'qr') => {
    const { data: employee, error: empError } = await supabase.from('employees').select('*').eq('cedula', cedula).single();
    if (empError || !employee) return { success: false, message: 'Empleado no encontrado' };

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8);

    let isLate = false;
    if (tipo === 'entrada' && employee.horario_entrada) {
      const scheduleEntryTime = new Date(`1970-01-01T${employee.horario_entrada}`);
      const actualEntryTime = new Date(`1970-01-01T${currentTime}`);
      isLate = actualEntryTime > scheduleEntryTime;
    }

    const { error } = await supabase.from('attendance_records').insert({ employee_id: employee.id, tipo, metodo, tardanza: isLate, fecha: now.toISOString().split('T')[0], hora: currentTime });
    if (error) return { success: false, message: 'Error al registrar el acceso' };
    return { success: true, message: `Registro exitoso: ${tipo.toUpperCase()}`, employee };
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