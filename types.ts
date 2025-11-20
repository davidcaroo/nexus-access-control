export type Role = 'admin' | 'hr' | 'manager';

export interface User {
  id: string;
  email?: string;
  name: string;
  role: Role | null; // Role can be null for new users without a profile
}

export interface Employee {
  id: string;
  cedula: string;
  nombre: string;
  foto: string; // URL or Base64
  qrCode: string;
  cargo: string;
  departamento: string;
  horario: {
    entrada: string;
    salida: string;
  };
  estado: 'activo' | 'inactivo';
  fechaIngreso: string;
}

export interface AttendanceRecord {
  id: string;
  empleadoId: string;
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
  cargo?: string; // Inferred
  description?: string;
}