export type Role = 'superadmin' | 'admin' | 'employee';

export interface User {
  id: string;
  email?: string;
  full_name: string;
  role: Role;
}

export interface Employee {
  id: string;
  cedula: string;
  nombre: string;
  foto: string;
  cargo: string;
  departamento: string;
  horario_entrada: string;
  horario_salida: string;
  estado: 'activo' | 'inactivo';
  fecha_ingreso: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  tipo: 'entrada' | 'salida';
  fecha: string; // ISO Date string YYYY-MM-DD
  hora: string; // HH:mm:ss
  metodo: 'qr' | 'manual' | 'facial';
  tardanza: boolean;
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