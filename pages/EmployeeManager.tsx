import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { Button, Input, Card, Badge } from '../components/UIComponents';
import { Search, Plus, Upload, Sparkles, X, Camera, QrCode, FileUp } from 'lucide-react';
import { Employee } from '../types';
import { analyzeIDCard } from '../services/geminiService';
import { supabase } from '../src/integrations/supabase/client';
import toast from 'react-hot-toast';

const EmployeeManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee, fetchEmployees } = useContext(AppContext)!;
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmployeeForQr, setSelectedEmployeeForQr] = useState<Employee | null>(null);

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
      const dataToSave = { ...formData };
      // Siempre generar el QR si la cédula está presente, asegurando que esté actualizado
      if (dataToSave.cedula) {
        dataToSave.qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToSave.cedula)}`;
      } else {
        dataToSave.qr_code_url = undefined; // O null, si la cédula se elimina
      }

      const result = isEditing
        ? await updateEmployee(formData.id!, dataToSave)
        : await addEmployee(dataToSave);

      if (result.error) {
        toast.error(`Error al guardar: ${result.error.message}`);
      } else {
        toast.success(isEditing ? 'Empleado actualizado correctamente' : 'Empleado registrado correctamente');
        await fetchEmployees(); // Forzar la recarga de empleados para actualizar la UI
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error inesperado al guardar:", error);
      toast.error("Ocurrió un error inesperado. Intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, skipAnalysis = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setAnalysisError('');

    const filePath = `public/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('employee_photos').upload(filePath, file);

    if (uploadError) {
      setAnalysisError("Error al subir la imagen.");
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('employee_photos').getPublicUrl(filePath);
    setFormData(prev => ({ ...prev, foto: publicUrl }));

    if (skipAnalysis) {
      setIsUploading(false);
      toast.success('Foto actualizada. Guarde los cambios para confirmar.');
      return;
    }

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
        setIsUploading(false);
      }
    };
    reader.readDataURL(file);
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    
    try {
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');

      if (rows.length < 2) {
        toast.error("Archivo CSV inválido o vacío. Debe contener una cabecera y al menos un empleado.");
        return;
      }
      rows.shift(); // Remove header

      const parsedEmployees = rows.map(row => {
        const values = row.split(',').map(v => v.trim());
        if (values.length < 4 || !values[0] || !values[1]) return null;
        
        const nombre = values[0];
        const cedula = values[1];
        return {
          nombre,
          cedula,
          cargo: values[2],
          departamento: values[3],
          estado: 'activo' as 'activo',
          horario_entrada: '09:00:00',
          horario_salida: '18:00:00',
          fecha_ingreso: new Date().toISOString().split('T')[0],
          foto: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(nombre)}`,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cedula)}`,
        };
      }).filter((emp): emp is NonNullable<typeof emp> => emp !== null);

      if (parsedEmployees.length === 0) {
        toast.error("No se encontraron empleados válidos en el archivo. Verifique el formato del CSV.");
        return;
      }

      const { data: existingEmployees, error: fetchError } = await supabase.from('employees').select('cedula');
      if (fetchError) throw fetchError;
      const existingCedulas = new Set(existingEmployees.map(e => e.cedula));

      const employeesToInsert = [];
      let skippedCount = 0;
      const cedulasInCsv = new Set();

      for (const emp of parsedEmployees) {
        if (existingCedulas.has(emp.cedula) || cedulasInCsv.has(emp.cedula)) {
          skippedCount++;
        } else {
          employeesToInsert.push(emp);
          cedulasInCsv.add(emp.cedula);
        }
      }

      if (employeesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('employees').insert(employeesToInsert);
        if (insertError) throw insertError;
      }

      if (employeesToInsert.length > 0) {
        toast.success(`${employeesToInsert.length} empleados nuevos registrados.`);
        fetchEmployees();
      }
      if (skippedCount > 0) {
        toast.success(`${skippedCount} empleados fueron omitidos por ser duplicados.`);
      }
      if (employeesToInsert.length === 0 && skippedCount === 0) {
        toast.error("No se procesó ningún empleado. Verifique el archivo.");
      }

    } catch (err: any) {
      toast.error(`Error en la carga masiva: ${err.message}`);
    } finally {
      setIsBulkUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleOpenQrModal = (emp: Employee) => {
    setSelectedEmployeeForQr(emp);
    setShowQrModal(true);
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setSelectedEmployeeForQr(null);
  };

  const handlePrintQr = () => {
    if (selectedEmployeeForQr?.qr_code_url) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html><head><title>Imprimir Código QR</title></head>
        <body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
          <h2>${selectedEmployeeForQr.nombre}</h2>
          <p style="font-size: 1.2em; color: #555;">${selectedEmployeeForQr.cedula}</p>
          <img src="${selectedEmployeeForQr.qr_code_url}" alt="Código QR" style="width: 250px; height: 250px;" />
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body></html>
      `);
      printWindow?.document.close();
    }
  };

  const handleDownloadQr = async () => {
    if (selectedEmployeeForQr?.qr_code_url) {
      try {
        const response = await fetch(selectedEmployeeForQr.qr_code_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const employeeName = selectedEmployeeForQr.nombre.replace(/[^a-zA-Z0-9]/g, '');
        const employeeId = selectedEmployeeForQr.cedula;
        const filename = `${employeeName}-${employeeId}.png`;

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading QR code:", error);
        toast.error("No se pudo descargar el código QR.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Personal</h1>
          <p className="text-gray-500">Administre empleados y sus credenciales de acceso</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <input type="file" ref={bulkFileInputRef} className="hidden" accept=".csv" onChange={handleBulkUpload} />
          <Button variant="outline" onClick={() => bulkFileInputRef.current?.click()} isLoading={isBulkUploading}>
            <FileUp size={18} className="mr-2" /> Carga Masiva
          </Button>
          <Button onClick={() => handleOpenModal()}><Plus size={18} className="mr-2" /> Nuevo Empleado</Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Input placeholder="Buscar por nombre, cédula o departamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:max-w-sm" />
          <a href="data:text/csv;charset=utf-8,Nombre%20Completo,C%C3%A9dula,Cargo,Departamento%0AJuan%20Perez,123456,Desarrollador,Tecnolog%C3%ADa" 
             download="plantilla_empleados.csv" 
             className="text-sm text-blue-600 hover:underline self-end sm:self-auto">
            Descargar plantilla CSV
          </a>
        </div>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(emp)}>Editar</Button>
                      <Button variant="secondary" size="sm" onClick={() => handleOpenQrModal(emp)} title="Ver Código QR"><QrCode size={16} /></Button>
                    </div>
                  </td>
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
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, isEditing)} />
            {!isEditing && (
              <div className="bg-blue-50 p-4 rounded-lg border"><div className="flex items-start gap-4"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Sparkles size={24} /></div><div><h3 className="font-semibold text-blue-900">Autocompletar con IA</h3><p className="text-sm text-blue-700 mb-3">Suba una foto del documento de identidad. Gemini analizará la imagen para extraer datos.</p><Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}><Upload size={16} className="mr-2" /> Subir Imagen</Button>{analysisError && <p className="text-xs text-red-500 mt-2">{analysisError}</p>}</div></div></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed flex items-center justify-center overflow-hidden">{formData.foto ? <img src={formData.foto} className="w-full h-full object-cover" alt="Preview" /> : <Camera className="text-gray-400" />}</div>
                {isEditing && (
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
                    <Upload size={14} className="mr-2" /> Cambiar Foto
                  </Button>
                )}
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

      {showQrModal && selectedEmployeeForQr && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-xs shadow-xl text-center">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Código QR de Acceso</h3>
              <button onClick={handleCloseQrModal}><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center">
              {selectedEmployeeForQr.qr_code_url ? (
                <img src={selectedEmployeeForQr.qr_code_url} alt={`QR for ${selectedEmployeeForQr.nombre}`} className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 bg-gray-100 flex items-center justify-center text-center p-4">
                  <p className="text-sm text-red-500">No se ha generado un código QR. Edite y guarde al empleado para crearlo.</p>
                </div>
              )}
              <p className="mt-4 font-semibold text-xl">{selectedEmployeeForQr.nombre}</p>
              <p className="text-gray-500 font-mono">{selectedEmployeeForQr.cedula}</p>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={handleDownloadQr}>Descargar</Button>
              <Button onClick={handlePrintQr}>Imprimir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;