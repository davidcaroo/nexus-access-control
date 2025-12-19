import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center space-y-6 p-8">
                {/* Logo o icono principal */}
                <div className="flex justify-center">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full bg-blue-500/20 animate-ping" />
                    </div>
                </div>

                {/* Texto de carga */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Nexus Access Control</h2>
                    <p className="text-gray-400 animate-pulse">Cargando sistema...</p>
                </div>

                {/* Barra de progreso animada */}
                <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-[progress_1.5s_ease-in-out_infinite]" />
                </div>
            </div>

            <style>{`
        @keyframes progress {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 75%;
            margin-left: 0%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
        </div>
    );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => {
    return (
        <div className="animate-pulse space-y-3">
            {/* Header skeleton */}
            <div className="flex gap-4 pb-3 border-b border-gray-200">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={`header-${i}`} className="flex-1 h-4 bg-gray-200 rounded" />
                ))}
            </div>

            {/* Rows skeleton */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 py-3 border-b border-gray-100">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={`cell-${rowIndex}-${colIndex}`} className="flex-1">
                            <div className="h-3 bg-gray-100 rounded w-full" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
            <div className="space-y-4">
                {/* Title */}
                <div className="h-6 bg-gray-200 rounded w-1/3" />

                {/* Content lines */}
                <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-5/6" />
                    <div className="h-4 bg-gray-100 rounded w-4/6" />
                </div>

                {/* Footer */}
                <div className="flex gap-2 pt-4">
                    <div className="h-8 bg-gray-200 rounded w-20" />
                    <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
            </div>
        </div>
    );
};

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-64" />
                <div className="h-4 bg-gray-100 rounded w-96" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-8 bg-gray-300 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart area */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4" />
                    <div className="h-64 bg-gray-100 rounded" />
                </div>
            </div>

            {/* Table area */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <TableSkeleton rows={5} columns={5} />
                </div>
            </div>
        </div>
    );
};
