import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Usamos refs para las props para evitar que el useEffect se vuelva a ejecutar
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  useEffect(() => {
    // verbose: false desactiva los logs de la librería en la consola
    scannerRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: false });
    const html5Qrcode = scannerRef.current;

    const startScanner = () => {
      html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText, _decodedResult) => {
          // No detener el escáner aquí, el componente padre lo desmontará
          onScanSuccessRef.current(decodedText);
        },
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

    // La función de limpieza se ejecuta cuando el componente se desmonta
    return () => {
      // Usamos clear() que detiene el escaneo y limpia los recursos
      html5Qrcode.clear().catch(error => {
        console.error("Fallo al limpiar html5Qrcode.", error);
      });
    };
  }, []); // El array vacío asegura que se ejecute solo al montar y desmontar

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
      <div id={qrcodeRegionId} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[250px] h-[250px] border-4 border-blue-500/50 rounded-lg shadow-inner-strong" />
        <div className="mt-4 bg-black/50 px-4 py-2 rounded-lg text-white flex items-center gap-2">
          <Camera size={16} />
          <span>Alinee el código QR</span>
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