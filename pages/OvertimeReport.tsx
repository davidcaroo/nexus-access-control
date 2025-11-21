import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { Card, Input, Button } from '../components/UIComponents';
import { Employee, AttendanceRecord, EmployeeOvertimeData, DailyOvertimeDetail } from '../types';
import { Clock, Eye } from 'lucide-react';
import { OvertimeDetailModal } from '../src/components/OvertimeDetailModal'; // Importar el nuevo modal

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

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployeeOvertimeData, setSelectedEmployeeOvertimeData] = useState<EmployeeOvertimeData | null>(null);

  const overtimeData = useMemo(() => {
    const filteredRecords = records.filter(r => r.fecha >= startDate && r.fecha <= endDate);
    
    const recordsByEmployee: { [key: string]: AttendanceRecord[] } = {};
    for (const record of filteredRecords) {
      if (!recordsByEmployee[record.employee_id]) {
        recordsByEmployee[record.employee_id] = [];
      }
      recordsByEmployee[record.employee_id].push(record);
    }

    const results: EmployeeOvertimeData[] = [];

    for (const employee of employees) {
      const employeeRecords = recordsByEmployee[employee.id] || [];
      if (employeeRecords.length === 0) continue;

      let totalOvertime = 0;
      const dailyDetails: DailyOvertimeDetail[] = [];
      
      const recordsByDate: { [key: string]: AttendanceRecord[] } = {};
      for (const record of employeeRecords) {
        if (!recordsByDate[record.fecha]) recordsByDate[record.fecha] = [];
        recordsByDate[record.fecha].push(record);
      }

      for (const date in recordsByDate) {
        const dailyRecords = recordsByDate[date];
        const firstEntrada = dailyRecords
          .filter(r => r.tipo === 'entrada')
          .sort((a, b) => a.hora.localeCompare(b.hora))[0]; // Primera entrada
        const lastSalida = dailyRecords
          .filter(r => r.tipo === 'salida')
          .sort((a, b) => b.hora.localeCompare(a.hora))[0]; // Última salida

        if (firstEntrada && lastSalida && employee.horario_salida) {
          const scheduleExitTime = new Date(`1970-01-01T${employee.horario_salida}`);
          const actualExitTime = new Date(`1970-01-01T${lastSalida.hora}`);

          let dailyOvertimeMinutes = 0;
          if (actualExitTime > scheduleExitTime) {
            const diffMillis = actualExitTime.getTime() - scheduleExitTime.getTime();
            dailyOvertimeMinutes = Math.round(diffMillis / 60000); // Convertir a minutos
          }

          if (dailyOvertimeMinutes > 0) {
            totalOvertime += dailyOvertimeMinutes;
            dailyDetails.push({
              date: date,
              entryTime: firstEntrada.hora,
              actualExitTime: lastSalida.hora,
              scheduledExitTime: employee.horario_salida,
              dailyOvertimeMinutes: dailyOvertimeMinutes,
            });
          }
        }
      }
      
      if (totalOvertime > 0) {
        results.push({ employee, totalOvertimeMinutes: totalOvertime, dailyDetails });
      }
    }

    return results.sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes);
  }, [employees, records, startDate, endDate]);

  const handleOpenDetailModal = (data: EmployeeOvertimeData) => {
    setSelectedEmployeeOvertimeData(data);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployeeOvertimeData(null);
  };

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
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {overtimeData.map((data) => (
                  <tr key={data.employee.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={data.employee.foto} alt={data.employee.nombre} className="w-10 h-10 rounded-full object-cover" />
                        <span className="font-medium">{data.employee.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{data.employee.departamento}</td>
                    <td className="px-4 py-3 text-right font-medium text-lg text-blue-600">
                      {formatMinutesToHours(data.totalOvertimeMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDetailModal(data)} title="Ver Detalles">
                        <Eye size={16} />
                      </Button>
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

      {selectedEmployeeOvertimeData && (
        <OvertimeDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          employeeOvertimeData={selectedEmployeeOvertimeData}
        />
      )}
    </div>
  );
};

export default OvertimeReport;