import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
  scanCooldown?: number; // Nueva prop para la duración del enfriamiento en ms
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, scanCooldown = 3000 }) => { // Por defecto 3 segundos
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const isScanningPausedRef = useRef(isScanningPaused); // Ref para mantener el estado más reciente
  isScanningPausedRef.current = isScanningPaused; // Mantener el ref actualizado

  // Memoizar el manejador de escaneo para evitar recrearlo en cada render
  const handleScan = useCallback((decodedText: string) => {
    if (isScanningPausedRef.current) { // Verificar el estado más reciente a través del ref
      return;
    }

    onScanSuccessRef.current(decodedText);
    
    setIsScanningPaused(true);
    setTimeout(() => {
      setIsScanningPaused(false);
    }, scanCooldown);
  }, [scanCooldown]); // Solo recrear si scanCooldown cambia

  useEffect(() => {
    if (!html5QrcodeRef.current) { // Inicializar el escáner solo una vez
      html5QrcodeRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: false });
    }
    const html5Qrcode = html5QrcodeRef.current;

    const startScanner = () => {
      html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        handleScan, // Usar el manejador memoizado
        (errorMessage) => {
          // Ignorar errores de "QR no encontrado"
        }
      ).catch(err => {
        if (onScanFailureRef.current) {
          onScanFailureRef.current(String(err));
        }
      });
    };

    startScanner();

    // Función de limpieza para detener el escáner cuando el componente se desmonta
    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(error => {
          console.error("Fallo al detener el escáner en la limpieza.", error);
        });
      }
    };
  }, [handleScan]); // Dependencia en handleScan

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
      <div id={qrcodeRegionId} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[250px] h-[250px] border-4 border-blue-500/50 rounded-lg shadow-inner-strong" />
        <div className="mt-4 bg-black/50 px-4 py-2 rounded-lg text-white flex items-center gap-2">
          <Camera size={16} />
          <span>{isScanningPaused ? 'Procesando...' : 'Alinee el código QR'}</span>
        </div>
      </div>
    </div>
  );
};

// Estilo para la sombra interior
const style = document.createElement('style');
style.innerHTML = `
  .shadow-inner-strong {
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  }
`;
document.head.appendChild(style);