import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  useEffect(() => {
    // Inicializa el escáner solo una vez
    if (!html5QrcodeRef.current) {
      html5QrcodeRef.current = new Html5Qrcode(qrcodeRegionId);
    }
    const html5Qrcode = html5QrcodeRef.current;

    const startScanner = async () => {
      try {
        // Asegurarse de que no haya un escaneo activo antes de empezar
        if (html5Qrcode.getState() === Html5QrcodeScannerState.SCANNING) {
          await html5Qrcode.stop();
        }
        
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, _decodedResult) => {
            onScanSuccessRef.current(decodedText);
          },
          (errorMessage) => {
            // Ignorar errores comunes de "no se encontró QR"
          }
        );
      } catch (err) {
        if (onScanFailureRef.current) {
          onScanFailureRef.current(String(err));
        }
      }
    };

    startScanner();

    // Esta es la función de limpieza CRÍTICA que se ejecuta cuando el componente se desmonta
    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop()
          .then(() => console.log("QR Scanner stopped successfully."))
          .catch((err) => console.error("Failed to stop QR Scanner.", err));
      }
    };
  }, []); // El array vacío asegura que se ejecute al montar y desmontar

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