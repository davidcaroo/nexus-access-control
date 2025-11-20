import React, { useState, useEffect, useContext } from 'react';
import { Clock, QrCode, User as UserIcon, LogIn, LogOut, AlertCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { Button, Card } from '../components/UIComponents';
import { Employee } from '../types';
import toast from 'react-hot-toast';

const AccessTerminal: React.FC = () => {
  const { addRecord, employees, records } = useContext(AppContext)!;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [cedulaInput, setCedulaInput] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string, employee?: Employee }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status.type !== 'idle') {
      const timer = setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const processAccess = async (id: string, tipo: 'entrada' | 'salida', metodo: 'manual' | 'qr') => {
    if (!id || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await addRecord(id, tipo, metodo);
      if (result.success) {
        setStatus({ type: 'success', message: result.message, employee: result.employee });
        toast.success(result.message);
      } else {
        setStatus({ type: 'error', message: result.message });
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error processing access:", error);
      setStatus({ type: 'error', message: 'Ocurrió un error inesperado.' });
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsProcessing(false);
      setCedulaInput('');
    }
  };
  
  const simulateScan = () => {
    const simulatedCedula = '101010';
    const employee = employees.find(e => e.cedula === simulatedCedula);
    if (!employee) {
        toast.error("Empleado de simulación no encontrado.");
        return;
    }
    // Find the last record for this specific employee to toggle
    const lastRecord = records.find(r => r.employee_id === employee.id);
    const type = !lastRecord || lastRecord.tipo === 'salida' ? 'entrada' : 'salida';
    
    processAccess(simulatedCedula, type, 'qr');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center"><QrCode className="w-6 h-6" /></div><div><h1 className="text-2xl font-bold">Punto de Acceso</h1><p className="text-slate-400 text-sm">Terminal Principal</p></div></div>
        <div className="flex items-center gap-6"><Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"><Shield size={16} /> Admin</Link><div className="text-right"><div className="text-4xl font-mono">{currentTime.toLocaleTimeString('es-ES', { hour12: false })}</div><div className="text-slate-400 text-sm">{currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div></div>
      </header>

      <main className="flex-1 relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-white/10 flex"><button onClick={() => setMode('scan')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-blue-600' : 'text-slate-400'}`}><QrCode size={18} /> Escáner QR</button><button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${mode === 'manual' ? 'bg-blue-600' : 'text-slate-400'}`}><UserIcon size={18} /> Teclado</button></div>
            <Card className="bg-slate-800 border-slate-700 text-slate-100 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
              {status.type === 'success' && status.employee ? (() => {
                const isEntry = status.message.toUpperCase().includes('ENTRADA');
                const color = isEntry ? 'emerald' : 'amber';
                const Icon = isEntry ? LogIn : LogOut;
                return (
                  <div className={`absolute inset-0 z-20 bg-${color}-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center p-6`}>
                    <div className={`w-32 h-32 rounded-full border-4 border-${color}-500 overflow-hidden mb-4`}>
                      <img src={status.employee.foto} alt={status.employee.nombre} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-3xl font-bold mb-1">{status.employee.nombre}</h2>
                    <p className={`text-${color}-300 text-lg mb-6`}>{status.employee.cargo}</p>
                    <div className={`flex items-center gap-2 bg-${color}-500/20 text-${color}-200 px-6 py-3 rounded-full text-xl font-bold`}>
                      <Icon size={28} /> {status.message}
                    </div>
                  </div>
                );
              })() : status.type === 'error' ? (
                <div className="absolute inset-0 z-20 bg-red-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"><div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-12 h-12 text-red-500" /></div><h3 className="text-2xl font-bold text-red-200 mb-2">Error de Acceso</h3><p className="text-white/80">{status.message}</p></div>
              ) : null}
              
              {mode === 'scan' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="relative w-64 h-64 border-2 border-blue-500/50 rounded-3xl flex items-center justify-center mb-6 bg-black/50"><QrCode className="w-24 h-24 text-white/10" /><p className="absolute bottom-4 text-xs text-blue-400">APUNTE EL CÓDIGO QR</p></div><Button onClick={simulateScan} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">Simular Escaneo</Button></div>
              ) : (
                <div className="p-8">
                  <h3 className="text-xl font-semibold mb-6 text-center">Ingrese Cédula</h3>
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                    <input type="text" value={cedulaInput} onChange={e => setCedulaInput(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 text-white text-3xl text-center py-4 rounded-xl" placeholder="000000" autoFocus />
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" onClick={() => processAccess(cedulaInput, 'entrada', 'manual')} isLoading={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 py-4 text-lg"><LogIn className="mr-2" /> Entrada</Button>
                      <Button type="button" onClick={() => processAccess(cedulaInput, 'salida', 'manual')} isLoading={isProcessing} className="bg-amber-600 hover:bg-amber-700 py-4 text-lg"><LogOut className="mr-2" /> Salida</Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </div>
          <div className="hidden lg:block space-y-8 text-slate-300">
            <h2 className="text-3xl font-bold text-white mb-4">Instrucciones</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div><p className="mt-1">Seleccione el método de identificación (QR o Cédula).</p></li>
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">2</div><p className="mt-1">Espere la confirmación visual del sistema.</p></li>
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">3</div><p className="mt-1">Si presenta problemas, contacte a Talento Humano.</p></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccessTerminal;