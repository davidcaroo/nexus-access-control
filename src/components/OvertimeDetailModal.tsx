import React from 'react';
import { Button, Card, Badge } from '../../components/UIComponents';
import { X, Clock, Download } from 'lucide-react';
import { EmployeeOvertimeData, DailyOvertimeDetail } from '../../types';

interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeOvertimeData: EmployeeOvertimeData;
}

// Helper para formatear minutos a "Xh Ym" (duplicado para auto-contención del modal)
const formatMinutesToHours = (totalMinutes: number) => {
  if (totalMinutes <= 0) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const OvertimeDetailModal: React.FC<OvertimeDetailModalProps> = ({
  isOpen,
  onClose,
  employeeOvertimeData,
}) => {
  if (!isOpen) return null;

  const { employee, totalOvertimeMinutes, dailyDetails } = employeeOvertimeData;

  const downloadDetailCSV = () => {
    const headers = ['Fecha', 'Hora Entrada', 'Hora Salida Real', 'Hora Salida Programada', 'Horas Extra del Día'];
    const rows = dailyDetails.map(detail => [
      detail.date,
      detail.entryTime,
      detail.actualExitTime,
      detail.scheduledExitTime,
      formatMinutesToHours(detail.dailyOvertimeMinutes)
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `horas_extra_detalle_${employee.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg">Detalle de Horas Extra: {employee.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Información del Empleado */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <img src={employee.foto} alt={employee.nombre} className="w-16 h-16 rounded-full object-cover" />
            <div className="flex-1">
              <p className="text-xl font-bold">{employee.nombre}</p>
              <p className="text-gray-600">{employee.cargo} - {employee.departamento}</p>
              <p className="text-gray-500 text-sm">Horario de Salida Programado: <span className="font-medium">{employee.horario_salida}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Horas Extra Acumuladas</p>
              <p className="text-3xl font-bold text-blue-600">{formatMinutesToHours(totalOvertimeMinutes)}</p>
            </div>
          </div>

          {/* Tabla de Detalles */}
          {dailyDetails.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg">Detalle por Día</h4>
                <Button
                  onClick={downloadDetailCSV}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download size={16} /> Exportar CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs font-medium">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Hora Entrada</th>
                      <th className="px-4 py-3">Hora Salida Real</th>
                      <th className="px-4 py-3">Hora Salida Programada</th>
                      <th className="px-4 py-3 text-right">Horas Extra del Día</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dailyDetails.map((detail, index) => {
                      // Formatear fecha a DD/MM/YYYY
                      // detail.date puede ser: "2025-11-22" o un string de Date
                      let formattedDate = detail.date;

                      if (typeof detail.date === 'string') {
                        if (detail.date.includes('-') && detail.date.length === 10) {
                          // Formato ISO: YYYY-MM-DD
                          const [year, month, day] = detail.date.split('-');
                          formattedDate = `${day}/${month}/${year}`;
                        } else if (detail.date.includes('T') || detail.date.includes('GMT')) {
                          // Es un Date string, extraer la fecha
                          try {
                            const dateObj = new Date(detail.date);
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const year = dateObj.getFullYear();
                            formattedDate = `${day}/${month}/${year}`;
                          } catch (e) {
                            formattedDate = detail.date;
                          }
                        }
                      }

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{formattedDate}</td>
                          <td className="px-4 py-3 text-green-600 font-medium">{detail.entryTime}</td>
                          <td className="px-4 py-3">{detail.actualExitTime}</td>
                          <td className="px-4 py-3 text-gray-600">{detail.scheduledExitTime}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge color="blue">{formatMinutesToHours(detail.dailyOvertimeMinutes)}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen de Estadísticas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Días</p>
                  <p className="text-2xl font-bold text-blue-600">{dailyDetails.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Promedio por Día</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMinutesToHours(Math.round(totalOvertimeMinutes / dailyDetails.length))}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Máximo en un Día</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatMinutesToHours(Math.max(...dailyDetails.map(d => d.dailyOvertimeMinutes)))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock size={32} className="mx-auto mb-2" />
              <p>No se encontraron detalles de horas extra para este empleado en el período seleccionado.</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};