import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, QrCode } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string | null) => void;
  scanCooldown?: number;
  isActive: boolean; // Prop para controlar la activación del escáner
}

const qrcodeRegionId = "qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, scanCooldown = 3000, isActive }) => {
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onScanFailureRef = useRef(onScanFailure);
  onScanFailureRef.current = onScanFailure;

  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const isScanningPausedRef = useRef(isScanningPaused);
  isScanningPausedRef.current = isScanningPaused;

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraDetectionAttempted, setCameraDetectionAttempted] = useState(false); // Nuevo estado para rastrear si se intentó detectar cámaras

  // Efecto para obtener dispositivos de cámara y seleccionar uno, se ejecuta una vez.
  useEffect(() => {
    const getCamera = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
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
      } finally {
        setCameraDetectionAttempted(true); // Marcar como intentado
      }
    };
    getCamera();
  }, []); // Se ejecuta una vez al montar el componente

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

  // Efecto para iniciar y detener el escáner basado en isActive y selectedCameraId
  useEffect(() => {
    const stopScanning = async () => {
      if (html5QrcodeScannerRef.current?.isScanning) {
        try {
          await html5QrcodeScannerRef.current.stop();
          if (onScanFailureRef.current) {
            onScanFailureRef.current(null); // Limpiar error al detener
          }
        } catch (error) {
          console.error("Fallo al detener el escáner.", error);
        }
      }
      html5QrcodeScannerRef.current = null; // Limpiar la instancia al detener
    };

    if (!isActive) {
      stopScanning();
      return;
    }

    // Si isActive es true, proceder a iniciar el escaneo
    if (isActive && selectedCameraId && cameraDetectionAttempted) {
      // Asegurarse de que el div esté renderizado antes de crear la instancia de Html5Qrcode
      const qrCodeRegionElement = document.getElementById(qrcodeRegionId);
      if (!qrCodeRegionElement) {
        console.error(`HTML Element with id=${qrcodeRegionId} not found when isActive is true.`);
        if (onScanFailureRef.current) {
          onScanFailureRef.current(`Error: Elemento '${qrcodeRegionId}' no encontrado.`);
        }
        return;
      }

      // Crear una nueva instancia solo si no existe o si fue limpiada
      if (!html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: false });
      }

      const currentHtml5Qrcode = html5QrcodeScannerRef.current;

      const startScanning = async () => {
        if (currentHtml5Qrcode.isScanning) {
          return; // Ya está escaneando
        }
        try {
          await currentHtml5Qrcode.start(
            selectedCameraId,
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
          if (onScanFailureRef.current) {
            onScanFailureRef.current(null); // Limpiar cualquier error previo al iniciar con éxito
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
      };

      startScanning();
    } else if (isActive && !selectedCameraId && cameraDetectionAttempted) {
      // Si está activo pero no hay cámara seleccionada después del intento de detección, reportar error
      if (onScanFailureRef.current) {
        onScanFailureRef.current('No se ha seleccionado una cámara o no hay cámaras disponibles.');
      }
    }

    return () => {
      // Limpieza: asegurar que el escáner se detenga cuando el componente se desmonte o isActive cambie a false
      stopScanning();
    };
  }, [isActive, selectedCameraId, handleScan, cameraDetectionAttempted]); // Dependencias

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
      {isActive ? (
        <>
          <div id={qrcodeRegionId} /> {/* Este div debe estar presente cuando isActive es true */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-[250px] h-[250px] border-4 border-blue-500/50 rounded-lg shadow-inner-strong" />
            <div className="mt-4 bg-black/50 px-4 py-2 rounded-lg text-white flex items-center gap-2">
              <Camera size={16} />
              <span>{isScanningPaused ? 'Procesando...' : 'Alinee el código QR'}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <QrCode size={64} className="mb-4" />
          <p className="text-lg">Escáner inactivo</p>
          <p className="text-sm">Presione "Iniciar Escaneo" para activar la cámara.</p>
        </div>
      )}
    </div>
  );
};

const style = document.createElement('style');
style.innerHTML = `
  .shadow-inner-strong {
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  }
`;
document.head.appendChild(style);