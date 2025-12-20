import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Card, Badge, Button } from '../components/UIComponents';
import { Download, Clock, Users, Calendar, AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { usePermissions } from '../src/context/PermissionsContext';
import { apiClient } from '../src/services/apiClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ReportCategory = 'operational' | 'administrative' | 'strategic' | 'special';
type ReportType = 'daily' | 'punctuality' | 'absences' | 'payroll' | 'monthly-consolidated' | 'overtime';

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

// Interfaces para reportes administrativos
interface PayrollEmployee {
  empleado_id: string;
  cedula: string;
  nombre: string;
  cargo: string;
  departamento: string;
  dias_habiles: number;
  dias_trabajados: number;
  dias_ausencias_justificadas: number;
  dias_ausencias_injustificadas: number;
  tardanzas_cantidad: number;
  tardanzas_minutos_total: number;
  descuento_tardanzas_horas: number;
  horas_netas_a_pagar: number;
  porcentaje_asistencia: number;
}

interface MonthlyKPIs {
  tasa_asistencia: number;
  tasa_ausentismo: number;
  tasa_puntualidad: number;
  promedio_horas_dia: number;
  total_empleados_activos: number;
}

interface OvertimeEmployee {
  empleado_id: string;
  cedula: string;
  nombre: string;
  cargo: string;
  departamento: string;
  total_horas_extras: number;
  dias_con_extras: number;
  detalles: Array<{
    fecha: string;
    horas_extras: number;
    entrada: string;
    salida: string;
  }>;
}

const ReportsOperational: React.FC = () => {
  const { authState } = useContext(AppContext)!;
  const { can } = usePermissions();

  // Estado general
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('operational');
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

  // Reportes Administrativos
  // Reporte 4: Nómina Quincenal
  const [payrollStart, setPayrollStart] = useState(new Date().toISOString().split('T')[0]);
  const [payrollEnd, setPayrollEnd] = useState(new Date().toISOString().split('T')[0]);
  const [payrollData, setPayrollData] = useState<{
    period: any;
    report: PayrollEmployee[];
    stats: any;
    subtotales: any[];
  } | null>(null);

  // Reporte 5: Consolidado Mensual
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear().toString());
  const [monthlyMonth, setMonthlyMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [monthlyData, setMonthlyData] = useState<{
    kpis: MonthlyKPIs;
    comparacion: any;
    analisis_dias: any;
    top_ausencias: any[];
    detalle_dias: any[];
  } | null>(null);

  // Reporte 6: Horas Extras
  const [overtimeStart, setOvertimeStart] = useState(new Date().toISOString().split('T')[0]);
  const [overtimeEnd, setOvertimeEnd] = useState(new Date().toISOString().split('T')[0]);
  const [overtimeData, setOvertimeData] = useState<{
    period: any;
    report: OvertimeEmployee[];
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

  // Cargar reportes administrativos
  const loadPayrollReport = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/reports/payroll', {
        params: { startDate: payrollStart, endDate: payrollEnd }
      });
      setPayrollData(data);
      toast.success('Reporte de nómina quincenal cargado');
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar reporte de nómina');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/reports/monthly-consolidated', {
        params: { year: monthlyYear, month: monthlyMonth }
      });
      setMonthlyData(data);
      toast.success('Consolidado mensual cargado');
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar consolidado mensual');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadOvertimeReport = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/reports/overtime', {
        params: { startDate: overtimeStart, endDate: overtimeEnd }
      });
      setOvertimeData(data);
      toast.success('Reporte de horas extras cargado');
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar reporte de horas extras');
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

  // Exportar reportes administrativos
  const exportPayrollToCSV = () => {
    if (!payrollData) return;

    const headers = ['Cédula', 'Nombre', 'Cargo', 'Departamento', 'Días Hábiles', 'Días Trabajados', 'Ausencias Justificadas', 'Ausencias Injustificadas', 'Cantidad Tardanzas', 'Minutos Tardanzas', 'Descuento Tardanzas (h)', 'Horas Netas a Pagar', '% Asistencia'];
    const rows = payrollData.report.map(e => [
      e.cedula,
      e.nombre,
      e.cargo,
      e.departamento,
      e.dias_habiles,
      e.dias_trabajados,
      e.dias_ausencias_justificadas,
      e.dias_ausencias_injustificadas,
      e.tardanzas_cantidad,
      e.tardanzas_minutos_total,
      (e.descuento_tardanzas_horas || 0).toFixed(2),
      (e.horas_netas_a_pagar || 0).toFixed(2),
      e.porcentaje_asistencia
    ].join(','));

    downloadCSV(`nomina_quincenal_${payrollStart}_${payrollEnd}.csv`, headers, rows);
  };

  const exportMonthlyToCSV = () => {
    if (!monthlyData) return;

    const headers = ['Fecha', 'Total Empleados', 'Asistieron', 'Ausentes', 'Tardanzas', 'Tasa Asistencia (%)', 'Tasa Puntualidad (%)'];
    const rows = monthlyData.detalle_dias.map((d: any) => [
      d.fecha,
      d.total_empleados,
      d.asistieron,
      d.ausentes,
      d.tardanzas,
      d.tasa_asistencia.toFixed(2),
      d.tasa_puntualidad.toFixed(2)
    ].join(','));

    downloadCSV(`consolidado_mensual_${monthlyYear}_${monthlyMonth}.csv`, headers, rows);
  };

  const exportOvertimeToCSV = () => {
    if (!overtimeData) return;

    const headers = ['Cédula', 'Nombre', 'Cargo', 'Departamento', 'Total Horas Extras', 'Días con Extras'];
    const rows = overtimeData.report.map(e => [
      e.cedula,
      e.nombre,
      e.cargo,
      e.departamento,
      e.total_horas_extras.toFixed(2),
      e.dias_con_extras
    ].join(','));

    downloadCSV(`horas_extras_${overtimeStart}_${overtimeEnd}.csv`, headers, rows);
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
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setActiveCategory('operational');
                setActiveReport('daily');
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${activeCategory === 'operational'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-300 scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
            >
              <FileText size={18} />
              Operacionales
            </button>
            <button
              onClick={() => {
                setActiveCategory('administrative');
                setActiveReport('payroll');
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${activeCategory === 'administrative'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-300 scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                }`}
            >
              <TrendingUp size={18} />
              Estratégicos
            </button>
            <button
              disabled
              className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed opacity-60"
            >
              <AlertCircle size={18} />
              Especiales
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs de Reportes Operacionales */}
      {activeCategory === 'operational' && (
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

      )
      }

      {/* Sub-tabs de Reportes Administrativos */}
      {
        activeCategory === 'administrative' && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setActiveReport('payroll')}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'payroll'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <FileText className="inline mr-2" size={16} />
                Nómina Quincenal
              </button>
              <button
                onClick={() => setActiveReport('monthly-consolidated')}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'monthly-consolidated'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <TrendingUp className="inline mr-2" size={16} />
                Consolidado Mensual
              </button>
              <button
                onClick={() => setActiveReport('overtime')}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeReport === 'overtime'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Clock className="inline mr-2" size={16} />
                Horas Extras
              </button>
            </div>

            {/* REPORTE: NÓMINA QUINCENAL */}
            {activeReport === 'payroll' && (
              <div className="space-y-6">
                {/* Filtros */}
                <Card title="Parámetros del Reporte">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                      <input
                        type="date"
                        value={payrollStart}
                        onChange={(e) => setPayrollStart(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                      <input
                        type="date"
                        value={payrollEnd}
                        onChange={(e) => setPayrollEnd(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={loadPayrollReport} disabled={loading} className="flex-1">
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                      </Button>
                      {payrollData && (
                        <Button onClick={exportPayrollToCSV} variant="outline">
                          <Download size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Estadísticas */}
                {payrollData && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Total Empleados</p>
                        <p className="text-2xl font-bold">{payrollData.stats?.total_empleados || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Horas Totales a Pagar</p>
                        <p className="text-2xl font-bold">{(payrollData.stats?.total_horas_netas_a_pagar || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Total Tardanzas</p>
                        <p className="text-2xl font-bold">{payrollData.stats?.total_tardanzas || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Ausencias Injustificadas</p>
                        <p className="text-2xl font-bold">{payrollData.stats?.total_ausencias_injustificadas || 0}</p>
                      </div>
                    </div>

                    {/* Tabla de Nómina */}
                    <Card title="Detalle de Nómina Quincenal">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días Háb.</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trabajados</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aus. Just.</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aus. Injust.</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tardanzas</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Desc. (h)</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas Netas</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Asist.</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {payrollData.report.map((emp) => (
                              <tr key={emp.empleado_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{emp.cedula}</td>
                                <td className="px-4 py-3 text-sm font-medium">{emp.nombre}</td>
                                <td className="px-4 py-3 text-sm">{emp.cargo}</td>
                                <td className="px-4 py-3 text-sm">{emp.departamento}</td>
                                <td className="px-4 py-3 text-sm text-center">{emp.dias_habiles}</td>
                                <td className="px-4 py-3 text-sm text-center">{emp.dias_trabajados}</td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <Badge variant="success">{emp.dias_ausencias_justificadas}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <Badge variant="danger">{emp.dias_ausencias_injustificadas}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-center">{emp.tardanzas_cantidad}</td>
                                <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">
                                  {(emp.descuento_tardanzas_horas || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-green-600">
                                  {(emp.horas_netas_a_pagar || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                  <Badge variant={emp.porcentaje_asistencia >= 95 ? 'success' : emp.porcentaje_asistencia >= 85 ? 'warning' : 'danger'}>
                                    {emp.porcentaje_asistencia}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Análisis por Departamento */}
                    <Card title="Resumen por Departamento">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={payrollData.subtotales || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="departamento" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total_empleados" fill="#3b82f6" name="Empleados" />
                          <Bar dataKey="total_horas_netas" fill="#22c55e" name="Horas Netas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </>
                )}

                {!payrollData && (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Selecciona un rango de fechas y haz clic en "Generar Reporte"</p>
                  </div>
                )}
              </div>
            )}

            {/* REPORTE: CONSOLIDADO MENSUAL */}
            {activeReport === 'monthly-consolidated' && (
              <div className="space-y-6">
                {/* Filtros */}
                <Card title="Parámetros del Reporte">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Año</label>
                      <input
                        type="number"
                        value={monthlyYear}
                        onChange={(e) => setMonthlyYear(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="2020"
                        max="2030"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Mes</label>
                      <select
                        value={monthlyMonth}
                        onChange={(e) => setMonthlyMonth(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="01">Enero</option>
                        <option value="02">Febrero</option>
                        <option value="03">Marzo</option>
                        <option value="04">Abril</option>
                        <option value="05">Mayo</option>
                        <option value="06">Junio</option>
                        <option value="07">Julio</option>
                        <option value="08">Agosto</option>
                        <option value="09">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-end gap-2">
                      <Button onClick={loadMonthlyReport} disabled={loading} className="flex-1">
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                      </Button>
                      {monthlyData && (
                        <Button onClick={exportMonthlyToCSV} variant="outline">
                          <Download size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* KPIs Principales */}
                {monthlyData && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Tasa Asistencia</p>
                        <p className="text-2xl font-bold">{monthlyData.kpis.tasa_asistencia.toFixed(1)}%</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Tasa Ausentismo</p>
                        <p className="text-2xl font-bold">{monthlyData.kpis.tasa_ausentismo.toFixed(1)}%</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Tasa Puntualidad</p>
                        <p className="text-2xl font-bold">{monthlyData.kpis.tasa_puntualidad.toFixed(1)}%</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Promedio Horas/Día</p>
                        <p className="text-2xl font-bold">{monthlyData.kpis.promedio_horas_dia.toFixed(1)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Empleados Activos</p>
                        <p className="text-2xl font-bold">{monthlyData.kpis.total_empleados_activos}</p>
                      </div>
                    </div>

                    {/* Comparación mes a mes */}
                    <Card title="Comparación con Mes Anterior">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Asistencia</p>
                          <p className={`text-2xl font-bold ${monthlyData.comparacion.diferencia_asistencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {monthlyData.comparacion.diferencia_asistencia >= 0 ? '+' : ''}{monthlyData.comparacion.diferencia_asistencia.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Ausentismo</p>
                          <p className={`text-2xl font-bold ${monthlyData.comparacion.diferencia_ausentismo <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {monthlyData.comparacion.diferencia_ausentismo >= 0 ? '+' : ''}{monthlyData.comparacion.diferencia_ausentismo.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Puntualidad</p>
                          <p className={`text-2xl font-bold ${monthlyData.comparacion.diferencia_puntualidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {monthlyData.comparacion.diferencia_puntualidad >= 0 ? '+' : ''}{monthlyData.comparacion.diferencia_puntualidad.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Análisis por día de semana */}
                    <Card title="Análisis por Día de la Semana">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData.analisis_dias.por_dia_semana}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia_semana" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="tasa_asistencia" fill="#3b82f6" name="Asistencia %" />
                          <Bar dataKey="tasa_puntualidad" fill="#22c55e" name="Puntualidad %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {/* Top 5 ausencias */}
                    <Card title="Top 5 Empleados con Más Ausencias">
                      <div className="space-y-3">
                        {monthlyData.top_ausencias.map((emp: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                                }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium">{emp.nombre}</p>
                                <p className="text-sm text-gray-600">{emp.departamento}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-red-600">{emp.total_ausencias}</p>
                              <p className="text-xs text-gray-500">ausencias</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </>
                )}

                {!monthlyData && (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Selecciona año y mes y haz clic en "Generar Reporte"</p>
                  </div>
                )}
              </div>
            )}

            {/* REPORTE: HORAS EXTRAS */}
            {activeReport === 'overtime' && (
              <div className="space-y-6">
                {/* Filtros */}
                <Card title="Parámetros del Reporte">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                      <input
                        type="date"
                        value={overtimeStart}
                        onChange={(e) => setOvertimeStart(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                      <input
                        type="date"
                        value={overtimeEnd}
                        onChange={(e) => setOvertimeEnd(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={loadOvertimeReport} disabled={loading} className="flex-1">
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                      </Button>
                      {overtimeData && (
                        <Button onClick={exportOvertimeToCSV} variant="outline">
                          <Download size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Estadísticas */}
                {overtimeData && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Total Horas Extras</p>
                        <p className="text-2xl font-bold">{overtimeData.stats.total_horas_extras.toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Empleados con Extras</p>
                        <p className="text-2xl font-bold">{overtimeData.stats.empleados_con_extras}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Promedio Horas/Empleado</p>
                        <p className="text-2xl font-bold">{overtimeData.stats.promedio_horas_empleado.toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow">
                        <p className="text-sm opacity-90 mb-1">Días con Extras</p>
                        <p className="text-2xl font-bold">{overtimeData.stats.dias_con_extras}</p>
                      </div>
                    </div>

                    {/* Top 5 empleados con más horas extras */}
                    <Card title="Top 5 Empleados con Más Horas Extras">
                      <div className="space-y-3">
                        {overtimeData.analysis.top_5_empleados.map((emp: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-green-500' : 'bg-gray-400'
                                }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium">{emp.nombre}</p>
                                <p className="text-sm text-gray-600">{emp.departamento}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-purple-600">{emp.total_horas_extras.toFixed(2)}h</p>
                              <p className="text-xs text-gray-500">{emp.dias_con_extras} días</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Análisis por departamento */}
                    <Card title="Distribución por Departamento">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={overtimeData.analysis.por_departamento}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="departamento" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total_horas_extras" fill="#9333ea" name="Horas Extras" />
                          <Bar dataKey="empleados_con_extras" fill="#3b82f6" name="Empleados" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {/* Tabla detallada */}
                    <Card title="Detalle de Horas Extras por Empleado">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {overtimeData.report.map((emp) => (
                              <tr key={emp.empleado_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{emp.cedula}</td>
                                <td className="px-4 py-3 text-sm font-medium">{emp.nombre}</td>
                                <td className="px-4 py-3 text-sm">{emp.cargo}</td>
                                <td className="px-4 py-3 text-sm">{emp.departamento}</td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-purple-600">
                                  {emp.total_horas_extras.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <Badge variant="info">{emp.dias_con_extras}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                )}

                {!overtimeData && (
                  <div className="text-center py-12 text-gray-500">
                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Selecciona un rango de fechas y haz clic en "Generar Reporte"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div >
  );
};

export default ReportsOperational;
