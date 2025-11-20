import React from 'react';
import QrScanner from 'react-qr-scanner';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  if (!isOpen) return null;

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      onScan(data.text);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast.error('No se pudo acceder a la cámara. Verifique los permisos en su navegador.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-800 rounded-2xl overflow-hidden border border-slate-600">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-white">Escanear Código QR</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="p-1 bg-black">
          <QrScanner
            delay={300}
            constraints={{
              video: { facingMode: 'environment' }
            }}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div className="p-4 text-center text-sm text-slate-400 bg-slate-800">
          Apunta la cámara al código QR del empleado.
        </div>
      </div>
    </div>
  );
};