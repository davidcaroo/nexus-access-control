import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Button, Card } from './UIComponents';
import { X, LogIn, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({ isOpen, onClose }) => {
  const { employees, addRecord } = useContext(AppContext)!;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRegister = async (tipo: 'entrada' | 'salida') => {
    if (!selectedEmployeeId) {
      toast.error('Por favor, seleccione un empleado.');
      return;
    }
    
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) {
      toast.error('Empleado no encontrado.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await addRecord(employee.cedula, 'manual', tipo);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsProcessing(false);
      setSelectedEmployeeId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg">Registro Manual de Asistencia</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Empleado
            </label>
            <select
              id="employee-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>-- Elija un empleado --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.cedula})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button 
              onClick={() => handleRegister('entrada')} 
              isLoading={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <LogIn size={18} className="mr-2" /> Registrar Entrada
            </Button>
            <Button 
              onClick={() => handleRegister('salida')} 
              isLoading={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <LogOut size={18} className="mr-2" /> Registrar Salida
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};