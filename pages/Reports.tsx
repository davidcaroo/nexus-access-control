import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Button } from '../components/UIComponents';
import { Trash2, AlertTriangle, Clock } from 'lucide-react';
import { ConfirmationModal } from '../src/components/ConfirmationModal';
import { usePermissions } from '../src/context/PermissionsContext';
import { apiClient } from '../src/services/apiClient';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const { authState } = useContext(AppContext)!;
  const { can } = usePermissions();

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAllRecords = async () => {
    setIsDeletingAll(true);
    try {
      await apiClient.delete('/attendance/all');
      toast.success('Todos los registros han sido eliminados');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar registros');
    } finally {
      setIsDeletingAll(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h1>
        <div className="flex gap-2 self-start sm:self-auto">
          {authState.user?.role === 'superadmin' && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirmModal(true)}
              className="gap-2"
            >
              <Trash2 size={18} /> Eliminar Todos
            </Button>
          )}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300 p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Clock className="text-blue-500" size={64} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Disponible Proximamente</h2>
          <p className="text-lg text-gray-600 max-w-md">
            Estamos trabajando en mejorar los reportes de asistencia. Pronto podrás generar reportes detallados,
            análisis de tendencias, y mucho más.
          </p>
          <p className="text-sm text-gray-500 pt-2">
            Mientras tanto, puedes gestionar la asistencia desde el terminal de acceso y monitorear en el dashboard.
          </p>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteAllRecords}
        title="Confirmar Eliminación Masiva"
        message="¿Está absolutamente seguro de que desea eliminar TODOS los registros de asistencia? Esta acción es irreversible y eliminará permanentemente todos los datos de asistencia."
        confirmText="Sí, Eliminar Todo"
        cancelText="Cancelar"
        isConfirming={isDeletingAll}
        confirmButtonVariant="danger"
        icon={<AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />}
        iconBgClass="bg-red-100"
      />
    </div>
  );
};

export default Reports;