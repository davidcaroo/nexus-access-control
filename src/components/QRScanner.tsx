import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  // Usamos refs para mantener las últimas versiones de las funciones callback
  // sin necesidad de reiniciar el efecto de escaneo.
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(qrcodeRegionId);

    const startScanner = async () => {
      try {
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, _decodedResult) => {
            // Usamos la ref para llamar siempre a la última función onScanSuccess
            onScanSuccessRef.current(decodedText);
          },
          (errorMessage) => {
            // Ignoramos los errores comunes de "no se encontró QR" para no saturar la consola.
            // Si se desea manejar estos errores, se puede llamar a onScanFailureRef.current aquí.
          }
        );
      } catch (err) {
        // Este error suele ser por falta de permisos o cámara no encontrada.
        if (onScanFailureRef.current) {
          onScanFailureRef.current(String(err));
        }
      }
    };

    startScanner();

    // La función de limpieza es crucial para liberar la cámara.
    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((err) => {
          console.error("Fallo al detener el escáner QR durante la limpieza.", err);
        });
      }
    };
  }, []); // El array de dependencias vacío asegura que este efecto se ejecute UNA SOLA VEZ.

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