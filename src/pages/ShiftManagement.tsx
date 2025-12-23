import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Clock, Calendar, Save, X, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { usePermissions } from '../context/PermissionsContext';
import toast from 'react-hot-toast';

interface ShiftDetail {
    id?: string;
    day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    hora_entrada: string | null;
    hora_salida: string | null;
    hora_almuerzo_inicio: string | null;
    hora_almuerzo_fin: string | null;
    es_dia_laboral: boolean;
}

interface Shift {
    id: string;
    nombre: string;
    descripcion: string;
    is_active: boolean;
    empleados_count: number;
    created_at: string;
    updated_at: string;
    details: ShiftDetail[];
}

const dayNames: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
};

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const ShiftManagement: React.FC = () => {
    const { can } = usePermissions();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        details: dayOrder.map(day => ({
            day_of_week: day as ShiftDetail['day_of_week'],
            hora_entrada: '08:00',
            hora_salida: '17:00',
            hora_almuerzo_inicio: '12:00',
            hora_almuerzo_fin: '13:00',
            es_dia_laboral: day !== 'sunday'
        }))
    });

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/shifts');
            // response ya ES el array, no está en .data
            setShifts(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Error cargando turnos:', error);
            setError('Error al cargar los turnos');
            setShifts([]); // Asegurar que siempre sea un array
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        if (!can('shifts:create')) {
            toast.error('No tienes permisos para crear turnos');
            return;
        }
        setEditingShift(null);
        setFormData({
            nombre: '',
            descripcion: '',
            details: dayOrder.map(day => ({
                day_of_week: day as ShiftDetail['day_of_week'],
                hora_entrada: '08:00',
                hora_salida: '17:00',
                hora_almuerzo_inicio: '12:00',
                hora_almuerzo_fin: '13:00',
                es_dia_laboral: day !== 'sunday'
            }))
        });
        setShowForm(true);
    };

    const handleEdit = (shift: Shift) => {
        if (!can('shifts:update')) {
            toast.error('No tienes permisos para editar turnos');
            return;
        }
        setEditingShift(shift);
        setFormData({
            nombre: shift.nombre,
            descripcion: shift.descripcion || '',
            details: shift.details.map(detail => ({
                ...detail,
                hora_entrada: detail.hora_entrada || '08:00',
                hora_salida: detail.hora_salida || '17:00',
                hora_almuerzo_inicio: detail.hora_almuerzo_inicio || '12:00',
                hora_almuerzo_fin: detail.hora_almuerzo_fin || '13:00'
            }))
        });
        setShowForm(true);
    };

    const openDeleteModal = (shift: Shift) => {
        if (!can('shifts:delete')) {
            toast.error('No tienes permisos para eliminar turnos');
            return;
        }
        setShiftToDelete(shift);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!shiftToDelete) return;

        try {
            await apiClient.delete(`/shifts/${shiftToDelete.id}`);
            toast.success('Turno eliminado exitosamente');
            loadShifts();
            setShowDeleteModal(false);
            setShiftToDelete(null);
        } catch (error: any) {
            console.error('Error eliminando turno:', error);
            const msg = (error && (error.message || (error.response && error.response.data && error.response.data.error))) || 'Error al eliminar el turno';
            toast.error(msg);
            setShowDeleteModal(false);
            setShiftToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validar permisos
        if (editingShift && !can('shifts:update')) {
            toast.error('No tienes permisos para actualizar turnos');
            return;
        }
        if (!editingShift && !can('shifts:create')) {
            toast.error('No tienes permisos para crear turnos');
            return;
        }

        try {
            if (editingShift) {
                await apiClient.put(`/shifts/${editingShift.id}`, formData);
                toast.success('Turno actualizado exitosamente');
            } else {
                await apiClient.post('/shifts', formData);
                toast.success('Turno creado exitosamente');
            }

            setShowForm(false);
            loadShifts();
        } catch (error: any) {
            console.error('Error guardando turno:', error);
            const msg = (error && (error.message || (error.response && error.response.data && error.response.data.error))) || 'Error al guardar el turno';
            toast.error(msg);
        }
    };

    const updateDayDetail = (dayIndex: number, field: keyof ShiftDetail, value: any) => {
        const newDetails = [...formData.details];
        newDetails[dayIndex] = {
            ...newDetails[dayIndex],
            [field]: value
        };
        setFormData({ ...formData, details: newDetails });
    };

    const toggleWorkDay = (dayIndex: number) => {
        const newDetails = [...formData.details];
        newDetails[dayIndex].es_dia_laboral = !newDetails[dayIndex].es_dia_laboral;

        // Si se marca como no laboral, limpiar horarios
        if (!newDetails[dayIndex].es_dia_laboral) {
            newDetails[dayIndex].hora_entrada = null;
            newDetails[dayIndex].hora_salida = null;
            newDetails[dayIndex].hora_almuerzo_inicio = null;
            newDetails[dayIndex].hora_almuerzo_fin = null;
        } else {
            // Si se marca como laboral, poner valores por defecto
            newDetails[dayIndex].hora_entrada = '08:00';
            newDetails[dayIndex].hora_salida = '17:00';
            newDetails[dayIndex].hora_almuerzo_inicio = '12:00';
            newDetails[dayIndex].hora_almuerzo_fin = '13:00';
        }

        setFormData({ ...formData, details: newDetails });
    };

    const copyToAllDays = (dayIndex: number) => {
        const sourceDay = formData.details[dayIndex];
        const newDetails = formData.details.map(day => ({
            ...day,
            hora_entrada: sourceDay.hora_entrada,
            hora_salida: sourceDay.hora_salida,
            hora_almuerzo_inicio: sourceDay.hora_almuerzo_inicio,
            hora_almuerzo_fin: sourceDay.hora_almuerzo_fin,
            es_dia_laboral: day.es_dia_laboral // Mantener el estado de día laboral de cada día
        }));
        setFormData({ ...formData, details: newDetails });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando turnos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-8 h-8 text-blue-600" />
                            Gestión de Horarios
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Configure los turnos y horarios laborales para sus empleados
                        </p>
                    </div>
                    {can('shifts:create') && (
                        <button
                            onClick={handleCreate}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Crear Turno
                        </button>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                        {success}
                    </div>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingShift ? 'Editar Turno' : 'Crear Nuevo Turno'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Información básica */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre del Turno *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ej: Turno Matutino"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Descripción
                                        </label>
                                        <textarea
                                            value={formData.descripcion}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Descripción breve del turno"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* Calendario semanal */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Horarios por Día de la Semana
                                    </h3>

                                    <div className="space-y-3">
                                        {formData.details.map((detail, index) => (
                                            <div
                                                key={detail.day_of_week}
                                                className={`border rounded-lg p-4 ${detail.es_dia_laboral ? 'bg-white' : 'bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={detail.es_dia_laboral}
                                                            onChange={() => toggleWorkDay(index)}
                                                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <label className="text-lg font-semibold text-gray-900">
                                                            {dayNames[detail.day_of_week]}
                                                        </label>
                                                    </div>

                                                    {detail.es_dia_laboral && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToAllDays(index)}
                                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                        >
                                                            <Calendar className="w-4 h-4" />
                                                            Copiar a todos los días
                                                        </button>
                                                    )}
                                                </div>

                                                {detail.es_dia_laboral && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                Entrada
                                                            </label>
                                                            <input
                                                                type="time"
                                                                required
                                                                value={detail.hora_entrada || ''}
                                                                onChange={(e) => updateDayDetail(index, 'hora_entrada', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                Salida
                                                            </label>
                                                            <input
                                                                type="time"
                                                                required
                                                                value={detail.hora_salida || ''}
                                                                onChange={(e) => updateDayDetail(index, 'hora_salida', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                Almuerzo Inicio
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={detail.hora_almuerzo_inicio || ''}
                                                                onChange={(e) => updateDayDetail(index, 'hora_almuerzo_inicio', e.target.value || null)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                                                placeholder="Sin almuerzo"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                Almuerzo Fin
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={detail.hora_almuerzo_fin || ''}
                                                                onChange={(e) => updateDayDetail(index, 'hora_almuerzo_fin', e.target.value || null)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                                                placeholder="Sin almuerzo"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {!detail.es_dia_laboral && (
                                                    <p className="text-sm text-gray-500 italic">Día no laboral</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingShift ? 'Actualizar' : 'Crear'} Turno
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Lista de Turnos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {shifts && shifts.length > 0 && shifts.map((shift) => (
                        <div
                            key={shift.id}
                            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold">{shift.nombre}</h3>
                                        {shift.descripcion && (
                                            <p className="text-blue-100 text-sm mt-1">{shift.descripcion}</p>
                                        )}
                                    </div>
                                    {(can('shifts:update') || can('shifts:delete')) && (
                                        <div className="flex items-center gap-2 ml-4">
                                            {can('shifts:update') && (
                                                <button
                                                    onClick={() => handleEdit(shift)}
                                                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                                                    title="Editar turno"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {can('shifts:delete') && (
                                                <button
                                                    onClick={() => openDeleteModal(shift)}
                                                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                                                    title="Eliminar turno"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Stats */}
                                <div className="flex items-center gap-4 mb-4 text-sm">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <Users className="w-4 h-4" />
                                        <span>{shift.empleados_count} empleado{shift.empleados_count !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${shift.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {shift.is_active ? 'Activo' : 'Inactivo'}
                                    </div>
                                </div>

                                {/* Horarios */}
                                <div className="space-y-2">
                                    {shift.details
                                        .filter(d => d.es_dia_laboral)
                                        .map((detail) => (
                                            <div
                                                key={detail.day_of_week}
                                                className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {dayNames[detail.day_of_week]}
                                                </span>
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {detail.hora_entrada} - {detail.hora_salida}
                                                    </span>
                                                    {detail.hora_almuerzo_inicio && detail.hora_almuerzo_fin && (
                                                        <span className="text-xs text-gray-500">
                                                            (🍽️ {detail.hora_almuerzo_inicio} - {detail.hora_almuerzo_fin})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {shifts && shifts.length === 0 && !loading && (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No hay turnos configurados
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Crea tu primer turno para comenzar a gestionar horarios
                        </p>
                        <button
                            onClick={handleCreate}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Crear Primer Turno
                        </button>
                    </div>
                )}            </div>

            {/* Modal de confirmación de eliminación */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setShiftToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Eliminar Turno"
                message={`¿Estás seguro de eliminar el turno "${shiftToDelete?.nombre}"? Esta acción no se puede deshacer.${shiftToDelete && shiftToDelete.empleados_count > 0
                    ? `\n\nActualmente ${shiftToDelete.empleados_count} empleado${shiftToDelete.empleados_count > 1 ? 's' : ''} tiene${shiftToDelete.empleados_count === 1 ? '' : 'n'} asignado este turno.`
                    : ''
                    }`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default ShiftManagement;
