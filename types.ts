export type RoleName = 'superadmin' | 'admin' | 'hr_manager' | 'department_head' | 'employee'; // Actualizado para incluir nuevos roles

export interface User {
  id: string;
  email?: string;
  full_name: string;
  role: string; // Now a string representing the role name
  avatar_url?: string;
}

// Nueva interfaz para usuarios gestionados, incluyendo email y estado de bloqueo
export interface ManagedUser extends User {
  email: string;
  is_banned: boolean;
  created_at: string; // Añadir created_at para consistencia con la respuesta de la función edge
}

export interface Employee {
  id: string;
  cedula: string;
  nombre: string;
  foto: string;
  cargo: string;
  departamento: string;
  horario_entrada: string;
  horario_salida:string;
  horario_almuerzo_inicio?: string | null;
  horario_almuerzo_fin?: string | null;
  estado: 'activo' | 'inactivo';
  fecha_ingreso: string;
  qr_code_url?: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  tipo: 'entrada' | 'salida';
  fecha: string; // ISO Date string YYYY-MM-DD
  hora: string; // HH:mm:ss
  metodo: 'qr' | 'manual' | 'facial';
  tardanza: boolean;
  contexto?: 'jornada_entrada' | 'almuerzo_salida' | 'almuerzo_entrada' | 'jornada_salida' | 'otro' | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  request_type: 'vacation' | 'sick_leave' | 'day_off';
  start_date: string; // ISO Date string YYYY-MM-DD
  end_date: string;   // ISO Date string YYYY-MM-DD
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string; // ISO Timestamp
  approved_by?: string; // User ID of the approver
  approved_at?: string; // ISO Timestamp
  rejection_reason?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface GeminiAnalysisResult {
  nombre?: string;
  cedula?: string;
  cargo?: string;
  description?: string;
}

// Nuevas interfaces para Roles y Permisos
export interface Permission {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: RoleName; // Usar el tipo RoleName para el nombre del rol
  description: string;
  created_at: string;
  permissions: string[]; // Array de acciones de permiso (strings)
}

// Nuevas interfaces para el reporte de horas extra
export interface DailyOvertimeDetail {
  date: string;
  entryTime: string;
  actualExitTime: string;
  scheduledExitTime: string;
  dailyOvertimeMinutes: number;
}

export interface EmployeeOvertimeData {
  employee: Employee;
  totalOvertimeMinutes: number;
  dailyDetails: DailyOvertimeDetail[];
}