import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Employee, AttendanceRecord, AuthState, Role } from './types';
import { Layout } from './components/Layout';
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './src/components/ToastProvider';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessTerminal from './pages/AccessTerminal';
import EmployeeManager from './pages/EmployeeManager';
import Reports from './pages/Reports';
import UserManagement from './src/pages/UserManagement';
import OvertimeReport from './pages/OvertimeReport';

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
  employees: Employee[];
  records: AttendanceRecord[];
  isSessionLoading: boolean;
  fetchEmployees: () => void;
  fetchRecords: () => void;
  logout: () => void;
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
    if (!authState.isAuthenticated) return;
    const { data, error } = await supabase.from('employees').select('*').order('nombre', { ascending: true });
    if (!error) setEmployees(data || []);
  }, [authState.isAuthenticated]);

  const fetchRecords = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    const { data, error } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
  }, [authState.isAuthenticated]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchEmployees();
      fetchRecords();
    }
  }, [authState.isAuthenticated, fetchEmployees, fetchRecords]);

  useEffect(() => {
    const fetchSession = async (session: Session | null) => {
      try {
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          
          if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
            const user: User = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name,
              role: profile.role as Role,
            };
            setAuthState({ isAuthenticated: true, user });
          } else {
            if (profile && profile.role === 'employee') {
              toast.error('Los empleados no tienen acceso al panel de administración.');
            }
            await supabase.auth.signOut();
            setAuthState({ isAuthenticated: false, user: null });
          }
        } else {
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        setIsSessionLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => fetchSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => fetchSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const channel = supabase
      .channel('public:attendance_records')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_records' },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.isAuthenticated, fetchRecords]);

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ isAuthenticated: false, user: null });
  };

  const addRecord = async (cedula: string, tipo: 'entrada' | 'salida', metodo: 'manual' | 'qr') => {
    const { data: employee, error: empError } = await supabase.from('employees').select('*').eq('cedula', cedula).single();
    if (empError || !employee) return { success: false, message: 'Empleado no encontrado' };

    const now = new Date();
    
    const isLate = tipo === 'entrada' && now.toTimeString().slice(0, 8) > employee.horario_entrada;

    const { error } = await supabase.from('attendance_records').insert({
      employee_id: employee.id,
      tipo: tipo,
      metodo: metodo,
      tardanza: isLate
    });

    if (error) return { success: false, message: 'Error al registrar el acceso' };
    
    fetchRecords();
    return { success: true, message: `Registro exitoso: ${tipo.toUpperCase()}`, employee };
  };

  const addEmployee = async (emp: Partial<Employee>) => {
    const { error } = await supabase.from('employees').insert(emp);
    if (!error) fetchEmployees();
    return { error };
  };

  const updateEmployee = async (id: string, emp: Partial<Employee>) => {
    const { id: _, ...updateData } = emp; // Exclude id from the update payload
    const { error } = await supabase.from('employees').update(updateData).eq('id', id);
    if (!error) fetchEmployees();
    return { error };
  };

  const contextValue = useMemo(() => ({
    authState, employees, records, isSessionLoading, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords
  }), [authState, employees, records, isSessionLoading, fetchEmployees, fetchRecords]);

  return (
    <AppContext.Provider value={contextValue}>
      <ToastProvider />
      <HashRouter><AppRoutes /></HashRouter>
    </AppContext.Provider>
  );
};

const AppRoutes = () => {
  const { authState, isSessionLoading } = React.useContext(AppContext)!;

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AccessTerminal />} />
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      <Route path="/admin" element={authState.isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="dashboard" element={<Dashboard />} />
        {(authState.user?.role === 'admin' || authState.user?.role === 'superadmin') && (
          <>
            <Route path="employees" element={<EmployeeManager />} />
            <Route path="overtime" element={<OvertimeReport />} />
          </>
        )}
        {authState.user?.role === 'superadmin' && (
          <Route path="users" element={<UserManagement />} />
        )}
        <Route path="reports" element={<Reports />} />
        <Route index element={<Navigate to="/admin/dashboard" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;