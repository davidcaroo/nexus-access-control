import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Button } from '../components/UIComponents';
import {
  FileText,
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Building2
} from 'lucide-react';
import { usePermissions } from '../src/context/PermissionsContext';
import { apiClient } from '../src/services/apiClient';
import { exportService } from '../services/exportService';
import toast from 'react-hot-toast';

type ReportLevel = 'operational' | 'administrative' | 'strategic' | 'special';
type ReportType =
  | 'daily-attendance'
  | 'weekly-punctuality'
  | 'active-absences'
  | 'payroll'
  | 'monthly-consolidated'
  | 'overtime'
  | 'executive-dashboard'
  | 'turnover'
  | 'annual-comparative'
  | 'audit'
  | 'employee-individual'
  | 'by-department'
  | 'incidents';

interface DateFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

const Reports: React.FC = () => {
  const { authState } = useContext(AppContext)!;
  const { can } = usePermissions();

  const [activeLevel, setActiveLevel] = useState<ReportLevel>('operational');
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily-attendance');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<DateFilters>({
    date: new Date().toISOString().split('T')[0],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const reportsByLevel = {
    operational: [
      { id: 'daily-attendance', name: 'Asistencia Diaria', icon: Calendar, color: 'blue' },
      { id: 'weekly-punctuality', name: 'Puntualidad Semanal', icon: Clock, color: 'green' },
      { id: 'active-absences', name: 'Ausencias Activas', icon: AlertCircle, color: 'yellow' }
    ],
    administrative: [
      { id: 'payroll', name: 'Nómina Quincenal', icon: FileText, color: 'purple' },
      { id: 'monthly-consolidated', name: 'Consolidado Mensual', icon: BarChart3, color: 'indigo' },
      { id: 'overtime', name: 'Horas Extras', icon: Clock, color: 'orange' }
    ],
    strategic: [
      { id: 'executive-dashboard', name: 'Dashboard Ejecutivo', icon: TrendingUp, color: 'blue' },
      { id: 'turnover', name: 'Rotación de Personal', icon: Users, color: 'red' },
      { id: 'annual-comparative', name: 'Comparativo Anual', icon: BarChart3, color: 'teal' },
      { id: 'audit', name: 'Auditoría', icon: FileText, color: 'gray' }
    ],
    special: [
      { id: 'employee-individual', name: 'Individual de Empleado', icon: Users, color: 'blue' },
      { id: 'by-department', name: 'Por Departamento', icon: Building2, color: 'green' },
      { id: 'incidents', name: 'Incidencias y Patrones', icon: AlertCircle, color: 'red' }
    ]
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let params: any = {};

      switch (selectedReport) {
        case 'daily-attendance':
          endpoint = '/reports/daily-attendance';
          params = { date: filters.date };
          break;
        case 'weekly-punctuality':
          endpoint = '/reports/weekly-punctuality';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'active-absences':
          endpoint = '/reports/active-absences';
          params = { date: filters.date };
          break;
        case 'payroll':
          endpoint = '/reports/payroll';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'monthly-consolidated':
          endpoint = '/reports/monthly-consolidated';
          params = { month: filters.month, year: filters.year };
          break;
        case 'overtime':
          endpoint = '/reports/overtime';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'executive-dashboard':
          endpoint = '/reports/executive-dashboard';
          params = { month: filters.month, year: filters.year };
          break;
        case 'turnover':
          endpoint = '/reports/turnover';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'annual-comparative':
          endpoint = '/reports/annual-comparative';
          params = { year: filters.year };
          break;
        case 'audit':
          endpoint = '/reports/audit';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'by-department':
          endpoint = '/reports/by-department';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
        case 'incidents':
          endpoint = '/reports/incidents';
          params = { startDate: filters.startDate, endDate: filters.endDate };
          break;
      }

      const response = await apiClient.get(endpoint, { params });
      setReportData(response.data);
      toast.success('Reporte generado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al generar reporte');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchReport();
    }
  }, [selectedReport]);

  const renderFilters = () => {
    const needsDate = ['daily-attendance', 'active-absences'].includes(selectedReport);
    const needsDateRange = ['weekly-punctuality', 'payroll', 'overtime', 'turnover', 'audit', 'by-department', 'incidents'].includes(selectedReport);
    const needsMonthYear = ['monthly-consolidated', 'executive-dashboard'].includes(selectedReport);
    const needsYear = ['annual-comparative'].includes(selectedReport);

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {needsDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {needsDateRange && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {needsMonthYear && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('es', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <input
                  type="number"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="2020"
                  max="2099"
                />
              </div>
            </>
          )}

          {needsYear && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="2020"
                max="2099"
              />
            </div>
          )}

          <div className="flex items-end">
            <Button onClick={fetchReport} disabled={loading} className="w-full">
              {loading ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderReportData = () => {
    if (!reportData) {
      return (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Selecciona un reporte y haz clic en "Generar Reporte"</p>
        </div>
      );
    }

    // Renderizar datos según el tipo de reporte
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {reportsByLevel[activeLevel].find(r => r.id === selectedReport)?.name}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  const reportName = reportsByLevel[activeLevel].find(r => r.id === selectedReport)?.name || 'Reporte';
                  const dateStr = filters.date || `${filters.year}-${String(filters.month).padStart(2, '0')}`;
                  exportService.exportToExcel({
                    title: reportName,
                    subtitle: `Fecha: ${dateStr}`,
                    data: reportData,
                    filename: `${reportName.replace(/\s+/g, '_')}_${dateStr}`
                  });
                  toast.success('Reporte exportado a Excel');
                } catch (error) {
                  toast.error('Error al exportar a Excel');
                }
              }}
            >
              <Download size={16} /> Excel
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  const reportName = reportsByLevel[activeLevel].find(r => r.id === selectedReport)?.name || 'Reporte';
                  const dateStr = filters.date || `${filters.year}-${String(filters.month).padStart(2, '0')}`;
                  exportService.exportToPDF({
                    title: reportName,
                    subtitle: `Fecha: ${dateStr}`,
                    data: reportData,
                    filename: `${reportName.replace(/\s+/g, '_')}_${dateStr}`
                  });
                  toast.success('Reporte exportado a PDF');
                } catch (error) {
                  toast.error('Error al exportar a PDF');
                }
              }}
            >
              <Download size={16} /> PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  const reportName = reportsByLevel[activeLevel].find(r => r.id === selectedReport)?.name || 'Reporte';
                  const dateStr = filters.date || `${filters.year}-${String(filters.month).padStart(2, '0')}`;
                  exportService.exportToCSV({
                    title: reportName,
                    subtitle: `Fecha: ${dateStr}`,
                    data: reportData,
                    filename: `${reportName.replace(/\s+/g, '_')}_${dateStr}`
                  });
                  toast.success('Reporte exportado a CSV');
                } catch (error) {
                  toast.error('Error al exportar a CSV');
                }
              }}
            >
              <Download size={16} /> CSV
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Estadísticas - ESTRUCTURA UNIFICADA */}
          {reportData.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(reportData.stats).filter(([key]) => typeof reportData.stats[key] !== 'object').map(([key, value]) => (
                <div key={key} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs text-blue-700 uppercase mb-1 font-medium">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {typeof value === 'number' ? (
                      key.includes('tasa') || key.includes('promedio') || key.includes('indice') || key.includes('porcentaje')
                        ? `${value.toFixed(1)}%`
                        : value.toFixed(0)
                    ) : value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tabla de datos */}
          {reportData.report && Array.isArray(reportData.report) && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(reportData.report[0] || {}).map((key) => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.report.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Información de employees - ESTRUCTURA UNIFICADA */}
          {reportData.employees && (
            <div className="space-y-6">
              {/* Empleados (cuando sea array directo del backend) */}
              {Array.isArray(reportData.employees) && reportData.employees.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Empleados ({reportData.employees.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportData.employees.map((emp: any) => (
                      <div key={emp.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{emp.nombre}</p>
                        <p className="text-sm text-gray-600">{emp.cargo} - {emp.departamento}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top puntuales */}
              {reportData.employees?.mas_puntuales && reportData.employees?.menos_puntuales && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3">Top 5 Más Puntuales</h4>
                    {reportData.employees.mas_puntuales.map((emp: any, idx: number) => (
                      <div key={emp.id} className="bg-green-50 rounded p-3 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">#{idx + 1} {emp.nombre}</span>
                          <span className="text-sm text-green-700">{emp.porcentaje_puntualidad}%</span>
                        </div>
                        <p className="text-xs text-gray-600">Tardanzas: {emp.total_tardanzas}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-700 mb-3">Top 5 Menos Puntuales</h4>
                    {reportData.employees.menos_puntuales.map((emp: any, idx: number) => (
                      <div key={emp.id} className="bg-red-50 rounded p-3 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">#{idx + 1} {emp.nombre}</span>
                          <span className="text-sm text-red-700">{emp.porcentaje_puntualidad}%</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Tardanzas: {emp.total_tardanzas} ({emp.promedio_minutos_tardanza} min promedio)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ausentes y permisos */}
              {reportData.employees?.ausentes && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Empleados Ausentes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportData.employees.ausentes.map((emp: any) => (
                      <div key={emp.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{emp.nombre}</p>
                        <p className="text-sm text-gray-600">{emp.cargo} - {emp.departamento}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {emp.tiene_justificacion ? '✓ Justificado' : '✗ Sin justificar'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Altas y bajas */}
              {reportData.employees?.altas && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3">Altas ({reportData.employees.altas.length})</h4>
                    {reportData.employees.altas.map((emp: any) => (
                      <div key={emp.id} className="bg-green-50 rounded p-3 mb-2">
                        <p className="font-medium">{emp.nombre}</p>
                        <p className="text-xs text-gray-600">{emp.cargo} - {emp.fecha}</p>
                      </div>
                    ))}
                  </div>
                  {reportData.employees?.bajas && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-3">Bajas ({reportData.employees.bajas.length})</h4>
                      {reportData.employees.bajas.map((emp: any) => (
                        <div key={emp.id} className="bg-red-50 rounded p-3 mb-2">
                          <p className="font-medium">{emp.nombre}</p>
                          <p className="text-xs text-gray-600">{emp.cargo} - {emp.fecha}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alertas */}
              {reportData.employees?.alertas && reportData.employees.alertas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-700 mb-3">⚠️ Alertas</h4>
                  {reportData.employees.alertas.map((alerta: any, idx: number) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 rounded p-3 mb-2">
                      <p className="font-medium">{alerta.empleado}</p>
                      <p className="text-sm text-gray-700">{alerta.detalle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JSON viewer para otros datos */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              Ver datos completos (JSON)
            </summary>
            <pre className="mt-2 bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h1>
      </div>

      {/* Tabs de niveles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex overflow-x-auto">
          {[
            { level: 'operational' as ReportLevel, name: 'Operacionales', icon: FileText },
            { level: 'administrative' as ReportLevel, name: 'Administrativos', icon: BarChart3 },
            { level: 'strategic' as ReportLevel, name: 'Estratégicos', icon: TrendingUp },
            { level: 'special' as ReportLevel, name: 'Especiales', icon: Users }
          ].map(({ level, name, icon: Icon }) => (
            <button
              key={level}
              onClick={() => {
                setActiveLevel(level);
                setSelectedReport(reportsByLevel[level][0].id as ReportType);
                setReportData(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeLevel === level
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de reportes del nivel activo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsByLevel[activeLevel].map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <button
              key={report.id}
              onClick={() => {
                setSelectedReport(report.id as ReportType);
                setReportData(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${isSelected
                ? `border-${report.color}-500 bg-${report.color}-50 shadow-md`
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${report.color}-100`}>
                  <Icon size={20} className={`text-${report.color}-600`} />
                </div>
                <span className="font-medium text-gray-900">{report.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      {renderFilters()}

      {/* Datos del reporte */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="space-y-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-8" />
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 pt-4">
              <div className="h-10 bg-gray-200 rounded w-32" />
              <div className="h-10 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>
      ) : (
        renderReportData()
      )}
    </div>
  );
};

export default Reports;