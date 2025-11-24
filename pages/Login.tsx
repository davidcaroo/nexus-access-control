import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppContext } from '../App';
import { apiClient } from '../src/services/apiClient';

const Login: React.FC = () => {
  const { authState, setAuthState } = useContext(AppContext)!;
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (authState.isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [authState.isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login(email, password);
      setAuthState({
        isAuthenticated: true,
        user: {
          id: response.user.id,
          email: response.user.email,
          full_name: response.user.full_name,
          role: response.user.role,
        } as any,
      });
      toast.success('¡Bienvenido!');
      navigate('/admin/dashboard');
    } catch (err: any) {
      // Mostrar mensajes más específicos según el error
      let errorMessage = 'Credenciales inválidas';

      if (err.message.includes('Access denied')) {
        errorMessage = 'Usted no tiene permisos para ingresar a este módulo';
        toast.error(errorMessage);
      } else if (err.message.includes('banned')) {
        errorMessage = 'Su cuenta ha sido bloqueada';
        toast.error(errorMessage);
      } else if (err.message) {
        errorMessage = err.message;
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }

      setError(errorMessage);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setForgotLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
      toast.success('Se ha enviado un enlace de recuperación a tu correo');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotEmail('');
        setForgotSent(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotSent(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <ScanLine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nexus Access</h1>
          <p className="text-slate-400 mt-2">Sistema Integral de Control de Personal</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>

        {/* Modal de Recuperación de Contraseña */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Recuperar Contraseña</h2>
                <button
                  onClick={closeForgotModal}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {!forgotSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu contraseña.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                    >
                      {forgotLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                    </button>

                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">¡Correo Enviado!</h3>
                    <p className="text-sm text-slate-600">
                      Hemos enviado un enlace de recuperación a <strong>{forgotEmail}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Por favor verifica tu bandeja de entrada. El enlace expirará en 15 minutos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;