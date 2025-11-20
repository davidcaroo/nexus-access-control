import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { Card, Input } from '../components/UIComponents';
import { Employee, AttendanceRecord } from '../types';
import { Clock } from 'lucide-react';

// Helper para formatear minutos a "Xh Ym"
const formatMinutesToHours = (totalMinutes: number) => {
  if (totalMinutes <= 0) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const OvertimeReport: React.FC = () => {
  const { employees, records } = useContext(AppContext)!;

  // Default date range to the current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayISO = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayISO);

  const overtimeData = useMemo(() => {
    const filteredRecords = records.filter(r => r.fecha >= startDate && r.fecha <= endDate);
    
    const recordsByEmployee: { [key: string]: AttendanceRecord[] } = {};
    for (const record of filteredRecords) {
      if (!recordsByEmployee[record.employee_id]) {
        recordsByEmployee[record.employee_id] = [];
      }
      recordsByEmployee[record.employee_id].push(record);
    }

    const results: { employee: Employee; overtimeMinutes: number }[] = [];

    for (const employee of employees) {
      const employeeRecords = recordsByEmployee[employee.id] || [];
      if (employeeRecords.length === 0) continue;

      let totalOvertime = 0;
      
      const recordsByDate: { [key: string]: AttendanceRecord[] } = {};
      for (const record of employeeRecords) {
        if (!recordsByDate[record.fecha]) recordsByDate[record.fecha] = [];
        recordsByDate[record.fecha].push(record);
      }

      for (const date in recordsByDate) {
        const dailyRecords = recordsByDate[date];
        const lastSalida = dailyRecords
          .filter(r => r.tipo === 'salida')
          .sort((a, b) => b.hora.localeCompare(a.hora))[0];

        if (lastSalida && employee.horario_salida) {
          const scheduleExitTime = new Date(`1970-01-01T${employee.horario_salida}`);
          const actualExitTime = new Date(`1970-01-01T${lastSalida.hora}`);

          if (actualExitTime > scheduleExitTime) {
            const diffMillis = actualExitTime.getTime() - scheduleExitTime.getTime();
            totalOvertime += Math.round(diffMillis / 60000); // Convert to minutes
          }
        }
      }
      
      if (totalOvertime > 0) {
        results.push({ employee, overtimeMinutes: totalOvertime });
      }
    }

    return results.sort((a, b) => b.overtimeMinutes - a.overtimeMinutes);
  }, [employees, records, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Horas Extra</h1>
        <p className="text-gray-500">Consulte las horas extra acumuladas por el personal en un rango de fechas.</p>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center gap-4">
          <label className="font-medium text-sm">Desde:</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
          <label className="font-medium text-sm">Hasta:</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />
        </div>
        <div className="overflow-x-auto">
          {overtimeData.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b text-sm">
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Departamento</th>
                  <th className="px-4 py-3 font-medium text-right">Horas Extra Acumuladas</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {overtimeData.map(({ employee, overtimeMinutes }) => (
                  <tr key={employee.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={employee.foto} alt={employee.nombre} className="w-10 h-10 rounded-full object-cover" />
                        <span className="font-medium">{employee.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{employee.departamento}</td>
                    <td className="px-4 py-3 text-right font-medium text-lg text-blue-600">
                      {formatMinutesToHours(overtimeMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Clock size={48} className="mx-auto mb-2" />
              <p>No se encontraron horas extra para el período seleccionado.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OvertimeReport;