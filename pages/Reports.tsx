import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Card, Badge, Button } from '../components/UIComponents';
import { Download, Clock, Users, Calendar, AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { usePermissions } from '../src/context/PermissionsContext';
import { apiClient } from '../src/services/apiClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ReportType = 'daily' | 'punctuality' | 'absences';

interface DailyAttendanceEmployee {
    id: string;
    cedula: string;
    nombre: string;
    cargo: string;
    departamento: string;
    estado: string;
    jornada_entrada: string | null;
    almuerzo_salida: string | null;
    almuerzo_entrada: string | null;
    jornada_salida: string | null;
    horas_trabajadas: string;
    tardanza_minutos: number;
    observaciones: string | null;
}

interface PunctualityEmployee {
    id: string;
    cedula: string;
    nombre: string;
    cargo: string;
    departamento: string;
    dias_asistidos: number;
    total_tardanzas: number;
    promedio_minutos_tardanza: number;
    porcentaje_puntualidad: number;
    dia_mas_tardanzas: string;
}

interface ActiveAbsence {
    id: string;
    empleado: {
        id: string;
        cedula: string;
        nombre: string;
        cargo: string;
        departamento: string;
    };
    tipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    dias_solicitados: number;
    motivo: string;
    estado: string;
    periodo_estado: string;
    aprobado_por: string | null;
}

const ReportsOperational: React.FC = () => {
    const { authState } = useContext(AppContext)!;
    const { can } = usePermissions();

    // Estado general
    const [activeReport, setActiveReport] = useState<ReportType>('daily');
    const [loading, setLoading] = useState(false);

    // Reporte 1: Asistencia Diaria
    const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyData, setDailyData] = useState<{
        employees: DailyAttendanceEmployee[];
        stats: any;
    } | null>(null);

    // Reporte 2: Puntualidad Semanal
    const [punctualityStart, setPunctualityStart] = useState(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [punctualityEnd, setPunctualityEnd] = useState(new Date().toISOString().split('T')[0]);
    const [punctualityData, setPunctualityData] = useState<{
        report: PunctualityEmployee[];
        stats: any;
        analysis: any;
    } | null>(null);

    // Reporte 3: Ausencias Activas
    const [absencesStart, setAbsencesStart] = useState(new Date().toISOString().split('T')[0]);
    const [absencesEnd, setAbsencesEnd] = useState(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [absencesData, setAbsencesData] = useState<{
        report: ActiveAbsence[];
        stats: any;
        analysis: any;
    } | null>(null);

    // ========== CARGAR REPORTES ==========

    const loadDailyReport = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get('/reports/operational/daily-attendance', {
                params: { date: dailyDate }
            });
            setDailyData(data);
            toast.success('Reporte de asistencia diaria cargado');
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar reporte');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadPunctualityReport = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get('/reports/operational/weekly-punctuality', {
                params: { startDate: punctualityStart, endDate: punctualityEnd }
            });
            setPunctualityData(data);
            toast.success('Reporte de puntualidad cargado');
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar reporte');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadAbsencesReport = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get('/reports/operational/active-absences', {
                params: { startDate: absencesStart, endDate: absencesEnd }
            });
            setAbsencesData(data);
            toast.success('Reporte de ausencias activas cargado');
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar reporte');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ========== EXPORTAR CSV ==========

    const exportDailyToCSV = () => {
        if (!dailyData) return;

        const headers = ['Cédula', 'Nombre', 'Cargo', 'Departamento', 'Estado', 'Entrada Jornada', 'Salida Almuerzo', 'Entrada Almuerzo', 'Salida Jornada', 'Horas Trabajadas', 'Tardanza (min)', 'Observaciones'];
        const rows = dailyData.employees.map(e => [
            e.cedula,
            e.nombre,
            e.cargo,
            e.departamento,
            e.estado,
            e.jornada_entrada || '--',
            e.almuerzo_salida || '--',
            e.almuerzo_entrada || '--',
            e.jornada_salida || '--',
            e.horas_trabajadas,
            e.tardanza_minutos,
            e.observaciones || '--'
        ].join(','));

        downloadCSV(`asistencia_diaria_${dailyDate}.csv`, headers, rows);
    };

    const exportPunctualityToCSV = () => {
        if (!punctualityData) return;

        const headers = ['Cédula', 'Nombre', 'Cargo', 'Departamento', 'Días Asistidos', 'Total Tardanzas', 'Promedio Tardanza (min)', 'Puntualidad (%)', 'Día + Tardanzas'];
        const rows = punctualityData.report.map(e => [
            e.cedula,
            e.nombre,
            e.cargo,
            e.departamento,
            e.dias_asistidos,
            e.total_tardanzas,
            e.promedio_minutos_tardanza,
            e.porcentaje_puntualidad,
            e.dia_mas_tardanzas
        ].join(','));

        downloadCSV(`puntualidad_${punctualityStart}_${punctualityEnd}.csv`, headers, rows);
    };

    const exportAbsencesToCSV = () => {
        if (!absencesData) return;

        const headers = ['Empleado', 'Cédula', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Motivo', 'Estado', 'Aprobado Por'];
        const rows = absencesData.report.map(a => [
            a.empleado.nombre,
            a.empleado.cedula,
            a.tipo,
            a.fecha_inicio,
            a.fecha_fin,
            a.dias_solicitados,
            a.motivo,
            a.estado,
            a.aprobado_por || '--'
        ].join(','));

        downloadCSV(`ausencias_activas_${absencesStart}_${absencesEnd}.csv`, headers, rows);
    };

    const downloadCSV = (filename: string, headers: string[], rows: string[]) => {
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Reporte exportado correctamente');
    };

    // ========== RENDER ==========

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h1>
            </div>

            {/* Tabs de Categorías */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                <div className="md:col-span-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={activeReport === 'daily' ? 'default' : 'outline'}
                            onClick={() => setActiveReport('daily')}
                            className="gap-2"
                        >
                            <FileText size={18} />
                            Operacionales
                        </Button>
                        <Button variant="outline" disabled className="gap-2">
                            <TrendingUp size={18} />
                            Administrativos
                        </Button>
                        <Button variant="outline" disabled className="gap-2">
                            <Users size={18} />
                            Estratégicos
                        </Button>
                        <Button variant="outline" disabled className="gap-2">
                            <AlertCircle size={18} />
                            Especiales
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sub-tabs de Reportes Operacionales */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => setActiveReport('daily')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'daily'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Calendar className="inline mr-2" size={16} />
                        Asistencia Diaria
                    </button>
                    <button
                        onClick={() => setActiveReport('punctuality')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'punctuality'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Clock className="inline mr-2" size={16} />
                        Puntualidad Semanal
                    </button>
                    <button
                        onClick={() => setActiveReport('absences')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'absences'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <AlertCircle className="inline mr-2" size={16} />
                        Ausencias Activas
                    </button>
                </div>

                {/* REPORTE 1: ASISTENCIA DIARIA */}
                {activeReport === 'daily' && (
                    <div className="space-y-6">
                        {/* Filtros */}
                        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                                <input
                                    type="date"
                                    value={dailyDate}
                                    onChange={e => setDailyDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <Button onClick={loadDailyReport} disabled={loading}>
                                {loading ? 'Cargando...' : 'Generar Reporte'}
                            </Button>
                            {dailyData && (
                                <Button variant="outline" onClick={exportDailyToCSV} className="gap-2">
                                    <Download size={18} /> Exportar CSV
                                </Button>
                            )}
                        </div>

                        {/* Estadísticas */}
                        {dailyData && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium">Total Empleados</p>
                                        <p className="text-2xl font-bold text-blue-900">{dailyData.stats.total_empleados}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-600 font-medium">Presentes</p>
                                        <p className="text-2xl font-bold text-green-900">{dailyData.stats.presentes}</p>
                                        <p className="text-xs text-green-600">{dailyData.stats.porcentaje_asistencia}% asistencia</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-600 font-medium">Ausentes</p>
                                        <p className="text-2xl font-bold text-red-900">{dailyData.stats.ausentes}</p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <p className="text-sm text-yellow-600 font-medium">Tardanzas</p>
                                        <p className="text-2xl font-bold text-yellow-900">{dailyData.stats.tardanzas}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <p className="text-sm text-purple-600 font-medium">Con Almuerzo</p>
                                        <p className="text-2xl font-bold text-purple-900">{dailyData.stats.con_almuerzo}</p>
                                    </div>
                                </div>

                                {/* Tabla */}
                                <Card title="Detalle de Asistencia">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b">
                                                    <th className="px-4 py-3 text-left">Empleado</th>
                                                    <th className="px-4 py-3 text-left">Cargo</th>
                                                    <th className="px-4 py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-center">Entrada</th>
                                                    <th className="px-4 py-3 text-center">Salida Almuerzo</th>
                                                    <th className="px-4 py-3 text-center">Entrada Almuerzo</th>
                                                    <th className="px-4 py-3 text-center">Salida</th>
                                                    <th className="px-4 py-3 text-center">Horas</th>
                                                    <th className="px-4 py-3 text-left">Observaciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyData.employees.map(emp => (
                                                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{emp.nombre}</div>
                                                            <div className="text-xs text-gray-500">{emp.cedula}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">{emp.cargo}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge variant={emp.estado === 'presente' ? 'success' : 'danger'}>
                                                                {emp.estado}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {emp.jornada_entrada || '--'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {emp.almuerzo_salida || '--'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {emp.almuerzo_entrada || '--'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {emp.jornada_salida || '--'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold text-blue-600">
                                                            {emp.horas_trabajadas}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600">
                                                            {emp.observaciones || '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}

                        {!dailyData && (
                            <div className="text-center py-12 text-gray-500">
                                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Selecciona una fecha y haz clic en "Generar Reporte"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* REPORTE 2: PUNTUALIDAD SEMANAL */}
                {activeReport === 'punctuality' && (
                    <div className="space-y-6">
                        {/* Filtros */}
                        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={punctualityStart}
                                    onChange={e => setPunctualityStart(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={punctualityEnd}
                                    onChange={e => setPunctualityEnd(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <Button onClick={loadPunctualityReport} disabled={loading}>
                                {loading ? 'Cargando...' : 'Generar Reporte'}
                            </Button>
                            {punctualityData && (
                                <Button variant="outline" onClick={exportPunctualityToCSV} className="gap-2">
                                    <Download size={18} /> Exportar CSV
                                </Button>
                            )}
                        </div>

                        {/* Estadísticas */}
                        {punctualityData && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium">Total Empleados</p>
                                        <p className="text-2xl font-bold text-blue-900">{punctualityData.stats.total_empleados}</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-600 font-medium">Con Tardanzas</p>
                                        <p className="text-2xl font-bold text-red-900">{punctualityData.stats.con_tardanzas}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-600 font-medium">Puntualidad Promedio</p>
                                        <p className="text-2xl font-bold text-green-900">{punctualityData.stats.promedio_puntualidad}%</p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <p className="text-sm text-yellow-600 font-medium">Día + Tardanzas</p>
                                        <p className="text-xl font-bold text-yellow-900">{punctualityData.stats.dia_mas_tardanzas}</p>
                                    </div>
                                </div>

                                {/* Gráficas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card title="Tardanzas por Día de la Semana">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={Object.entries(punctualityData.analysis.tardanzas_por_dia).map(([day, count]) => ({
                                                dia: day.substring(0, 3),
                                                tardanzas: count
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="dia" />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="tardanzas" fill="#ef4444" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Card>

                                    <Card title="Top 5 Más Puntuales">
                                        <div className="space-y-2">
                                            {punctualityData.analysis.top_5_puntuales.map((emp: PunctualityEmployee, idx: number) => (
                                                <div key={emp.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-green-600 text-lg">{idx + 1}</span>
                                                        <div>
                                                            <p className="font-medium">{emp.nombre}</p>
                                                            <p className="text-xs text-gray-600">{emp.cargo}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="success">{emp.porcentaje_puntualidad}%</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>

                                {/* Tabla */}
                                <Card title="Detalle de Puntualidad">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b">
                                                    <th className="px-4 py-3 text-left">Empleado</th>
                                                    <th className="px-4 py-3 text-left">Cargo</th>
                                                    <th className="px-4 py-3 text-center">Días Asistidos</th>
                                                    <th className="px-4 py-3 text-center">Total Tardanzas</th>
                                                    <th className="px-4 py-3 text-center">Promedio Tardanza</th>
                                                    <th className="px-4 py-3 text-center">Puntualidad</th>
                                                    <th className="px-4 py-3 text-center">Día + Tardanzas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {punctualityData.report.map(emp => (
                                                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{emp.nombre}</div>
                                                            <div className="text-xs text-gray-500">{emp.cedula}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">{emp.cargo}</td>
                                                        <td className="px-4 py-3 text-center">{emp.dias_asistidos}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge variant={emp.total_tardanzas > 0 ? 'danger' : 'success'}>
                                                                {emp.total_tardanzas}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">{emp.promedio_minutos_tardanza} min</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`font-semibold ${emp.porcentaje_puntualidad >= 90 ? 'text-green-600' :
                                                                    emp.porcentaje_puntualidad >= 70 ? 'text-yellow-600' :
                                                                        'text-red-600'
                                                                }`}>
                                                                {emp.porcentaje_puntualidad}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-xs">{emp.dia_mas_tardanzas}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}

                        {!punctualityData && (
                            <div className="text-center py-12 text-gray-500">
                                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Selecciona un rango de fechas y haz clic en "Generar Reporte"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* REPORTE 3: AUSENCIAS ACTIVAS */}
                {activeReport === 'absences' && (
                    <div className="space-y-6">
                        {/* Filtros */}
                        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={absencesStart}
                                    onChange={e => setAbsencesStart(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={absencesEnd}
                                    onChange={e => setAbsencesEnd(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <Button onClick={loadAbsencesReport} disabled={loading}>
                                {loading ? 'Cargando...' : 'Generar Reporte'}
                            </Button>
                            {absencesData && (
                                <Button variant="outline" onClick={exportAbsencesToCSV} className="gap-2">
                                    <Download size={18} /> Exportar CSV
                                </Button>
                            )}
                        </div>

                        {/* Estadísticas */}
                        {absencesData && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium">Total Ausencias</p>
                                        <p className="text-2xl font-bold text-blue-900">{absencesData.stats.total_ausencias}</p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <p className="text-sm text-yellow-600 font-medium">Pendientes</p>
                                        <p className="text-2xl font-bold text-yellow-900">{absencesData.stats.pendientes}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-600 font-medium">Aprobadas</p>
                                        <p className="text-2xl font-bold text-green-900">{absencesData.stats.aprobadas}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <p className="text-sm text-purple-600 font-medium">En Curso</p>
                                        <p className="text-2xl font-bold text-purple-900">{absencesData.stats.en_curso}</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-600 font-medium">Total Días</p>
                                        <p className="text-2xl font-bold text-red-900">{absencesData.stats.total_dias_ausencia}</p>
                                    </div>
                                </div>

                                {/* Gráfica de distribución por tipo */}
                                <Card title="Distribución por Tipo de Ausencia">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Vacaciones', value: absencesData.stats.por_tipo.vacaciones, color: '#3b82f6' },
                                                    { name: 'Licencia Médica', value: absencesData.stats.por_tipo.licencia_medica, color: '#ef4444' },
                                                    { name: 'Día Libre', value: absencesData.stats.por_tipo.dia_libre, color: '#22c55e' }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={(entry) => `${entry.name}: ${entry.value}`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Vacaciones', value: absencesData.stats.por_tipo.vacaciones, color: '#3b82f6' },
                                                    { name: 'Licencia Médica', value: absencesData.stats.por_tipo.licencia_medica, color: '#ef4444' },
                                                    { name: 'Día Libre', value: absencesData.stats.por_tipo.dia_libre, color: '#22c55e' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>

                                {/* Tabla */}
                                <Card title="Detalle de Ausencias Activas">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b">
                                                    <th className="px-4 py-3 text-left">Empleado</th>
                                                    <th className="px-4 py-3 text-left">Tipo</th>
                                                    <th className="px-4 py-3 text-center">Fecha Inicio</th>
                                                    <th className="px-4 py-3 text-center">Fecha Fin</th>
                                                    <th className="px-4 py-3 text-center">Días</th>
                                                    <th className="px-4 py-3 text-left">Motivo</th>
                                                    <th className="px-4 py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-center">Período</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {absencesData.report.map(absence => (
                                                    <tr key={absence.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{absence.empleado.nombre}</div>
                                                            <div className="text-xs text-gray-500">{absence.empleado.cargo}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant={
                                                                absence.tipo_codigo === 'vacation' ? 'info' :
                                                                    absence.tipo_codigo === 'sick_leave' ? 'danger' :
                                                                        'success'
                                                            }>
                                                                {absence.tipo}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {absence.fecha_inicio}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-sm">
                                                            {absence.fecha_fin}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold">
                                                            {absence.dias_solicitados}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {absence.motivo}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge variant={
                                                                absence.estado_codigo === 'approved' ? 'success' :
                                                                    absence.estado_codigo === 'pending' ? 'warning' :
                                                                        'danger'
                                                            }>
                                                                {absence.estado}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-xs">
                                                            <Badge variant={
                                                                absence.periodo_estado === 'en_curso' ? 'info' :
                                                                    absence.periodo_estado === 'futura' ? 'default' :
                                                                        'secondary'
                                                            }>
                                                                {absence.periodo_estado === 'en_curso' ? 'En Curso' :
                                                                    absence.periodo_estado === 'futura' ? 'Futura' : 'Pasada'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}

                        {!absencesData && (
                            <div className="text-center py-12 text-gray-500">
                                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Selecciona un rango de fechas y haz clic en "Generar Reporte"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsOperational;
