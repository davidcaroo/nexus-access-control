import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../integrations/supabase/client';
import { Card, Button, Badge, Input } from '../../components/UIComponents';
import { CheckCircle, XCircle, Clock, Filter, User, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { LeaveRequest } from '../../types';
import { usePermissions } from '../context/PermissionsContext';

const LeaveRequestsManagement: React.FC = () => {
  const { employees, authState, fetchEmployees, leaveRequests, fetchLeaveRequests, isAppDataLoading } = useContext(AppContext)!;
  const { can } = usePermissions();
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cargar empleados si no están disponibles (aunque App.tsx ya los carga)
  useEffect(() => {
    if (employees.length === 0 && !isAppDataLoading) {
      fetchEmployees();
    }
  }, [employees.length, fetchEmployees, isAppDataLoading]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.nombre : 'Empleado Desconocido';
  };

  const getEmployeeCedula = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.cedula : 'N/A';
  };

  // Función para traducir el tipo de solicitud
  const translateRequestType = (type: LeaveRequest['request_type']) => {
    switch (type) {
      case 'vacation': return 'Vacaciones';
      case 'sick_leave': return 'Baja por Enfermedad';
      case 'day_off': return 'Día Libre';
      default: return type;
    }
  };

  const handleAction = (request: LeaveRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setIsConfirmModalOpen(true);
    if (type === 'reject') {
      setRejectionReason(''); // Reset rejection reason
    }
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType || !authState.user) return;

    setIsProcessing(true);
    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
    const updatePayload: Partial<LeaveRequest> = {
      status: newStatus,
      approved_by: authState.user.id,
      approved_at: new Date().toISOString(),
    };

    if (actionType === 'reject') {
      updatePayload.rejection_reason = rejectionReason;
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', selectedRequest.id);

      if (error) {
        throw error;
      }

      toast.success(`Solicitud ${actionType === 'approve' ? 'aprobada' : 'rechazada'} con éxito.`);
      await fetchLeaveRequests(); // Refrescar la lista a través del contexto
      setIsConfirmModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error("Error al procesar la solicitud:", err);
      toast.error(`Error al ${actionType === 'approve' ? 'aprobar' : 'rechazar'} la solicitud: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = leaveRequests.filter(req => {
    const employeeName = getEmployeeName(req.employee_id).toLowerCase();
    const employeeCedula = getEmployeeCedula(req.employee_id).toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const statusMatch = filterStatus === 'all' || req.status === filterStatus;
    const searchMatch = employeeName.includes(searchLower) || employeeCedula.includes(searchLower);

    return statusMatch && searchMatch;
  });

  const getStatusBadgeColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'blue';
    }
  };

  if (isAppDataLoading) { // Usar el estado de carga global
    return <div className="text-center py-12 text-gray-500">Cargando solicitudes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Solicitudes de Ausencia</h1>
        <p className="text-gray-500">Revise y gestione las solicitudes de vacaciones, días libres y bajas por enfermedad.</p>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Input 
            placeholder="Buscar por empleado o cédula..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full sm:max-w-sm" 
          />
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value as any)} 
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredRequests.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                  <th className="px-6 py-3">Empleado</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Fechas</th>
                  <th className="px-6 py-3">Motivo</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map(req => (
                  <tr key={req.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{getEmployeeName(req.employee_id)}</div>
                      <div className="text-xs text-gray-500 font-mono">{getEmployeeCedula(req.employee_id)}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">{translateRequestType(req.request_type)}</td> {/* Usar la función de traducción */}
                    <td className="px-6 py-4 text-gray-600">
                      {req.start_date} <span className="text-gray-400">a</span> {req.end_date}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{req.reason || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <Badge color={getStatusBadgeColor(req.status)}>{req.status.toUpperCase()}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && can('leave_requests:approve') && (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => handleAction(req, 'approve')}
                            title="Aprobar"
                          >
                            <CheckCircle size={16} />
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => handleAction(req, 'reject')}
                            title="Rechazar"
                          >
                            <XCircle size={16} />
                          </Button>
                        </div>
                      )}
                      {req.status !== 'pending' && <span className="text-gray-400 text-xs">Gestionado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays size={48} className="mx-auto mb-2" />
              <p>No se encontraron solicitudes de ausencia para los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </Card>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedRequest(null);
          setActionType(null);
          setRejectionReason('');
        }}
        onConfirm={confirmAction}
        title={actionType === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
        message={
          actionType === 'approve'
            ? `¿Está seguro de que desea aprobar la solicitud de ${getEmployeeName(selectedRequest?.employee_id || '')} para ${translateRequestType(selectedRequest?.request_type || 'day_off')} del ${selectedRequest?.start_date} al ${selectedRequest?.end_date}?`
            : (
                <div>
                  <p className="mb-4">¿Está seguro de que desea rechazar la solicitud de {getEmployeeName(selectedRequest?.employee_id || '')}?</p>
                  <Input
                    label="Motivo del Rechazo (Opcional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ingrese el motivo del rechazo"
                  />
                </div>
              )
        }
        confirmText={actionType === 'approve' ? 'Aprobar' : 'Rechazar'}
        isConfirming={isProcessing}
        confirmButtonVariant={actionType === 'approve' ? 'primary' : 'danger'}
        icon={actionType === 'approve' ? <CheckCircle className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
        iconBgClass={actionType === 'approve' ? 'bg-green-100' : 'bg-red-100'}
      />
    </div>
  );
};

export default LeaveRequestsManagement;