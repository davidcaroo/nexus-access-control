import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { Button, Input, Card, Badge } from '../components/UIComponents';
import { Search, Plus, Upload, Sparkles, X, Camera, Check } from 'lucide-react';
import { Employee } from '../types';
import { analyzeIDCard } from '../services/geminiService';

const EmployeeManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee } = useContext(AppContext)!;
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Gemini / AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = employees.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cedula.includes(searchTerm) ||
    e.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (emp?: Employee) => {
    if (emp) {
      setFormData(emp);
      setIsEditing(true);
    } else {
      setFormData({
        estado: 'activo',
        horario: { entrada: '09:00', salida: '18:00' },
        foto: 'https://picsum.photos/200/200' // Default placeholder
      });
      setIsEditing(false);
    }
    setAnalysisError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({});
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.cedula) return;

    const newEmp: Employee = {
      ...formData as Employee,
      id: isEditing ? formData.id! : crypto.randomUUID(),
      qrCode: `EMP-${formData.cedula}`, // Simple QR generation logic
      fechaIngreso: formData.fechaIngreso || new Date().toISOString().split('T')[0]
    };

    if (isEditing) {
      updateEmployee(newEmp);
    } else {
      addEmployee(newEmp);
    }
    handleCloseModal();
  };

  // AI Analysis Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Set the preview immediately
        setFormData(prev => ({ ...prev, foto: base64 }));

        try {
          // Call Gemini Service
          const result = await analyzeIDCard(base64);
          
          setFormData(prev => ({
            ...prev,
            nombre: result.nombre || prev.nombre,
            cedula: result.cedula || prev.cedula,
            // If description is returned, maybe use it as notes, but we don't have a notes field in UI.
            // We'll just console log it or show a toast in a real app.
          }));
          
          if (!result.nombre && !result.cedula) {
            setAnalysisError("No se pudo extraer información clara del documento. Por favor ingrese los datos manualmente.");
          }
        } catch (err) {
          setAnalysisError("Error al analizar la imagen con IA. Intente nuevamente.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setAnalysisError("Error al leer el archivo.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Personal</h1>
          <p className="text-gray-500">Administre empleados y sus credenciales de acceso</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} className="mr-2" /> Nuevo Empleado
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <Search className="text-gray-400 ml-2" size={20} />
          <input 
            className="bg-transparent w-full focus:outline-none text-gray-700"
            placeholder="Buscar por nombre, cédula o departamento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 text-sm">
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Cédula</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={emp.foto} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      <span className="font-medium text-gray-900">{emp.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{emp.cedula}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.cargo}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.departamento}</td>
                  <td className="px-4 py-3">
                    <Badge color={emp.estado === 'activo' ? 'green' : 'red'}>{emp.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleOpenModal(emp)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* AI Section */}
              {!isEditing && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                      <Sparkles size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">Autocompletar con IA (Gemini)</h3>
                      <p className="text-sm text-blue-700 mb-4">
                        Suba una foto del documento de identidad o del empleado. Gemini analizará la imagen para extraer datos automáticamente.
                      </p>
                      
                      <div className="flex gap-3 items-center">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => fileInputRef.current?.click()}
                          isLoading={isAnalyzing}
                          className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                        >
                           <Upload size={16} className="mr-2" /> Subir Imagen
                        </Button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleFileChange}
                        />
                        {analysisError && <span className="text-xs text-red-500 font-medium">{analysisError}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                         {formData.foto ? (
                           <img src={formData.foto} className="w-full h-full object-cover" alt="Preview" />
                         ) : (
                           <Camera className="text-gray-400" size={32} />
                         )}
                      </div>
                    </div>
                    <Input 
                      label="Cédula / ID *" 
                      value={formData.cedula || ''} 
                      onChange={e => setFormData({...formData, cedula: e.target.value})}
                      required
                    />
                    <Input 
                      label="Nombre Completo *" 
                      value={formData.nombre || ''} 
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                 </div>
                 <div className="space-y-6">
                    <Input 
                      label="Cargo" 
                      value={formData.cargo || ''} 
                      onChange={e => setFormData({...formData, cargo: e.target.value})}
                    />
                    <Input 
                      label="Departamento" 
                      value={formData.departamento || ''} 
                      onChange={e => setFormData({...formData, departamento: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Hora Entrada" 
                        type="time"
                        value={formData.horario?.entrada || '09:00'} 
                        onChange={e => setFormData({...formData, horario: { ...formData.horario!, entrada: e.target.value }})}
                      />
                      <Input 
                        label="Hora Salida" 
                        type="time"
                        value={formData.horario?.salida || '18:00'} 
                        onChange={e => setFormData({...formData, horario: { ...formData.horario!, salida: e.target.value }})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={formData.estado}
                        onChange={e => setFormData({...formData, estado: e.target.value as any})}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;