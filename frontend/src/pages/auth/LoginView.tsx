import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.token, data.user);
        navigate('/dashboard');
      } else {
        setErrorMsg(data.error || 'Credenciales inválidas. Reintente.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de comunicación con el servidor de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-950 text-indigo-400 border border-indigo-850 rounded-2xl shadow-xl shadow-indigo-500/10">
            <Shield size={40} className="animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Scanner DPO SaaS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Cumplimiento Integral Ley N° 21.719 en Chile
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-indigo-500/50"
                  placeholder="ejemplo@empresa.cl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-indigo-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-0 active:bg-indigo-700 disabled:bg-slate-800 transition-all gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 loader" />
                    <span>Iniciando Sesión...</span>
                  </>
                ) : (
                  <span>Ingresar al Dashboard</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-850 text-center">
            <p className="text-xs text-slate-400">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Registra tu Empresa
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
