import React, { useState, useEffect, useContext, useCallback } from 'react';
import { QrCode, User as UserIcon, LogIn, LogOut, AlertCircle, Shield, CameraOff, Play } from 'lucide-react'; // Added Play icon
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { Button, Card } from '../components/UIComponents';
import { Employee } from '../types';
import toast from 'react-hot-toast';
import { QRScanner } from '../src/components/QRScanner';

const AccessTerminal: React.FC = () => {
  const { addRecord } = useContext(AppContext)!;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [cedulaInput, setCedulaInput] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string, employee?: Employee }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [displayedScannerError, setDisplayedScannerError] = useState<string | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(false); // New state for scanner activation

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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDisplayedScannerError(scannerError);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [scannerError]);

  const processAccess = useCallback(async (cedula: string, metodo: 'manual' | 'qr', tipo?: 'entrada' | 'salida') => {
    if (!cedula || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await addRecord(cedula, metodo, tipo);
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
      // If scan mode, deactivate scanner after processing
      if (metodo === 'qr') {
        setIsScannerActive(false); 
      }
    }
  }, [addRecord, isProcessing]);
  
  const handleScanSuccess = useCallback(async (cedula: string) => {
    if (isProcessing) return;
    setScannerError(null);
    await processAccess(cedula, 'qr');
  }, [processAccess, isProcessing]);

  const handleScanFailure = useCallback((error: string | null) => {
    console.error(`QR Scanner Error: ${error}`);
    setScannerError(error);
  }, []);

  const handleToggleScanner = () => {
    setIsScannerActive(prev => !prev);
    setScannerError(null); // Clear error when toggling scanner
    setDisplayedScannerError(null); // Clear debounced error too
  };

  // When switching modes, ensure scanner is off if going to manual, or ready to be activated if going to scan
  useEffect(() => {
    if (mode === 'manual') {
      setIsScannerActive(false);
      setScannerError(null);
      setDisplayedScannerError(null);
    }
  }, [mode]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
      <header className="relative z-10 p-4 sm:p-6 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold">Punto de Acceso</h1>
            <p className="text-slate-400 text-sm">Terminal Principal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
            <Shield size={16} />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-mono">{currentTime.toLocaleTimeString('es-ES', { hour12: false })}</div>
            <div className="text-slate-400 text-xs sm:text-sm">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-white/10 flex">
              <button onClick={() => setMode('scan')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-blue-600' : 'text-slate-400'}`}>
                <QrCode size={18} /> Escáner QR
              </button>
              <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${mode === 'manual' ? 'bg-blue-600' : 'text-slate-400'}`}>
                <UserIcon size={18} /> Teclado
              </button>
            </div>
            <Card className="bg-slate-800 border-slate-700 text-slate-100 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
              {
                status.type === 'success' && status.employee ? (() => {
                  const isEntry = status.message.toUpperCase().includes('ENTRADA');
                  const color = isEntry ? 'emerald' : 'amber';
                  const Icon = isEntry ? LogIn : LogOut;
                  return (
                    <div className={`flex flex-col items-center justify-center text-center p-6`}>
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
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-200 mb-2">Error de Acceso</h3>
                    <p className="text-white/80">{status.message}</p>
                  </div>
                ) : mode === 'scan' ? (
                  <div className="p-4">
                    {displayedScannerError && isScannerActive ? ( // Only show error if scanner is active
                      <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">
                        <CameraOff size={48} className="mx-auto mb-4" />
                        <h3 className="font-bold mb-2">Error de Cámara</h3>
                        <p className="text-sm">{displayedScannerError}</p>
                        <Button onClick={handleToggleScanner} className="mt-4 bg-blue-600 hover:bg-blue-700">
                          <Play size={18} className="mr-2" /> Reintentar Escáner
                        </Button>
                      </div>
                    ) : (
                      <>
                        <QRScanner onScanSuccess={handleScanSuccess} onScanFailure={handleScanFailure} isActive={isScannerActive} />
                        {!isScannerActive && (
                          <div className="text-center mt-6">
                            <Button onClick={handleToggleScanner} className="bg-blue-600 hover:bg-blue-700">
                              <Play size={18} className="mr-2" /> Iniciar Escaneo
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-8">
                    <h3 className="text-xl font-semibold mb-6 text-center">Ingrese Cédula</h3>
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                      <input type="text" value={cedulaInput} onChange={e => setCedulaInput(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 text-white text-3xl text-center py-4 rounded-xl" placeholder="000000" autoFocus />
                      <div className="grid grid-cols-2 gap-4">
                        <Button type="button" onClick={() => processAccess(cedulaInput, 'manual', 'entrada')} isLoading={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 py-4 text-lg"><LogIn className="mr-2" /> Entrada</Button>
                        <Button type="button" onClick={() => processAccess(cedulaInput, 'manual', 'salida')} isLoading={isProcessing} className="bg-amber-600 hover:bg-amber-700 py-4 text-lg"><LogOut className="mr-2" /> Salida</Button>
                      </div>
                    </form>
                  </div>
                )
              }
            </Card>
          </div>
          <div className="hidden lg:block space-y-8 text-slate-300">
            <h2 className="text-3xl font-bold text-white mb-4">Instrucciones</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div><p className="mt-1">Seleccione el modo "Escáner QR".</p></li>
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">2</div><p className="mt-1">Alinee el código QR del empleado dentro del visor.</p></li>
              <li className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">3</div><p className="mt-1">El sistema registrará la entrada o salida automáticamente.</p></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccessTerminal;