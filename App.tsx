import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MOCK_USERS, MOCK_EMPLOYEES, MOCK_RECORDS } from './constants';
import { User, Employee, AttendanceRecord, AuthState } from './types';
import { Layout } from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessTerminal from './pages/AccessTerminal';
import EmployeeManager from './pages/EmployeeManager';
import Reports from './pages/Reports';

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
  employees: Employee[];
  records: AttendanceRecord[];
  login: (u: string, p: string) => boolean;
  logout: () => void;
  addRecord: (cedula: string, type?: 'entrada' | 'salida') => { success: boolean; message: string; employee?: Employee };
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
} | null>(null);

const App: React.FC = () => {
  // Initialize state from localStorage or constants
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('nexus_auth');
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('nexus_employees');
    return saved ? JSON.parse(saved) : MOCK_EMPLOYEES;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('nexus_records');
    return saved ? JSON.parse(saved) : MOCK_RECORDS;
  });

  // Persistence
  useEffect(() => localStorage.setItem('nexus_auth', JSON.stringify(authState)), [authState]);
  useEffect(() => localStorage.setItem('nexus_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('nexus_records', JSON.stringify(records)), [records]);

  // Actions
  const login = (username: string, _: string): boolean => {
    // Password check ignored for demo
    const user = MOCK_USERS.find(u => u.username === username);
    if (user) {
      setAuthState({ isAuthenticated: true, user });
      return true;
    }
    return false;
  };

  const logout = () => setAuthState({ isAuthenticated: false, user: null });

  const addRecord = (cedula: string, typeOverride?: 'entrada' | 'salida') => {
    const employee = employees.find(e => e.cedula === cedula);
    if (!employee) return { success: false, message: 'Empleado no encontrado' };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('es-ES', { hour12: false });

    // Logic to determine entry/exit if not forced
    let type: 'entrada' | 'salida' = typeOverride || 'entrada';
    
    if (!typeOverride) {
      const todaysRecords = records.filter(r => r.empleadoId === employee.id && r.fecha === dateStr);
      const lastRecord = todaysRecords.sort((a, b) => b.hora.localeCompare(a.hora))[0];
      
      if (!lastRecord || lastRecord.tipo === 'salida') {
        type = 'entrada';
      } else {
        type = 'salida';
      }
    }

    // Simple lateness logic (hardcoded 9am)
    const isLate = type === 'entrada' && now.getHours() >= 9 && now.getMinutes() > 5;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      empleadoId: employee.id,
      tipo: type,
      fecha: dateStr,
      hora: timeStr,
      metodo: 'qr', // Assuming manual input counts as verified for this context
      tardanza: isLate
    };

    setRecords(prev => [...prev, newRecord]);
    return { success: true, message: `Registro exitoso: ${type.toUpperCase()}`, employee };
  };

  const addEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const updateEmployee = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  const deleteEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const contextValue = useMemo(() => ({
    authState, employees, records, login, logout, addRecord, addEmployee, updateEmployee, deleteEmployee
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
      {/* Public Access Terminal - Default Route */}
      <Route path="/" element={<AccessTerminal />} />

      {/* Admin Login */}
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      
      {/* Protected Admin Routes */}
      <Route path="/admin" element={authState.isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<EmployeeManager />} />
        <Route path="reports" element={<Reports />} />
        <Route index element={<Navigate to="/admin/dashboard" />} />
      </Route>
      
      {/* Catch all redirect to root */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;