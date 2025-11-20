import React, { useState, useContext } from 'react';
import { Lock, ScanLine } from 'lucide-react';
import { AppContext } from '../App';
import { Button, Input, Card } from '../components/UIComponents';

const Login: React.FC = () => {
  const { login } = useContext(AppContext)!;
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(username, password)) {
      setError('Credenciales inválidas. Prueba: admin, rh, o gerencia');
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

        <Card className="shadow-2xl border-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Iniciar Sesión</h2>
              <p className="text-sm text-gray-500">Ingrese sus credenciales para continuar</p>
            </div>

            <Input 
              label="Usuario"
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="ej. admin"
            />
            
            <Input 
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <Lock size={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-3 text-lg">
              Acceder al Sistema
            </Button>
            
            <div className="mt-4 text-center text-xs text-gray-400">
               Usuarios demo: admin / rh / gerencia
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;