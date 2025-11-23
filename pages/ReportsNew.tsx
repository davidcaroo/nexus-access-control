import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { Card, Badge, Button } from '../components/UIComponents';
import { Download, Trash2, AlertTriangle, Check, X, Calendar, BarChart3 } from 'lucide-react';
import { ConfirmationModal } from '../src/components/ConfirmationModal';
import { usePermissions } from '../src/context/PermissionsContext';
import { apiClient } from '../src/services/apiClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailyRecord {
    empleado_id: string;
    empleado: string;
    horaEntrada: string;
    horaSalida: string;
    metodo: string;
    tardanza: number;
    esTardanza: boolean;
    estado: string;
}

interface TardanzaRecord {
    empleado_id: string;
    empleado: string;
    fecha: string;
    horaReal: string;
    horaPlaneada: string;
    minutosTarde: number;
}

interface TardanzaResumen {
    nombre: string;
    totalVeces: number;
    totalMinutos: number;
    promedioMinutos: number;
    registros: TardanzaRecord[];
}

const Reports: React.FC = () => {
    const { authState } = useContext(AppContext)!;
    const { can } = usePermissions();

    // Tabs
    const [activeTab, setActiveTab] = useState<'diario' | 'tardanzas'>('diario');

    // Reporte Diario
    const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);

    // Reporte de Tardanzas
    const [tardanzasStartDate, setTardanzasStartDate] = useState(
        new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
    );
    const [tardanzasEndDate, setTardanzasEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [tardanzasRecords, setTardanzasRecords] = useState<TardanzaRecord[]>([]);
    const [tardanzasResumen, setTardanzasResumen] = useState<TardanzaResumen[]>([]);
    const [tardanzasLoading, setTardanzasLoading] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    // Cargar reporte diario
    const loadDailyReport = async () => {
        setDailyLoading(true);
        try {
            const data = await apiClient.get('/attendance/daily', {
                params: { date: dailyDate }
            });
            setDailyRecords(data || []);
            toast.success('Reporte diario cargado');
        } catch (error: any) {
            toast.error('Error al cargar reporte diario');
            console.error(error);
        } finally {
            setDailyLoading(false);
        }
    };

    // Cargar reporte de tardanzas
    const loadTardanzasReport = async () => {
        setTardanzasLoading(true);
        try {
            const data = await apiClient.get('/attendance/tardanzas', {
                params: { startDate: tardanzasStartDate, endDate: tardanzasEndDate }
            });
            setTardanzasRecords(data.detalle || []);
            setTardanzasResumen(data.resumen || []);
            toast.success('Reporte de tardanzas cargado');
        } catch (error: any) {
            toast.error('Error al cargar reporte de tardanzas');
            console.error(error);
        } finally {
            setTardanzasLoading(false);
        }
    };

    // Cargar reporte diario automáticamente
    useEffect(() => {
        loadDailyReport();
    }, []);

    // Estadísticas diarias
    const dailyStats = useMemo(() => {
        const presentes = dailyRecords.filter(r => r.estado === 'Presente').length;
        const ausentes = dailyRecords.filter(r => r.estado === 'Ausente').length;
        const tardanzas = dailyRecords.filter(r => r.esTardanza).length;
        return { presentes, ausentes, tardanzas };
    }, [dailyRecords]);

    // Gráfica de tardanzas (resumen)
    const tardanzasChartData = useMemo(() => {
        return tardanzasResumen.map(r => ({
            nombre: r.nombre.split(' ')[0],
            veces: r.totalVeces,
            minutos: r.promedioMinutos
        }));
    }, [tardanzasResumen]);

    const downloadDailyCSV = () => {
        const headers = ['Empleado', 'Hora Entrada', 'Hora Salida', 'Método', 'Tardanza', 'Estado'];
        const rows = dailyRecords.map(r => [
            r.empleado,
            r.horaEntrada,
            r.horaSalida,
            r.metodo,
            r.esTardanza ? `${r.tardanza} min` : 'No',
            r.estado
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_diario_${dailyDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Reporte diario exportado');
    };

    const downloadTardanzasCSV = () => {
        const headers = ['Empleado', 'Fecha', 'Hora Real', 'Hora Planificada', 'Minutos Tarde'];
        const rows = tardanzasRecords.map(r => [
            r.empleado,
            r.fecha,
            r.horaReal,
            r.horaPlaneada,
            r.minutosTarde
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_tardanzas_${tardanzasStartDate}_a_${tardanzasEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Reporte de tardanzas exportado');
    };

    const handleDeleteAllRecords = async () => {
        setIsDeletingAll(true);
        try {
            await apiClient.delete('/attendance/all');
            toast.success('Todos los registros han sido eliminados');
            setDailyRecords([]);
            setTardanzasRecords([]);
            setTardanzasResumen([]);
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
                <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
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

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('diario')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'diario'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                >
                    <Calendar className="inline mr-2" size={18} />
                    Reporte Diario
                </button>
                <button
                    onClick={() => setActiveTab('tardanzas')}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'tardanzas'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                >
                    <BarChart3 className="inline mr-2" size={18} />
                    Tardanzas
                </button>
            </div>

            {/* REPORTE DIARIO */}
            {activeTab === 'diario' && (
                <div className="space-y-6">
                    <Card>
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Fecha:</label>
                                    <input
                                        type="date"
                                        value={dailyDate}
                                        onChange={e => setDailyDate(e.target.value)}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <Button
                                    onClick={loadDailyReport}
                                    variant="default"
                                    disabled={dailyLoading}
                                    className="px-4 py-2"
                                >
                                    {dailyLoading ? 'Cargando...' : 'Cargar'}
                                </Button>
                                <Button
                                    onClick={downloadDailyCSV}
                                    variant="outline"
                                    disabled={dailyRecords.length === 0}
                                    className="gap-2"
                                >
                                    <Download size={18} /> Exportar CSV
                                </Button>
                            </div>
                        </div>

                        {/* Estadísticas Diarias */}
                        {dailyRecords.length > 0 && (
                            <div className="grid grid-cols-3 gap-4 p-4 mb-4">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p className="text-sm text-gray-600">Presentes</p>
                                    <p className="text-2xl font-bold text-green-600">{dailyStats.presentes}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-sm text-gray-600">Ausentes</p>
                                    <p className="text-2xl font-bold text-red-600">{dailyStats.ausentes}</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <p className="text-sm text-gray-600">Tardanzas</p>
                                    <p className="text-2xl font-bold text-amber-600">{dailyStats.tardanzas}</p>
                                </div>
                            </div>
                        )}

                        {/* Tabla Diaria */}
                        <div className="overflow-x-auto">
                            {dailyLoading ? (
                                <div className="text-center py-12 text-gray-400">Cargando...</div>
                            ) : dailyRecords.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                            <th className="px-6 py-3">Empleado</th>
                                            <th className="px-6 py-3">Hora Entrada</th>
                                            <th className="px-6 py-3">Hora Salida</th>
                                            <th className="px-6 py-3">Método</th>
                                            <th className="px-6 py-3">Tardanza</th>
                                            <th className="px-6 py-3">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {dailyRecords.map((record, idx) => (
                                            <tr key={idx} className={record.estado === 'Presente' ? '' : 'bg-red-50'}>
                                                <td className="px-6 py-4 font-medium">{record.empleado}</td>
                                                <td className="px-6 py-4">{record.horaEntrada}</td>
                                                <td className="px-6 py-4">{record.horaSalida}</td>
                                                <td className="px-6 py-4">
                                                    <Badge color={record.metodo === '-' ? 'gray' : 'blue'}>{record.metodo}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {record.esTardanza ? (
                                                        <Badge color="amber">{record.tardanza} min</Badge>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {record.estado === 'Presente' ? (
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <Check size={16} /> Presente
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <X size={16} /> Ausente
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 text-gray-400">Selecciona una fecha y carga el reporte</div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* REPORTE DE TARDANZAS */}
            {activeTab === 'tardanzas' && (
                <div className="space-y-6">
                    <Card>
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Desde:</label>
                                    <input
                                        type="date"
                                        value={tardanzasStartDate}
                                        onChange={e => setTardanzasStartDate(e.target.value)}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hasta:</label>
                                    <input
                                        type="date"
                                        value={tardanzasEndDate}
                                        onChange={e => setTardanzasEndDate(e.target.value)}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <Button
                                    onClick={loadTardanzasReport}
                                    variant="default"
                                    disabled={tardanzasLoading}
                                    className="px-4 py-2"
                                >
                                    {tardanzasLoading ? 'Cargando...' : 'Cargar'}
                                </Button>
                                <Button
                                    onClick={downloadTardanzasCSV}
                                    variant="outline"
                                    disabled={tardanzasRecords.length === 0}
                                    className="gap-2"
                                >
                                    <Download size={18} /> Exportar CSV
                                </Button>
                            </div>
                        </div>

                        {/* Gráfica de Tardanzas */}
                        {tardanzasResumen.length > 0 && (
                            <div className="p-4">
                                <h3 className="text-lg font-semibold mb-4">Resumen de Tardanzas por Empleado</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={tardanzasChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="nombre" />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="veces" fill="#f59e0b" name="Veces Tarde" />
                                        <Bar yAxisId="right" dataKey="minutos" fill="#ef4444" name="Promedio (min)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Tabla Resumen de Tardanzas */}
                        {tardanzasResumen.length > 0 && (
                            <div className="p-4">
                                <h3 className="text-lg font-semibold mb-4">Resumen por Empleado</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                                <th className="px-6 py-3">Empleado</th>
                                                <th className="px-6 py-3">Veces Tarde</th>
                                                <th className="px-6 py-3">Total Minutos</th>
                                                <th className="px-6 py-3">Promedio (min)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {tardanzasResumen.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4 font-medium">{r.nombre}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge color="amber">{r.totalVeces}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4">{r.totalMinutos} min</td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold">{r.promedioMinutos} min</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Tabla Detalle de Tardanzas */}
                        {tardanzasRecords.length > 0 && (
                            <div className="p-4 border-t">
                                <h3 className="text-lg font-semibold mb-4">Detalle de Tardanzas</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                                <th className="px-6 py-3">Fecha</th>
                                                <th className="px-6 py-3">Empleado</th>
                                                <th className="px-6 py-3">Hora Real</th>
                                                <th className="px-6 py-3">Hora Planificada</th>
                                                <th className="px-6 py-3">Minutos Tarde</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {tardanzasRecords.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4">{new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CO')}</td>
                                                    <td className="px-6 py-4 font-medium">{r.empleado}</td>
                                                    <td className="px-6 py-4">{r.horaReal}</td>
                                                    <td className="px-6 py-4">{r.horaPlaneada}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge color="amber">{r.minutosTarde} min</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {tardanzasLoading ? (
                            <div className="text-center py-12 text-gray-400">Cargando...</div>
                        ) : tardanzasRecords.length === 0 && !tardanzasLoading ? (
                            <div className="text-center py-12 text-gray-400">Selecciona un rango de fechas y carga el reporte</div>
                        ) : null}
                    </Card>
                </div>
            )}

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
