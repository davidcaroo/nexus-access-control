import React from 'react';
import { Button, Card } from '../../components/UIComponents';
import { X, Clock } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg">Detalle de Horas Extra: {employee.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <img src={employee.foto} alt={employee.nombre} className="w-16 h-16 rounded-full object-cover" />
            <div>
              <p className="text-xl font-bold">{employee.nombre}</p>
              <p className="text-gray-600">{employee.cargo} - {employee.departamento}</p>
              <p className="text-gray-500 text-sm">Horario de Salida Programado: {employee.horario_salida}</p>
            </div>
          </div>

          <Card title={`Horas Extra Acumuladas: ${formatMinutesToHours(totalOvertimeMinutes)}`}>
            {dailyDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida Real</th>
                      <th className="px-4 py-3">Salida Programada</th>
                      <th className="px-4 py-3 text-right">Horas Extra del Día</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dailyDetails.map((detail, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 font-medium">{detail.date}</td>
                        <td className="px-4 py-3">{detail.entryTime}</td>
                        <td className="px-4 py-3">{detail.actualExitTime}</td>
                        <td className="px-4 py-3">{detail.scheduledExitTime}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">
                          {formatMinutesToHours(detail.dailyOvertimeMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock size={32} className="mx-auto mb-2" />
                <p>No se encontraron detalles de horas extra para este empleado en el período seleccionado.</p>
              </div>
            )}
          </Card>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};