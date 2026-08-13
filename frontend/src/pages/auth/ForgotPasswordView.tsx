import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
      const parts = hostname.split('.');
      const sub = parts[0];
      if (sub.endsWith('-dashboard')) {
        const baseSub = sub.replace('-dashboard', '-api');
        return `https://${baseSub}.onrender.com`;
      }
    }
  }
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMsg(data.message || 'Se ha enviado el enlace de restablecimiento.');
      } else {
        setErrorMsg(data.error || 'Ocurrió un error. Verifique el correo ingresado.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de comunicación con el servidor.');
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
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Ingrese su correo corporativo para recibir el enlace de acceso
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

          {successMsg ? (
            <div className="space-y-4 text-center">
              <div className="mb-4 p-3.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-start gap-2.5 text-left">
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-emerald-450" />
                <span>{successMsg}</span>
              </div>
              <p className="text-xs text-slate-400">
                Revise la consola del servidor (backend terminal) para recuperar el enlace simulado en desarrollo.
              </p>
              <Link
                to="/login"
                className="mt-4 block w-full text-center py-2.5 px-4 border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico Corporativo
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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none active:bg-indigo-700 disabled:bg-slate-800 transition-all gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar Enlace de Recuperación</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {!successMsg && (
            <div className="mt-6 pt-5 border-t border-slate-850 text-center">
              <p className="text-xs text-slate-400">
                ¿Recordó su contraseña?{' '}
                <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Inicie Sesión
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
