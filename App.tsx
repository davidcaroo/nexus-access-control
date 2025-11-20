import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Employee, AttendanceRecord, AuthState, Role } from './types';
import { Layout } from './components/Layout';
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './src/components/ToastProvider';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessTerminal from './pages/AccessTerminal';
import EmployeeManager from './pages/EmployeeManager';
import Reports from './pages/Reports';
import UserManagement from './src/pages/UserManagement';

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
  employees: Employee[];
  records: AttendanceRecord[];
  fetchEmployees: () => void;
  fetchRecords: () => void;
  logout: () => void;
  addRecord: (cedula: string) => Promise<{ success: boolean; message: string; employee?: Employee }>;
  addEmployee: (emp: Partial<Employee>) => Promise<{ error: any }>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<{ error: any }>;
} | null>(null);

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

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
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          const user: User = {
            id: session.user.id,
            email: session.user.email,
            full_name: profile.full_name,
            role: profile.role as Role,
          };
          setAuthState({ isAuthenticated: true, user });
        } else {
          setAuthState({ isAuthenticated: false, user: null });
        }
      } else {
        setAuthState({ isAuthenticated: false, user: null });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => fetchSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => fetchSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ isAuthenticated: false, user: null });
  };

  const addRecord = async (cedula: string) => {
    const { data: employee, error: empError } = await supabase.from('employees').select('*').eq('cedula', cedula).single();
    if (empError || !employee) return { success: false, message: 'Empleado no encontrado' };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const { data: todaysRecords } = await supabase.from('attendance_records').select('tipo').eq('employee_id', employee.id).eq('fecha', dateStr).order('hora', { ascending: false });
    const lastRecord = todaysRecords?.[0];
    const type = !lastRecord || lastRecord.tipo === 'salida' ? 'entrada' : 'salida';

    const isLate = type === 'entrada' && now.toTimeString().slice(0, 8) > employee.horario_entrada;

    const { error } = await supabase.from('attendance_records').insert({
      employee_id: employee.id,
      tipo: type,
      metodo: 'qr',
      tardanza: isLate
    });

    if (error) return { success: false, message: 'Error al registrar el acceso' };
    
    fetchRecords();
    return { success: true, message: `Registro exitoso: ${type.toUpperCase()}`, employee };
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
    authState, employees, records, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords
  }), [authState, employees, records, fetchEmployees, fetchRecords]);

  return (
    <AppContext.Provider value={contextValue}>
      <ToastProvider />
      <HashRouter><AppRoutes /></HashRouter>
    </AppContext.Provider>
  );
};

const AppRoutes = () => {
  const { authState } = React.useContext(AppContext)!;
  return (
    <Routes>
      <Route path="/" element={<AccessTerminal />} />
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      <Route path="/admin" element={authState.isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="dashboard" element={<Dashboard />} />
        {(authState.user?.role === 'admin' || authState.user?.role === 'superadmin') && (
          <Route path="employees" element={<EmployeeManager />} />
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