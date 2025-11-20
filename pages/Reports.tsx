import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Card, Badge, Button } from '../components/UIComponents';
import { Download, Filter } from 'lucide-react';

const Reports: React.FC = () => {
  const { records, employees } = useContext(AppContext)!;
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'salida'>('all');

  const filteredRecords = records.filter(r => {
    const dateMatch = r.fecha === filterDate;
    const typeMatch = filterType === 'all' || r.tipo === filterType;
    return dateMatch && typeMatch;
  });

  const downloadCSV = () => {
    const headers = ['ID Registro', 'Empleado', 'Fecha', 'Hora', 'Tipo', 'Tardanza'];
    const rows = filteredRecords.map(r => {
        const emp = employees.find(e => e.id === r.empleadoId);
        return [
            r.id,
            emp?.nombre || 'Unknown',
            r.fecha,
            r.hora,
            r.tipo,
            r.tardanza ? 'SI' : 'NO'
        ].join(',');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h1>
          <p className="text-gray-500">Historial detallado de accesos y eventos</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2">
          <Download size={18} /> Exportar CSV
        </Button>
      </div>

      <Card className="bg-white">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <input 
            type="date" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
             value={filterType}
             onChange={e => setFilterType(e.target.value as any)}
             className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Todos los eventos</option>
            <option value="entrada">Solo Entradas</option>
            <option value="salida">Solo Salidas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
            {filteredRecords.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="px-6 py-3 font-semibold">Fecha / Hora</th>
                    <th className="px-6 py-3 font-semibold">Empleado</th>
                    <th className="px-6 py-3 font-semibold">Departamento</th>
                    <th className="px-6 py-3 font-semibold">Tipo</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map(rec => {
                    const emp = employees.find(e => e.id === rec.empleadoId);
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{rec.hora}</div>
                          <div className="text-xs text-gray-500">{rec.fecha}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             {emp?.foto && <img src={emp.foto} className="w-8 h-8 rounded-full object-cover" alt="" />}
                             <span className="font-medium text-gray-900">{emp?.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{emp?.departamento}</td>
                        <td className="px-6 py-4">
                          <Badge color={rec.tipo === 'entrada' ? 'blue' : 'yellow'}>
                            {rec.tipo.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {rec.tardanza ? (
                            <Badge color="red">TARDE</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                No se encontraron registros para los filtros seleccionados.
              </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default Reports;