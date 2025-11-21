import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card, Button } from '../components/UIComponents';
import { Users, UserCheck, UserX, Clock, Edit } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { ManualAttendanceModal } from '../components/ManualAttendanceModal';
import { usePermissions } from '../src/context/PermissionsContext';

const Dashboard: React.FC = () => {
  const { employees, records } = useContext(AppContext)!;
  const { can } = usePermissions();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysRecords = records.filter(r => r.fecha === today);

    const presentTodayIds = new Set(todaysRecords.filter(r => r.tipo === 'entrada').map(r => r.employee_id));
    const presentCount = presentTodayIds.size;

    const employeeLastStatus = new Map<string, 'entrada' | 'salida'>();
    const sortedTodaysRecords = [...todaysRecords].sort((a, b) => a.hora.localeCompare(b.hora));
    
    for (const record of sortedTodaysRecords) {
      employeeLastStatus.set(record.employee_id, record.tipo);
    }

    const onSiteCount = Array.from(employeeLastStatus.values()).filter(status => status === 'entrada').length;

    const totalEmployees = employees.length;
    const absentCount = totalEmployees - presentCount;
    const lates = todaysRecords.filter(r => r.tardanza && r.tipo === 'entrada').length;

    // --- Debugging Logs ---
    console.log("Dashboard Stats: Today's records:", todaysRecords);
    console.log("Dashboard Stats: Employee last status (for on-site calculation):", employeeLastStatus);
    console.log("Dashboard Stats: Calculated onSiteCount (employees whose last record is 'entrada'):", onSiteCount);
    console.log("Dashboard Stats: Calculated lates (entry records marked as tardy):", lates);
    // --- End Debugging Logs ---

    return { totalEmployees, presentCount, onSiteCount, absentCount, lates };
  }, [employees, records]);

  const onSiteChartData = [
    { name: 'En Sitio', value: stats.onSiteCount, color: '#10B981' },
    { name: 'Salieron', value: stats.presentCount - stats.onSiteCount, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        {can('employees:create') && (
          <Button variant="outline" onClick={() => setIsManualModalOpen(true)}>
            <Edit size={16} className="mr-2" />
            Registro Manual
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Personal" value={stats.totalEmployees} icon={<Users className="text-blue-600" />} />
        <StatCard title="Presentes Hoy" value={stats.presentCount} icon={<UserCheck className="text-emerald-600" />} subtext={`${((stats.presentCount/stats.totalEmployees)*100 || 0).toFixed(0)}% asistencia`} />
        <StatCard title="Ausentes" value={stats.absentCount} icon={<UserX className="text-red-600" />} />
        <StatCard 
          title="Tardanzas" 
          value={stats.lates} 
          icon={<Clock className="text-amber-600" />} 
          subtext="Entradas registradas después del horario" 
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Estado Actual del Personal">
          <div className="h-72 w-full flex flex-col items-center justify-center relative min-w-0 min-h-0"> {/* Added min-w-0 min-h-0 */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={onSiteChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {onSiteChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip formatter={(value, name) => [`${value} empleado(s)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold">{stats.onSiteCount}</span>
              <span className="text-xs text-gray-500">en sitio ahora</span>
            </div>
          </div>
        </Card>
        <Card title="Actividad Reciente">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="px-4 py-3">Empleado</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Evento</th></tr></thead>
              <tbody>
                {records.slice(0, 5).map(rec => {
                  const emp = employees.find(e => e.id === rec.employee_id);
                  return (
                    <tr key={rec.id}>
                      <td className="px-4 py-3">{emp?.nombre || 'Desconocido'}</td>
                      <td className="px-4 py-3">{rec.hora}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${rec.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{rec.tipo.toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ManualAttendanceModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
      />
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; subtext?: string; }> = ({ title, value, icon, subtext }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
  </div>
);

export default Dashboard;