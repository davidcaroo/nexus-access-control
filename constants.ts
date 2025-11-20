import { Employee, User, AttendanceRecord } from "./types";

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', name: 'Carlos Admin', role: 'admin' },
  { id: 'u2', username: 'rh', name: 'Ana RRHH', role: 'hr' },
  { id: 'u3', username: 'gerencia', name: 'Roberto Boss', role: 'manager' },
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    cedula: '101010',
    nombre: 'Juan Perez',
    foto: 'https://picsum.photos/200/200?random=1',
    qrCode: 'EMP-101010',
    cargo: 'Desarrollador Senior',
    departamento: 'Tecnología',
    horario: { entrada: '09:00', salida: '18:00' },
    estado: 'activo',
    fechaIngreso: '2023-01-15'
  },
  {
    id: 'e2',
    cedula: '202020',
    nombre: 'Maria Rodriguez',
    foto: 'https://picsum.photos/200/200?random=2',
    qrCode: 'EMP-202020',
    cargo: 'Analista Contable',
    departamento: 'Finanzas',
    horario: { entrada: '08:00', salida: '17:00' },
    estado: 'activo',
    fechaIngreso: '2023-03-10'
  },
  {
    id: 'e3',
    cedula: '303030',
    nombre: 'Pedro Gomez',
    foto: 'https://picsum.photos/200/200?random=3',
    qrCode: 'EMP-303030',
    cargo: 'Gerente de Ventas',
    departamento: 'Ventas',
    horario: { entrada: '09:00', salida: '18:00' },
    estado: 'activo',
    fechaIngreso: '2022-11-01'
  }
];

// Generate some attendance records for the current month
const generateMockRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  // Past 5 days
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    MOCK_EMPLOYEES.forEach(emp => {
      // Entry
      records.push({
        id: `rec-in-${emp.id}-${i}`,
        empleadoId: emp.id,
        tipo: 'entrada',
        fecha: dateStr,
        hora: i === 0 ? '08:55:00' : '09:05:00', // Today on time, past slightly late
        metodo: 'qr',
        tardanza: i !== 0 // simple logic for mock
      });
      // Exit (skip for today if it's morning)
      if (i > 0) {
        records.push({
          id: `rec-out-${emp.id}-${i}`,
          empleadoId: emp.id,
          tipo: 'salida',
          fecha: dateStr,
          hora: '18:05:00',
          metodo: 'qr',
          tardanza: false
        });
      }
    });
  }
  return records;
};

export const MOCK_RECORDS = generateMockRecords();