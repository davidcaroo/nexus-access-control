import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Employee, AttendanceRecord, AuthState, LeaveRequest, ManagedUser, Role, Permission } from './types'; // Importar Role y Permission
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
import PublicLeaveRequest from './src/pages/PublicLeaveRequest';
import LeaveRequestsManagement from './src/pages/LeaveRequestsManagement';
import RolePermissionManagement from './src/pages/RolePermissionManagement'; // Importar la nueva página

// Context for global state
export const AppContext = React.createContext<{
  authState: AuthState;
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
  deleteAllAttendanceRecords: () => Promise<{ success: boolean; message: string }>; // Nueva función
} | null>(null);

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]); // Nuevo estado para usuarios
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isAppDataLoading, setIsAppDataLoading] = useState(false);

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

  const fetchLeaveRequests = useCallback(async () => {
    const { data, error } = await supabase.from('leave_requests').select('*').order('requested_at', { ascending: false });
    if (!error) setLeaveRequests(data || []);
    else console.error("Error fetching leave requests:", error);
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
      console.log("fetchUsers: Attempting to fetch users from edge function.");
      const { data, error: invokeError } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
      });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setUsers(data);
      console.log("fetchUsers: Successfully fetched users.", data);
    } catch (err: any) {
      console.error("fetchUsers: Error fetching users from edge function:", err.message);
      setUsers([]); // Limpiar usuarios en caso de error
    }
  }, [authState.isAuthenticated, authState.user?.role]); // Dependencias para estabilidad

  const refreshUser = useCallback(async () => {
    console.log("Auth Flow (refreshUser): Refreshing user session...");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Auth Flow (refreshUser): Error getting session during refresh:", sessionError);
      setAuthState({ isAuthenticated: false, user: null });
      return;
    }

    if (session?.user) {
      console.log("Auth Flow (refreshUser): Session user found. User ID:", session.user.id);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
      
      if (profileError) {
        console.error("Auth Flow (refreshUser): Error fetching profile during refresh:", profileError);
        setAuthState({ isAuthenticated: false, user: null });
        return;
      }
      console.log("Auth Flow (refreshUser): Raw profile data:", profile); // Nuevo log
      console.log("Auth Flow (refreshUser): Profile roles property:", profile?.roles); // Nuevo log

      const roleName = (profile?.roles as { name: string } | null)?.name;
      console.log("Auth Flow (refreshUser): Extracted role name:", roleName);

      if (profile && roleName && (roleName === 'admin' || roleName === 'superadmin' || roleName === 'hr_manager' || roleName === 'department_head')) { // Incluir nuevos roles
        const user: User = {
          id: session.user.id,
          email: session.user.email,
          full_name: profile.full_name,
          role: roleName,
          avatar_url: profile.avatar_url,
        };
        setAuthState({ isAuthenticated: true, user });
        console.log("Auth Flow (refreshUser): AuthState updated to authenticated. User:", user.full_name, "Role:", user.role);
      } else {
        console.warn("Auth Flow (refreshUser): User role not authorized or profile/role missing. Role:", roleName, "Profile exists:", !!profile);
        await supabase.auth.signOut();
        setAuthState({ isAuthenticated: false, user: null });
      }
    } else {
      console.log("Auth Flow (refreshUser): No session user found during refresh.");
      setAuthState({ isAuthenticated: false, user: null });
    }
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

  useEffect(() => {
    console.log("Auth Flow (onAuthStateChange): Setting up listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Flow (onAuthStateChange): Event:", event, "Session:", session);
      try {
        if (session) {
          console.log("Auth Flow (onAuthStateChange): Session found. User ID:", session.user.id);
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*, roles(name)').eq('id', session.user.id).single();
          
          if (profileError) {
            console.error("Auth Flow (onAuthStateChange): Error fetching profile:", profileError);
            throw profileError;
          }
          console.log("Auth Flow (onAuthStateChange): Raw profile data:", profile); // Nuevo log
          console.log("Auth Flow (onAuthStateChange): Profile roles property:", profile?.roles); // Nuevo log

          const roleName = (profile?.roles as { name: string } | null)?.name;
          console.log("Auth Flow (onAuthStateChange): Extracted role name:", roleName);

          if (profile && roleName && (roleName === 'admin' || roleName === 'superadmin' || roleName === 'hr_manager' || roleName === 'department_head')) { // Incluir nuevos roles
            console.log("Auth Flow (onAuthStateChange): User has an authorized role.");
            const user: User = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name,
              role: roleName,
              avatar_url: profile.avatar_url,
            };
            setAuthState({ isAuthenticated: true, user });
            console.log("Auth Flow (onAuthStateChange): AuthState updated to authenticated. User:", user.full_name, "Role:", user.role);
          } else {
            console.warn("Auth Flow (onAuthStateChange): User role not authorized or profile/role missing. Role:", roleName, "Profile exists:", !!profile);
            await supabase.auth.signOut();
            setAuthState({ isAuthenticated: false, user: null });
          }
        } else {
          console.log("Auth Flow (onAuthStateChange): No session found.");
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error("Auth Flow (onAuthStateChange): Error handling auth state change:", error);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        console.log("Auth Flow (onAuthStateChange): Setting isSessionLoading to false.");
        setIsSessionLoading(false);
      }
    });

    return () => {
      console.log("Auth Flow (onAuthStateChange): Unsubscribing from listener.");
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.isAuthenticated) return;

    console.log("Realtime: Setting up channels for authenticated user.");
    const recordsChannel = supabase.channel('public:attendance_records').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => { console.log("Realtime: attendance_records change, refetching."); fetchRecords(); }).subscribe();
    const employeesChannel = supabase.channel('public:employees').on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => { console.log("Realtime: employees change, refetching."); fetchEmployees(); }).subscribe();
    const profilesChannel = supabase.channel('public:profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      console.log("Realtime: profiles change, refreshing user and fetching users.");
      refreshUser(); // Para el perfil del usuario actual
      fetchUsers(); // Para la lista de usuarios en UserManagement
    }).subscribe();
    const leaveRequestsChannel = supabase.channel('public:leave_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => { console.log("Realtime: leave_requests change, refetching."); fetchLeaveRequests(); }).subscribe();
    const rolesChannel = supabase.channel('public:roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => { console.log("Realtime: roles change, refreshing user."); refreshUser(); }).subscribe(); // Refresh user if roles change
    const rolePermissionsChannel = supabase.channel('public:role_permissions').on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => { console.log("Realtime: role_permissions change, refreshing user."); refreshUser(); }).subscribe(); // Refresh user if role permissions change


    return () => {
      console.log("Realtime: Unsubscribing from channels.");
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(leaveRequestsChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(rolePermissionsChannel);
    };
  }, [authState.isAuthenticated, fetchRecords, fetchEmployees, refreshUser, authState.user?.id, fetchLeaveRequests, fetchUsers]);

  const logout = useCallback(async () => {
    console.log("logout: Signing out user.");
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
      console.error("addRecord: Error in RPC register_attendance:", error);
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

  const deleteAllAttendanceRecords = useCallback(async () => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-attendance', {
        method: 'DELETE',
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message);
      await fetchRecords(); // Refrescar los registros después de la eliminación
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Error deleting all attendance records:", err.message);
      toast.error(err.message || 'Error al eliminar los registros de asistencia.');
      return { success: false, message: err.message || 'Error al eliminar los registros de asistencia.' };
    }
  }, [fetchRecords]);

  const contextValue = useMemo(() => ({ authState, employees, records, leaveRequests, users, isSessionLoading, isAppDataLoading, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords, fetchLeaveRequests, fetchUsers, refreshUser, deleteAllAttendanceRecords }), [authState, employees, records, leaveRequests, users, isSessionLoading, isAppDataLoading, logout, addRecord, addEmployee, updateEmployee, fetchEmployees, fetchRecords, fetchLeaveRequests, fetchUsers, refreshUser, deleteAllAttendanceRecords]);

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

  if (isSessionLoading || isAppDataLoading) { // Usar ambos estados de carga
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={<AccessTerminal />} />
      <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/admin/dashboard" />} />
      <Route path="/request-leave" element={<PublicLeaveRequest />} />
      <Route path="/admin" element={authState.isAuthenticated ? <SidebarProvider><PermissionsProvider><Layout /></PermissionsProvider></SidebarProvider> : <Navigate to="/login" />}>
        <Route element={<ProtectedRoute permission="dashboard:view" />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute permission="employees:view" />}>
          <Route path="employees" element={<EmployeeManager />} />
        </Route>
        <Route element={<ProtectedRoute permission="leave_requests:view" />}>
          <Route path="leave-requests" element={<LeaveRequestsManagement />} />
        </Route>
        <Route element={<ProtectedRoute permission="overtime:view" />}>
          <Route path="overtime" element={<OvertimeReport />} />
        </Route>
        <Route element={<ProtectedRoute permission="users:view" />}>
          <Route path="users" element={<UserManagement />} />
        </Route>
        <Route element={<ProtectedRoute permission="roles_permissions:manage" />}> {/* Nueva ruta protegida */}
          <Route path="roles-permissions" element={<RolePermissionManagement />} />
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