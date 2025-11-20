import React, { useState, useEffect, useRef, useContext } from 'react';
import { Clock, QrCode, User as UserIcon, LogIn, LogOut, RefreshCw, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { Button, Card, Input } from '../components/UIComponents';
import { Employee } from '../types';

const AccessTerminal: React.FC = () => {
  const { addRecord } = useContext(AppContext)!;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [cedulaInput, setCedulaInput] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string, employee?: Employee }>({ type: 'idle', message: '' });
  
  // Simulating a camera stream ref
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-clear status
  useEffect(() => {
    if (status.type !== 'idle') {
      const timer = setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Camera simulation effect
  useEffect(() => {
    if (mode === 'scan' && videoRef.current) {
      // In a real app, we would use navigator.mediaDevices.getUserMedia here
      // For this demo, we show a placeholder
    }
  }, [mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput) return;
    processAccess(cedulaInput);
    setCedulaInput('');
  };

  const processAccess = (id: string) => {
    const result = addRecord(id);
    if (result.success) {
      setStatus({ type: 'success', message: result.message, employee: result.employee });
    } else {
      setStatus({ type: 'error', message: result.message });
    }
  };

  // Mock QR Scan
  const simulateScan = () => {
    // Simulates scanning "101010" (Juan Perez)
    processAccess('101010');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-600 rounded-full blur-3xl transform scale-150"></div>
        <div className="absolute top-1/2 right-0 w-2/3 h-2/3 bg-emerald-600 rounded-full blur-3xl"></div>
      </div>

      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide">Punto de Acceso</h1>
            <p className="text-slate-400 text-sm">Terminal Principal</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to="/login" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium text-slate-300"
          >
            <Shield size={16} />
            Admin
          </Link>
          <div className="text-right border-l border-white/10 pl-6">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {currentTime.toLocaleTimeString('es-ES', { hour12: false })}
            </div>
            <div className="text-slate-400 uppercase tracking-widest text-sm font-medium">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Scanner/Input */}
          <div className="space-y-8">
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-white/10 flex mb-6">
              <button 
                onClick={() => setMode('scan')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <QrCode size={18} /> Escáner QR
              </button>
              <button 
                onClick={() => setMode('manual')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${mode === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <UserIcon size={18} /> Teclado Numérico
              </button>
            </div>

            <Card className="bg-slate-800 border-slate-700 text-slate-100 p-1 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
              {status.type === 'success' && status.employee ? (
                <div className="absolute inset-0 z-20 bg-emerald-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-32 h-32 rounded-full border-4 border-emerald-500 overflow-hidden shadow-2xl mb-4">
                    <img src={status.employee.foto} alt={status.employee.nombre} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-1">{status.employee.nombre}</h2>
                  <p className="text-emerald-300 text-lg mb-6">{status.employee.cargo}</p>
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-200 px-6 py-3 rounded-full text-xl font-bold">
                    <CheckCircle2 size={28} />
                    {status.message}
                  </div>
                </div>
              ) : status.type === 'error' ? (
                <div className="absolute inset-0 z-20 bg-red-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-200 mb-2">Error de Registro</h3>
                  <p className="text-white/80">{status.message}</p>
                </div>
              ) : null}

              {mode === 'scan' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="relative w-64 h-64 border-2 border-blue-500/50 rounded-3xl flex items-center justify-center mb-6 overflow-hidden bg-black/50">
                    <div className="absolute inset-0 border-t-4 border-blue-500 animate-scan"></div>
                    <QrCode className="w-24 h-24 text-white/10" />
                    <p className="absolute bottom-4 text-xs text-blue-400 font-mono animate-pulse">BUSCANDO QR...</p>
                  </div>
                  <p className="text-slate-400 mb-8">Posicione su código QR frente a la cámara</p>
                  <Button onClick={simulateScan} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                     Simular Escaneo (Demo)
                  </Button>
                </div>
              ) : (
                <div className="p-8 flex flex-col justify-center h-full">
                  <h3 className="text-xl font-semibold mb-6 text-center">Ingrese su número de Cédula</h3>
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <input
                      type="text"
                      value={cedulaInput}
                      onChange={e => setCedulaInput(e.target.value)}
                      className="w-full bg-slate-900 border-2 border-slate-700 text-white text-3xl text-center py-4 rounded-xl focus:border-blue-500 focus:outline-none tracking-widest"
                      placeholder="00000000"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        type="button"
                        onClick={() => processAccess(cedulaInput)}
                        className="bg-emerald-600 hover:bg-emerald-700 py-4 text-lg"
                      >
                        <LogIn className="mr-2" /> Entrada
                      </Button>
                       <Button 
                        type="button"
                        onClick={() => processAccess(cedulaInput)} // The logic auto-detects, but UI could force
                        className="bg-amber-600 hover:bg-amber-700 py-4 text-lg"
                      >
                        <LogOut className="mr-2" /> Salida
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </div>

          {/* Right Side: Instructions / Recent */}
          <div className="hidden lg:block space-y-8 text-slate-300">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Instrucciones</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div>
                  <p className="mt-1">Seleccione el método de identificación (QR o Cédula).</p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">2</div>
                  <p className="mt-1">Espere la confirmación visual y sonora del sistema.</p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">3</div>
                  <p className="mt-1">Si presenta problemas, contacte a Talento Humano.</p>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Clock size={18} /> Estatus del Sistema
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block">Conexión</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
                  </span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block">Sincronización</span>
                  <span className="text-blue-400 font-medium">Tiempo Real</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default AccessTerminal;