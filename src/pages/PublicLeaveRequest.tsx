import React, { useState } from 'react';
import { Button, Input, Card } from '../../components/UIComponents'; // Ruta corregida
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';
import { CalendarDays, User, Mail } from 'lucide-react';

const PublicLeaveRequest: React.FC = () => {
  const [cedula, setCedula] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [requestType, setRequestType] = useState<'vacation' | 'sick_leave' | 'day_off'>('day_off');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !employeeName || !requestType || !startDate || !endDate) {
      toast.error('Por favor, complete todos los campos obligatorios.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_leave_request', {
        p_cedula: cedula,
        p_employee_name: employeeName,
        p_request_type: requestType,
        p_start_date: startDate,
        p_end_date: endDate,
        p_reason: reason,
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(data.message);
        // Limpiar formulario
        setCedula('');
        setEmployeeName('');
        setRequestType('day_off');
        setStartDate('');
        setEndDate('');
        setReason('');
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      console.error('Error al enviar solicitud:', err);
      toast.error(err.message || 'Ocurrió un error al enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Solicitud de Ausencia</h1>
          <p className="text-gray-500 mt-2">Complete el formulario para solicitar días libres, vacaciones o bajas.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Cédula / ID"
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ingrese su número de identificación"
            required
          />
          <Input
            label="Nombre Completo"
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Ingrese su nombre completo"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Solicitud</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as 'vacation' | 'sick_leave' | 'day_off')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="day_off">Día Libre</option>
              <option value="vacation">Vacaciones</option>
              <option value="sick_leave">Baja por Enfermedad</option>
            </select>
          </div>
          <Input
            label="Fecha de Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Fecha de Fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describa brevemente el motivo de su solicitud..."
            ></textarea>
          </div>
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Enviar Solicitud
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default PublicLeaveRequest;