import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Card, Badge, Button } from '../components/UIComponents';
import { Download, Filter, Trash2, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from '../src/components/ConfirmationModal'; // Importar ConfirmationModal
import { usePermissions } from '../src/context/PermissionsContext'; // Importar usePermissions

const Reports: React.FC = () => {
  const { records, employees, authState, deleteAllAttendanceRecords } = useContext(AppContext)!;
  const { can } = usePermissions(); // Usar usePermissions
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'salida'>('all');

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const filteredRecords = records.filter(r => {
    const dateMatch = r.fecha === filterDate;
    const typeMatch = filterType === 'all' || r.tipo === filterType;
    return dateMatch && typeMatch;
  });

  const downloadCSV = () => {
    const headers = ['ID Registro', 'Empleado', 'Fecha', 'Hora', 'Tipo', 'Tardanza'];
    const rows = filteredRecords.map(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        return [r.id, emp?.nombre || 'Unknown', r.fecha, r.hora, r.tipo, r.tardanza ? 'SI' : 'NO'].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_asistencia_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAllRecords = async () => {
    setIsDeletingAll(true);
    const result = await deleteAllAttendanceRecords();
    if (result.success) {
      // toast.success ya se maneja en deleteAllAttendanceRecords
    } else {
      // toast.error ya se maneja en deleteAllAttendanceRecords
    }
    setIsDeletingAll(false);
    setShowDeleteConfirmModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h1>
        <div className="flex gap-2 self-start sm:self-auto">
          {authState.user?.role === 'superadmin' && ( // Solo superadmin puede ver este botón
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteConfirmModal(true)} 
              className="gap-2"
            >
              <Trash2 size={18} /> Eliminar Todos
            </Button>
          )}
          <Button onClick={downloadCSV} variant="outline" className="gap-2"><Download size={18} /> Exportar CSV</Button>
        </div>
      </div>
      <Card>
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-center">
          <div className="flex items-center gap-2"><Filter size={18} className="text-gray-500" /><span className="font-medium">Filtros:</span></div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">Todos los eventos</option><option value="entrada">Solo Entradas</option><option value="salida">Solo Salidas</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {filteredRecords.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead><tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs"><th className="px-6 py-3">Fecha/Hora</th><th className="px-6 py-3">Empleado</th><th className="px-6 py-3">Departamento</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Estado</th></tr></thead>
              <tbody className="divide-y">
                {filteredRecords.map(rec => {
                  const emp = employees.find(e => e.id === rec.employee_id);
                  return (
                    <tr key={rec.id}>
                      <td className="px-6 py-4"><div className="font-medium">{rec.hora}</div><div className="text-xs text-gray-500">{rec.fecha}</div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-3">{emp?.foto && <img src={emp.foto} className="w-8 h-8 rounded-full object-cover" alt="" />}<span className="font-medium">{emp?.nombre}</span></div></td>
                      <td className="px-6 py-4">{emp?.departamento}</td>
                      <td className="px-6 py-4"><Badge color={rec.tipo === 'entrada' ? 'blue' : 'yellow'}>{rec.tipo.toUpperCase()}</Badge></td>
                      <td className="px-6 py-4">{rec.tardanza ? <Badge color="red">TARDE</Badge> : <span className="text-gray-400">-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">No se encontraron registros para los filtros seleccionados.</div>
          )}
        </div>
      </Card>

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