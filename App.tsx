import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Employee, AttendanceRecord, AuthState, LeaveRequest, ManagedUser, Role, Permission } from './types';
import { Layout } from './components/Layout';
import { ToastProvider } from './src/components/ToastProvider';
import { apiClient } from './src/services/apiClient';
import { useSocket } from './src/hooks/useSocket';
import toast from 'react-hot-toast';
import { LoadingScreen } from './components/LoadingScreen';
import { SidebarProvider } from './src/context/SidebarContext';
import { PermissionsProvider } from './src/context/PermissionsContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccessTerminal from './pages/AccessTerminal';
import EmployeeManager from './pages/EmployeeManager';
import Reports from './pages/Reports';
import ReportsOperational from './pages/ReportsOperational';
import UserManagement from './src/pages/UserManagement';
import OvertimeReport from './pages/OvertimeReport';
import Settings from './src/pages/Settings';
import PublicLeaveRequest from './src/pages/PublicLeaveRequest';
import LeaveRequestsManagement from './src/pages/LeaveRequestsManagement';
import RolePermissionManagement from './src/pages/RolePermissionManagement'; // Importar la nueva página
import ResetPassword from './src/pages/ResetPassword'; // Importar página de restauración de contraseña

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  employees: Employee[];
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  users: ManagedUser[]; // Añadido: Lista de usuarios gestionados
  isSessionLoading: boolean;
  isAppDataLoading: boolean;
  fetchEmployees: () => void;
  fetchRecords: () => void;
  fetchLeaveRequests: () => void;
  fetchUsers: () => Promise<void>; // Añadido: Función para cargar usuarios
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addRecord: (cedula: string, metodo: 'manual' | 'qr', tipo?: 'entrada' | 'salida') => Promise<{ success: boolean; message: string; employee?: Employee }>;
  addEmployee: (emp: Partial<Employee>) => Promise<{ error: any }>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<{ error: any }>;
  deleteEmployee: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteAllEmployees: () => Promise<{ success: boolean; message: string }>;
  deleteAllAttendanceRecords: () => Promise<{ success: boolean; message: string }>; // Nueva función
} | null>(null);

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isAppDataLoading, setIsAppDataLoading] = useState(false);

  // Flags para evitar llamadas simultáneas
  const isFetchingRef = React.useRef({ records: false, employees: false, leaveRequests: false, users: false });

  const fetchEmployees = useCallback(async () => {
    if (isFetchingRef.current.employees) return;
    isFetchingRef.current.employees = true;

    try {
      const data = await apiClient.get('/employees');
      setEmployees(data || []);
      console.log("fetchEmployees: Successfully fetched employees.", data);
    } catch (error) {
      console.error("fetchEmployees: Error fetching employees:", error);
    } finally {
      isFetchingRef.current.employees = false;
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    if (isFetchingRef.current.records) return;
    isFetchingRef.current.records = true;

    try {
      const data = await apiClient.get('/attendance');
      setRecords(data || []);
      console.log("fetchRecords: Successfully fetched attendance records.", data);
    } catch (error) {
      console.error("fetchRecords: Error fetching attendance records:", error);
    } finally {
      isFetchingRef.current.records = false;
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    // Evitar llamadas simultáneas
    if (isFetchingRef.current.leaveRequests) return;
    isFetchingRef.current.leaveRequests = true;

    try {
      const data = await apiClient.get('/leave-requests');
      setLeaveRequests(data || []);
      console.log("fetchLeaveRequests: Successfully fetched leave requests.", data);
    } catch (error) {
      console.error("fetchLeaveRequests: Error fetching leave requests:", error);
    } finally {
      isFetchingRef.current.leaveRequests = false;
    }
  }, []);

  // Nueva función para cargar usuarios desde la función Edge
  const fetchUsers = useCallback(async () => {
    // Solo intentar cargar usuarios si el usuario actual es un superadmin
    if (!authState.isAuthenticated || authState.user?.role !== 'superadmin') {
      console.log("fetchUsers: Not authenticated or not superadmin, skipping user fetch.");
      setUsers([]); // Limpiar usuarios si no está autorizado
      return;
    }
    try {
      console.log("fetchUsers: Attempting to fetch users from API.");
      const data = await apiClient.get('/users');
      setUsers(data);
      console.log("fetchUsers: Successfully fetched users.", data);
    } catch (err: any) {
      console.error("fetchUsers: Error fetching users:", err.message);
      setUsers([]); // Limpiar usuarios en caso de error
    }
  }, [authState.isAuthenticated, authState.user?.role]); // Dependencias para estabilidad

  const refreshUser = useCallback(async () => {
    console.log("Auth Flow (refreshUser): Refreshing user data from backend...");
    try {
      const user = await apiClient.getCurrentUser();
      setAuthState({
        isAuthenticated: true,
        user: user as any,
      });
      console.log("Auth Flow (refreshUser): User data refreshed successfully", user);
    } catch (error) {
      console.error("Auth Flow (refreshUser): Error refreshing user:", error);
      setAuthState({ isAuthenticated: false, user: null });
    }
  }, []);

  // Restaurar sesión desde localStorage al cargar
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log("Auth Flow (restoreSession): Checking for stored token...", !!token);

        if (token) {
          // Verificar que el token sea válido llamando a /auth/me
          const user = await apiClient.getCurrentUser();
          setAuthState({
            isAuthenticated: true,
            user: user as any,
          });
          console.log("Auth Flow (restoreSession): Session restored from localStorage", user);
        } else {
          console.log("Auth Flow (restoreSession): No token found, user not authenticated");
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error("Auth Flow (restoreSession): Error restoring session:", error);
        setAuthState({ isAuthenticated: false, user: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        console.log("Auth Flow (restoreSession): Setting isSessionLoading to false");
        setIsSessionLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Cargar datos de la aplicación cuando el usuario se autentica
  useEffect(() => {
    const loadAppData = async () => {
      if (authState.isAuthenticated) {
        setIsAppDataLoading(true);
        console.log("App Data Load: User authenticated, fetching app data...");
        await Promise.all([
          fetchEmployees(),
          fetchRecords(),
          fetchLeaveRequests(),
          fetchUsers() // Incluir la carga de usuarios aquí
        ]);
        setIsAppDataLoading(false);
        console.log("App Data Load: App data fetched.");
      } else {
        console.log("App Data Load: User not authenticated, skipping app data fetch.");
      }
    };
    loadAppData();
  }, [authState.isAuthenticated, fetchEmployees, fetchRecords, fetchLeaveRequests, fetchUsers]);

  // Ya no necesitamos listener de Supabase - usamos JWT puro con localStorage

  useEffect(() => {
    if (!authState.isAuthenticated) return;

    // Real-time updates manejados exclusivamente por Socket.io (no Supabase)
    console.log("Realtime: Todas las actualizaciones en tiempo real se manejan via Socket.io");
  }, [authState.isAuthenticated, fetchRecords, fetchEmployees, refreshUser, authState.user?.id, fetchLeaveRequests, fetchUsers]);

  // 🔌 WebSocket - Escuchar eventos en tiempo real
  const { isConnected, on, off } = useSocket();

  useEffect(() => {
    if (!authState.isAuthenticated || !isConnected) return;

    console.log('🔌 Configurando listeners de WebSocket...');

    // Evento: Nueva asistencia registrada
    on('attendance:new', (data) => {
      console.log('📍 Nueva asistencia en tiempo real:', data);
      // Pequeño delay para asegurar que el backend procesó correctamente
      setTimeout(() => fetchRecords(), 100);
      toast.success(`${data.employee_name} - ${data.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`);
    });

    // Evento: Nueva solicitud de ausencia
    on('leave-request:new', (data) => {
      console.log('📋 Nueva solicitud de ausencia:', data);
      fetchLeaveRequests();
      toast.success('Nueva solicitud de ausencia recibida');
    });

    // Evento: Solicitud de ausencia actualizada
    on('leave-request:updated', () => {
      console.log('📋 Solicitud de ausencia actualizada');
      fetchLeaveRequests();
      toast.success('Solicitud actualizada');
    });

    // Evento: Empleado actualizado
    on('employee:updated', () => {
      console.log('👤 Empleado actualizado');
      fetchEmployees();
    });

    return () => {
      off('attendance:new');
      off('leave-request:new');
      off('leave-request:updated');
      off('leave-request:updated');
      off('employee:updated');
    };
  }, [isConnected, authState.isAuthenticated, on, off, fetchRecords, fetchLeaveRequests, fetchEmployees]);

  const logout = useCallback(async () => {
    console.log("logout: Signing out user.");
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("logout: Error during logout:", error);
    }
    // Limpiar estado local
    setAuthState({ isAuthenticated: false, user: null });
  }, []);

  const addRecord = useCallback(async (cedula: string, metodo: 'manual' | 'qr', tipo?: 'entrada' | 'salida') => {
    try {
      const response = await apiClient.post('/attendance/record', {
        cedula,
        metodo,
        tipo,
      });
      return response;
    } catch (error: any) {
      console.error("addRecord: Error recording attendance:", error);
      return { success: false, message: error.message || 'Error al procesar el registro.' };
    }
  }, []);

  const addEmployee = useCallback(async (emp: Partial<Employee>) => {
    try {
      const data = await apiClient.post('/employees', emp);
      return { error: null, data };
    } catch (error: any) {
      return { error: error.message };
    }
  }, []);

  const updateEmployee = useCallback(async (id: string, emp: Partial<Employee>) => {
    const { id: _, ...updateData } = emp;
    try {
      const data = await apiClient.patch(`/employees/${id}`, updateData);
      return { error: null, data };
    } catch (error: any) {
      return { error: { message: error.message || 'Error desconocido' } };
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      const data = await apiClient.delete(`/employees/${id}`);
      await fetchEmployees();
      return { success: true, message: data.message };
    } catch (error: any) {
      console.error("Error deleting employee:", error.message);
      return { success: false, message: error.message || 'Error al eliminar el empleado' };
    }
  }, [fetchEmployees]);

  const deleteAllEmployees = useCallback(async () => {
    try {
      const data = await apiClient.delete('/employees');
      await fetchEmployees();
      return { success: true, message: data.message };
    } catch (error: any) {
      console.error("Error deleting all employees:", error.message);
      return { success: false, message: error.message || 'Error al eliminar todos los empleados' };
    }
  }, [fetchEmployees]);

  const deleteAllAttendanceRecords = useCallback(async () => {
    try {
      const data = await apiClient.delete('/attendance');
      toast.success(data.message);
      await fetchRecords(); // Refrescar los registros después de la eliminación
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Error deleting all attendance records:", err.message);
      toast.error(err.message || 'Error al eliminar los registros de asistencia.');
      return { success: false, message: err.message || 'Error al eliminar los registros de asistencia.' };
    }
  }, [fetchRecords]);

  const contextValue = useMemo(() => ({ authState, setAuthState, employees, records, leaveRequests, users, isSessionLoading, isAppDataLoading, logout, addRecord, addEmployee, updateEmployee, deleteEmployee, deleteAllEmployees, fetchEmployees, fetchRecords, fetchLeaveRequests, fetchUsers, refreshUser, deleteAllAttendanceRecords }), [authState, employees, records, leaveRequests, users, isSessionLoading, isAppDataLoading, logout, addRecord, addEmployee, updateEmployee, deleteEmployee, deleteAllEmployees, fetchEmployees, fetchRecords, fetchLeaveRequests, fetchUsers, refreshUser, deleteAllAttendanceRecords]);

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
  const { authState, isSessionLoading, isAppDataLoading } = React.useContext(AppContext)!;

  console.log("AppRoutes: Current authState:", authState);
  console.log("AppRoutes: isSessionLoading:", isSessionLoading);
  console.log("AppRoutes: isAppDataLoading:", isAppDataLoading);

  if (isSessionLoading || isAppDataLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<AccessTerminal />} />
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/request-leave" element={<PublicLeaveRequest />} />
      <Route path="/admin" element={authState.isAuthenticated ? <SidebarProvider><PermissionsProvider><Layout /></PermissionsProvider></SidebarProvider> : <Navigate to="/login" />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<EmployeeManager />} />
        <Route path="leave-requests" element={<LeaveRequestsManagement />} />
        <Route path="overtime" element={<OvertimeReport />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles-permissions" element={<RolePermissionManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports-operational" element={<ReportsOperational />} />
        <Route index element={<Navigate to="/admin/dashboard" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;