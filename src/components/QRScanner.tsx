import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string | null) => void; // Permite null para limpiar el error
  scanCooldown?: number; // Nueva prop para la duración del enfriamiento en ms
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, scanCooldown = 3000 }) => {
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null); // Ref para la instancia del escáner

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const isScanningPausedRef = useRef(isScanningPaused);
  isScanningPausedRef.current = isScanningPaused;

  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const handleScan = useCallback((decodedText: string) => {
    if (isScanningPausedRef.current) {
      return;
    }

    onScanSuccessRef.current(decodedText);
    
    setIsScanningPaused(true);
    setTimeout(() => {
      setIsScanningPaused(false);
    }, scanCooldown);
  }, [scanCooldown]);

  // Efecto para inicializar la instancia de Html5Qrcode y listar cámaras una vez
  useEffect(() => {
    const initScanner = async () => {
      if (!html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: false });
      }
      const html5Qrcode = html5QrcodeScannerRef.current;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          setAvailableCameras(devices.map(device => ({ id: device.id, label: device.label })));
          // Preferir la cámara de entorno (trasera) si está disponible, de lo contrario, la primera
          const environmentCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
          setSelectedCameraId(environmentCamera ? environmentCamera.id : devices[0].id);
          if (onScanFailureRef.current) {
            onScanFailureRef.current(null); // Limpiar cualquier error previo si se encuentran cámaras
          }
        } else {
          const msg = 'No se encontraron cámaras disponibles en este dispositivo.';
          if (onScanFailureRef.current) {
            onScanFailureRef.current(msg);
          }
        }
      } catch (err) {
        const errorMessage = String(err);
        let displayMessage = 'Error al acceder a las cámaras. Verifique que no estén en uso.';
        if (errorMessage.toLowerCase().includes('permission')) {
          displayMessage = 'Permiso de cámara denegado. Por favor, habilítelo en su navegador.';
        }
        if (onScanFailureRef.current) {
          onScanFailureRef.current(displayMessage);
        }
      }
    };

    initScanner();
  }, []); // Array de dependencias vacío asegura que esto se ejecute solo una vez

  // Efecto para iniciar y detener el escáner basado en selectedCameraId
  useEffect(() => {
    const html5Qrcode = html5QrcodeScannerRef.current;
    if (!html5Qrcode || !selectedCameraId) {
      // Si no hay cámara seleccionada y no hay cámaras disponibles, notificar al padre
      if (!selectedCameraId && availableCameras.length === 0 && onScanFailureRef.current) {
        onScanFailureRef.current('No se encontraron cámaras disponibles en este dispositivo.');
      }
      return;
    }

    const startScanning = async () => {
      if (!html5Qrcode.isScanning) {
        try {
          await html5Qrcode.start(
            selectedCameraId, // Usar el ID de la cámara seleccionada
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            handleScan,
            (errorMessage) => {
              // Ignorar errores de "QR no encontrado"
            }
          );
          // Si el inicio es exitoso, limpiar cualquier error previo
          if (onScanFailureRef.current) {
            onScanFailureRef.current(null);
          }
        } catch (err) {
          const errorMessage = String(err);
          let displayMessage = 'No se pudo iniciar la cámara. Verifique los permisos y que no esté en uso.';
          if (errorMessage.toLowerCase().includes('permission')) {
            displayMessage = 'Permiso de cámara denegado. Por favor, habilítelo en su navegador.';
          }
          if (onScanFailureRef.current) {
            onScanFailureRef.current(displayMessage);
          }
        }
      }
    };

    startScanning();

    return () => {
      // Detener el escáner cuando el componente se desmonta o las dependencias cambian
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(error => {
          console.error("Fallo al detener el escáner en la limpieza.", error);
        });
      }
    };
  }, [selectedCameraId, handleScan, availableCameras.length]); // Reiniciar si la cámara seleccionada o el número de cámaras cambia

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