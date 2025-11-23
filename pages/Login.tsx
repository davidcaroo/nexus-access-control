import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;