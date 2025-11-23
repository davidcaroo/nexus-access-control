import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Card, Input, Button } from '../components/UIComponents';
import { Employee, AttendanceRecord, EmployeeOvertimeData, DailyOvertimeDetail } from '../types';
import { Clock, Eye, Download } from 'lucide-react';
import { OvertimeDetailModal } from '../src/components/OvertimeDetailModal';
import { apiClient } from '../src/services/apiClient';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);
  const [overtimeData, setOvertimeData] = useState<EmployeeOvertimeData[]>([]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployeeOvertimeData, setSelectedEmployeeOvertimeData] = useState<EmployeeOvertimeData | null>(null);

  // Cargar horas extra del backend
  const loadOvertimeData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/attendance/overtime/summary', {
        params: { startDate, endDate }
      });

      // Convertir data del backend a formato EmployeeOvertimeData
      const formattedData: EmployeeOvertimeData[] = data.map((item: any) => {
        // Obtener horario_salida del item directamente (viene del backend)
        const horarioSalida = item.horario_salida || item.scheduledExitTime || '';

        return {
          employee: {
            id: item.employeeId,
            nombre: item.nombre,
            foto: item.foto,
            cargo: item.cargo,
            departamento: item.departamento,
            cedula: '',
            horario_entrada: '',
            horario_salida: horarioSalida,
            estado: 'activo',
            fecha_ingreso: ''
          } as Employee,
          totalOvertimeMinutes: item.totalOvertimeMinutes,
          dailyDetails: item.dailyDetails.map((detail: any) => ({
            date: detail.fecha,
            entryTime: detail.horaEntrada,
            actualExitTime: detail.horaSalidaReal,
            scheduledExitTime: detail.horaProgramada,
            dailyOvertimeMinutes: detail.overtimeMinutes
          }))
        };
      });

      setOvertimeData(formattedData);
      toast.success('Horas extra cargadas correctamente');
    } catch (error: any) {
      toast.error('Error al cargar horas extra');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar automáticamente al montar
  useEffect(() => {
    loadOvertimeData();
  }, []);

  const handleOpenDetailModal = (data: EmployeeOvertimeData) => {
    setSelectedEmployeeOvertimeData(data);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployeeOvertimeData(null);
  };

  const downloadCSV = () => {
    const headers = ['Empleado', 'Cargo', 'Departamento', 'Horas Extra'];
    const rows = overtimeData.map(data => [
      data.employee.nombre,
      data.employee.cargo,
      data.employee.departamento,
      formatMinutesToHours(data.totalOvertimeMinutes)
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `horas_extra_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte exportado correctamente');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Horas Extra</h1>
        <p className="text-gray-500">Consulte las horas extra acumuladas por el personal en un rango de fechas.</p>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-wrap items-center gap-4">
          <label className="font-medium text-sm">Desde:</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
          <label className="font-medium text-sm">Hasta:</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />
          <Button
            onClick={loadOvertimeData}
            disabled={loading}
            className="px-4 py-2"
          >
            {loading ? 'Cargando...' : 'Cargar'}
          </Button>
          <Button
            onClick={downloadCSV}
            disabled={overtimeData.length === 0}
            variant="outline"
            className="gap-2 ml-auto"
          >
            <Download size={18} /> Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando horas extra...</div>
          ) : overtimeData.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b text-sm">
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
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
                    <td className="px-4 py-3">{data.employee.cargo}</td>
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