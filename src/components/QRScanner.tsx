import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  useEffect(() => {
    // Creamos una nueva instancia cada vez que el componente se monta.
    // Esto es más seguro ya que la librería gestiona mucho estado del DOM.
    const html5Qrcode = new Html5Qrcode(qrcodeRegionId);

    const start = async () => {
      try {
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, _decodedResult) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Este callback es para errores de "QR no encontrado", podemos ignorarlo.
          }
        );
      } catch (err) {
        if (onScanFailure) {
          onScanFailure(String(err));
        }
      }
    };

    start();

    // La función de limpieza es crucial. Se ejecuta cuando el componente se desmonta.
    return () => {
      // Es importante comprobar si el escáner está activo antes de detenerlo.
      // El método stop() es asíncrono y devuelve una promesa.
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((err) => {
          console.error("Fallo al detener el escáner QR.", err);
        });
      }
    };
    // El array de dependencias asegura que este efecto se ejecute solo cuando los callbacks cambian.
    // Al memorizarlos en el padre, nos aseguramos de que solo se ejecute al montar y desmontar.
  }, [onScanSuccess, onScanFailure]);

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