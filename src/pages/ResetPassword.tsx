import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';

const API_URL = (globalThis as any).__VITE_API_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [step, setStep] = useState<'validating' | 'form' | 'success' | 'error'>('validating');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Validar token al cargar
    useEffect(() => {
        if (!token) {
            setStep('error');
            setError('Token no encontrado. Solicita un nuevo enlace de restauración.');
            return;
        }

        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/validate-token/${token}`);
            const data = await response.json();

            if (!response.ok || !data.valid) {
                setStep('error');
                setError(data.message || 'El enlace de restauración es inválido o ha expirado.');
            } else {
                setStep('form');
            }
        } catch (err) {
            setStep('error');
            setError('Error al validar el token. Por favor, intenta de nuevo.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setError('Por favor completa todos los campos.');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Error al restaurar la contraseña.');
            } else {
                setStep('success');
                // Redirigir al login después de 3 segundos
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            setError('Error al restaurar la contraseña. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden border border-slate-700">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-8 text-center">
                        <Lock className="w-12 h-12 text-white mx-auto mb-3" />
                        <h1 className="text-2xl font-bold text-white">Restaurar Contraseña</h1>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 'validating' && (
                            <div className="text-center">
                                <div className="inline-block">
                                    <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="mt-4 text-slate-400">Validando tu enlace...</p>
                            </div>
                        )}

                        {step === 'form' && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-sm text-red-400">{error}</p>
                                    </div>
                                )}

                                {/* Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError('');
                                            }}
                                            placeholder="Mínimo 8 caracteres"
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                setError('');
                                            }}
                                            placeholder="Repite tu contraseña"
                                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                >
                                    {loading ? 'Procesando...' : 'Restaurar Contraseña'}
                                </button>

                                {/* Password Requirements */}
                                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 mt-4">
                                    <p className="text-xs text-slate-400 mb-2">Requisitos:</p>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li className={password.length >= 8 ? 'text-green-400' : ''}>
                                            • Mínimo 8 caracteres
                                        </li>
                                        <li className={password === confirmPassword && password ? 'text-green-400' : ''}>
                                            • Las contraseñas deben coincidir
                                        </li>
                                    </ul>
                                </div>
                            </form>
                        )}

                        {step === 'success' && (
                            <div className="text-center">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">¡Éxito!</h2>
                                <p className="text-slate-400 mb-4">
                                    Tu contraseña ha sido restaurada exitosamente.
                                </p>
                                <p className="text-sm text-slate-500">
                                    Serás redirigido al login en 3 segundos...
                                </p>
                            </div>
                        )}

                        {step === 'error' && (
                            <div className="text-center">
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                                <p className="text-slate-400 mb-6">{error}</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
                                >
                                    Volver al Login
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-700/20 px-6 py-3 text-center border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                            © Nexus Access Control
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
