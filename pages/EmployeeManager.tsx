import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { Button, Input, Card, Badge } from '../components/UIComponents';
import { Search, Plus, Upload, Sparkles, X, Camera } from 'lucide-react';
import { Employee } from '../types';
import { analyzeIDCard } from '../services/geminiService';
import { supabase } from '../src/integrations/supabase/client';
import toast from 'react-hot-toast';

const EmployeeManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee } = useContext(AppContext)!;
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = employees.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cedula.includes(searchTerm) ||
    e.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (emp?: Employee) => {
    if (emp) {
      setFormData(emp);
      setIsEditing(true);
    } else {
      setFormData({
        estado: 'activo',
        horario_entrada: '09:00',
        horario_salida: '18:00',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.cedula) return;
    
    setIsSaving(true);

    try {
      const result = isEditing
        ? await updateEmployee(formData.id!, formData)
        : await addEmployee(formData);

      if (result.error) {
        toast.error(`Error al guardar: ${result.error.message}`);
      } else {
        toast.success(isEditing ? 'Empleado actualizado correctamente' : 'Empleado registrado correctamente');
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error inesperado al guardar:", error);
      toast.error("Ocurrió un error inesperado. Intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisError('');

    // Upload to Supabase Storage
    const filePath = `public/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('employee_photos').upload(filePath, file);

    if (uploadError) {
      setAnalysisError("Error al subir la imagen.");
      setIsAnalyzing(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('employee_photos').getPublicUrl(filePath);
    setFormData(prev => ({ ...prev, foto: publicUrl }));

    // Convert to Base64 for Gemini analysis
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const result = await analyzeIDCard(base64);
        setFormData(prev => ({
          ...prev,
          nombre: result.nombre || prev.nombre,
          cedula: result.cedula || prev.cedula,
        }));
        if (!result.nombre && !result.cedula) {
          setAnalysisError("No se pudo extraer información. Ingrese los datos manualmente.");
        }
      } catch (err) {
        setAnalysisError("Error al analizar con IA. Intente nuevamente.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Personal</h1>
          <p className="text-gray-500">Administre empleados y sus credenciales de acceso</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus size={18} className="mr-2" /> Nuevo Empleado</Button>
      </div>

      <Card>
        <div className="p-4"><Input placeholder="Buscar por nombre, cédula o departamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b text-sm"><th className="px-4 py-3 font-medium">Empleado</th><th className="px-4 py-3 font-medium">Cédula</th><th className="px-4 py-3 font-medium">Cargo</th><th className="px-4 py-3 font-medium">Departamento</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium text-right">Acciones</th></tr>
            </thead>
            <tbody className="text-sm divide-y">
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={emp.foto} alt={emp.nombre} className="w-10 h-10 rounded-full object-cover" /><span className="font-medium">{emp.nombre}</span></div></td>
                  <td className="px-4 py-3 font-mono">{emp.cedula}</td>
                  <td className="px-4 py-3">{emp.cargo}</td>
                  <td className="px-4 py-3">{emp.departamento}</td>
                  <td className="px-4 py-3"><Badge color={emp.estado === 'activo' ? 'green' : 'red'}>{emp.estado}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => handleOpenModal(emp)}>Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10"><h2 className="text-xl font-bold">{isEditing ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h2><button onClick={handleCloseModal}><X size={24} /></button></div>
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {!isEditing && (
              <div className="bg-blue-50 p-4 rounded-lg border"><div className="flex items-start gap-4"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Sparkles size={24} /></div><div><h3 className="font-semibold text-blue-900">Autocompletar con IA</h3><p className="text-sm text-blue-700 mb-3">Suba una foto del documento de identidad. Gemini analizará la imagen para extraer datos.</p><Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={isAnalyzing}><Upload size={16} className="mr-2" /> Subir Imagen</Button><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />{analysisError && <p className="text-xs text-red-500 mt-2">{analysisError}</p>}</div></div></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed flex items-center justify-center overflow-hidden">{formData.foto ? <img src={formData.foto} className="w-full h-full object-cover" alt="Preview" /> : <Camera className="text-gray-400" />}</div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Cédula / ID *" value={formData.cedula || ''} onChange={e => setFormData({...formData, cedula: e.target.value})} required />
                <Input label="Nombre Completo *" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                <Input label="Cargo" value={formData.cargo || ''} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                <Input label="Departamento" value={formData.departamento || ''} onChange={e => setFormData({...formData, departamento: e.target.value})} />
                <Input label="Hora Entrada" type="time" value={formData.horario_entrada || '09:00'} onChange={e => setFormData({...formData, horario_entrada: e.target.value })} />
                <Input label="Hora Salida" type="time" value={formData.horario_salida || '18:00'} onChange={e => setFormData({...formData, horario_salida: e.target.value })} />
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value as any})}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
              </div>
            </div>
            <div className="pt-4 border-t flex justify-end gap-3"><Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button><Button type="submit" isLoading={isSaving}>{isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}</Button></div>
          </form>
        </div></div>
      )}
    </div>
  );
};

export default EmployeeManager;