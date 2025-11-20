import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        success: {
          style: {
            background: '#F0FDF4',
            color: '#166534',
            border: '1px solid #A7F3D0',
          },
          iconTheme: {
            primary: '#22C55E',
            secondary: 'white',
          },
        },
        error: {
          style: {
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          },
          iconTheme: {
            primary: '#EF4444',
            secondary: 'white',
          },
        },
      }}
    />
  );
};