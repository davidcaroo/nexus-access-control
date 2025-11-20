import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { ScanLine } from 'lucide-react';
import { supabase } from '../src/integrations/supabase/client';
import { AppContext } from '../App';

const Login: React.FC = () => {
  const { authState } = useContext(AppContext)!;
  const navigate = useNavigate();

  useEffect(() => {
    if (authState.isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [authState.isAuthenticated, navigate]);

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
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            view="sign_in"
            showLinks={true}
            socialLayout="horizontal"
            localization={{
              variables: {
                sign_in: { email_label: 'Correo Electrónico', password_label: 'Contraseña', button_label: 'Iniciar Sesión' },
                sign_up: {
                  link_text: '',
                  message: '',
                },
                forgotten_password: { 
                  email_label: 'Correo Electrónico', 
                  button_label: 'Enviar instrucciones', 
                  link_text: '¿Olvidaste tu contraseña?',
                  confirmation_text: 'Revisa tu correo para ver el enlace de restablecimiento de contraseña.'
                }
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;