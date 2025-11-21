import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, QrCode } from 'lucide-react'; // Importar QrCode para el estado inactivo

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string | null) => void;
  scanCooldown?: number;
  isActive: boolean; // Nueva prop para controlar la activación del escáner
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

  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false); // Track if camera devices have been fetched

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

  // Effect to initialize Html5Qrcode instance and list cameras once
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
          const environmentCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
          setSelectedCameraId(environmentCamera ? environmentCamera.id : devices[0].id);
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
        setIsCameraInitialized(true); // Mark as initialized regardless of success
      }
    };

    initScanner();
  }, []);

  // Effect to start and stop the scanner based on isActive prop and selectedCameraId
  useEffect(() => {
    const html5Qrcode = html5QrcodeScannerRef.current;

    if (!html5Qrcode || !isCameraInitialized) { // Wait for camera initialization
      return;
    }

    const startScanning = async () => {
      if (!selectedCameraId) {
        if (onScanFailureRef.current) {
          onScanFailureRef.current('No se ha seleccionado una cámara o no hay cámaras disponibles.');
        }
        return;
      }
      if (html5Qrcode.isScanning) { // Already scanning, no need to restart
        return;
      }
      try {
        await html5Qrcode.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          handleScan,
          (errorMessage) => {
            // Ignore "QR not found" errors
          }
        );
        if (onScanFailureRef.current) {
          onScanFailureRef.current(null); // Clear any previous error on successful start
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

    const stopScanning = async () => {
      if (html5Qrcode.isScanning) {
        try {
          await html5Qrcode.stop();
          if (onScanFailureRef.current) {
            onScanFailureRef.current(null); // Clear error when stopping
          }
        } catch (error) {
          console.error("Fallo al detener el escáner.", error);
        }
      }
    };

    if (isActive) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      // Cleanup: ensure scanner is stopped when component unmounts or isActive becomes false
      stopScanning();
    };
  }, [isActive, selectedCameraId, handleScan, isCameraInitialized]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
      {isActive ? (
        <>
          <div id={qrcodeRegionId} />
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