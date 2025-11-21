import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  permission: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission }) => {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!can(permission)) {
    toast.error('No tienes permiso para acceder a esta página.');
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};