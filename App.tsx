import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, MOCK_RECORDS } from './constants';
import { User, Employee, AttendanceRecord, AuthState, Role } from './types';
import { Layout } from './components/Layout';
import { supabase } from './src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

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
  logout: () => void;
  addRecord: (cedula: string, type?: 'entrada' | 'salida') => { success: boolean; message: string; employee?: Employee };
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
} | null>(null);

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('nexus_employees');
    return saved ? JSON.parse(saved) : MOCK_EMPLOYEES;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('nexus_records');
    return saved ? JSON.parse(saved) : MOCK_RECORDS;
  });

  useEffect(() => localStorage.setItem('nexus_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('nexus_records', JSON.stringify(records)), [records]);

  useEffect(() => {
    const fetchSession = async (session: Session | null) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ isAuthenticated: false, user: null });
  };

  const addRecord = (cedula: string, typeOverride?: 'entrada' | 'salida') => {
    const employee = employees.find(e => e.cedula === cedula);
    if (!employee) return { success: false, message: 'Empleado no encontrado' };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('es-ES', { hour12: false });

    let type: 'entrada' | 'salida' = typeOverride || 'entrada';
    if (!typeOverride) {
      const todaysRecords = records.filter(r => r.empleadoId === employee.id && r.fecha === dateStr);
      const lastRecord = todaysRecords.sort((a, b) => b.hora.localeCompare(a.hora))[0];
      type = !lastRecord || lastRecord.tipo === 'salida' ? 'entrada' : 'salida';
    }

    const isLate = type === 'entrada' && now.getHours() >= 9 && now.getMinutes() > 5;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      empleadoId: employee.id,
      tipo: type,
      fecha: dateStr,
      hora: timeStr,
      metodo: 'qr',
      tardanza: isLate
    };

    setRecords(prev => [...prev, newRecord]);
    return { success: true, message: `Registro exitoso: ${type.toUpperCase()}`, employee };
  };

  const addEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const updateEmployee = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  const deleteEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const contextValue = useMemo(() => ({
    authState, employees, records, logout, addRecord, addEmployee, updateEmployee, deleteEmployee
  }), [authState, employees, records]);

  return (
    <AppContext.Provider value={contextValue}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
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