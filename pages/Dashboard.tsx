import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/UIComponents';
import { Users, UserCheck, UserX, Clock, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const Dashboard: React.FC = () => {
  const { employees, records } = useContext(AppContext)!;

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysRecords = records.filter(r => r.fecha === today);
    
    // Unique employees who have entered
    const presentIds = new Set(todaysRecords.filter(r => r.tipo === 'entrada').map(r => r.empleadoId));
    
    const totalEmployees = employees.length;
    const presentCount = presentIds.size;
    const absentCount = totalEmployees - presentCount;
    
    const lates = todaysRecords.filter(r => r.tardanza).length;

    return { totalEmployees, presentCount, absentCount, lates };
  }, [employees, records]);

  const chartData = [
    { name: 'Presentes', value: stats.presentCount, color: '#10B981' },
    { name: 'Ausentes', value: stats.absentCount, color: '#EF4444' },
  ];

  const weeklyData = [
    { name: 'Lun', asistencia: 95 },
    { name: 'Mar', asistencia: 92 },
    { name: 'Mie', asistencia: 98 },
    { name: 'Jue', asistencia: 85 },
    { name: 'Vie', asistencia: stats.presentCount > 0 ? (stats.presentCount/stats.totalEmployees)*100 : 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Personal" 
          value={stats.totalEmployees} 
          icon={<Users className="text-blue-600" />} 
          trend="+2 nuevos"
        />
        <StatCard 
          title="Presentes Hoy" 
          value={stats.presentCount} 
          icon={<UserCheck className="text-emerald-600" />} 
          subtext={`${((stats.presentCount/stats.totalEmployees)*100 || 0).toFixed(0)}% asistencia`}
        />
        <StatCard 
          title="Ausentes" 
          value={stats.absentCount} 
          icon={<UserX className="text-red-600" />} 
          alert={stats.absentCount > 5}
        />
        <StatCard 
          title="Tardanzas" 
          value={stats.lates} 
          icon={<Clock className="text-amber-600" />} 
          subtext="Entradas > 09:00"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2" title="Resumen Semanal de Asistencia">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F3F4F6' }}
                />
                <Bar dataKey="asistencia" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribution Chart */}
        <Card title="Estado Actual">
          <div className="h-72 w-full flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-800">{stats.presentCount}</span>
              <span className="text-xs text-gray-500">en sitio</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card title="Actividad Reciente">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.slice(-5).reverse().map(rec => {
                const emp = employees.find(e => e.id === rec.empleadoId);
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp?.nombre || 'Desconocido'}</td>
                    <td className="px-4 py-3 text-gray-500">{rec.hora}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rec.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rec.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                       {rec.tardanza ? (
                         <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                           <AlertTriangle size={12} /> Tarde
                         </span>
                       ) : (
                         <span className="text-green-600 text-xs">A tiempo</span>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; subtext?: string; trend?: string; alert?: boolean }> = ({ 
  title, value, icon, subtext, trend, alert 
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {(subtext || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && <span className="text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">{trend}</span>}
          {subtext && <span className="text-gray-400">{subtext}</span>}
        </div>
      )}
      {alert && (
         <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded w-fit">
            <AlertTriangle size={12} /> Atención requerida
         </div>
      )}
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
  </div>
);

export default Dashboard;