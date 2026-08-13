import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Key, Mail, Building, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

interface RegisterViewProps {
  onRegisterSuccess: (token: string, user: any) => void;
}

export default function RegisterView({ onRegisterSuccess }: RegisterViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Consent states
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !companyName) return;

    if (!privacyConsent) {
      setErrorMsg('Debe aceptar la política de privacidad y los términos de uso para registrarse.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          company_name: companyName,
          privacy_consent: privacyConsent,
          marketing_consent: marketingConsent
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onRegisterSuccess(data.token, data.user);
        navigate('/dashboard', { state: location.state });
      } else {
        setErrorMsg(data.error || 'Error al crear la cuenta de la organización.');
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
          Registro de Empresa
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Inicie su proceso de auditoría y remediación legal
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
              <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Razón Social / Organización
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Building size={16} />
                </div>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="pl-10 block w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-indigo-500/50"
                  placeholder="ej. Inversiones Andes SpA"
                />
              </div>
            </div>

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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 text-slate-200 placeholder-slate-700 text-sm focus:outline-none focus:border-indigo-500/50"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3.5 pt-1 select-none">
              <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-4 h-4 mt-0.5"
                  required
                />
                <span className="leading-tight text-left">
                  He leído y acepto la{' '}
                  <Link to="/privacidad" target="_blank" className="text-indigo-400 hover:underline">
                    Política de Privacidad
                  </Link>{' '}
                  y los{' '}
                  <Link to="/terminos" target="_blank" className="text-indigo-400 hover:underline">
                    Términos y Condiciones
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-4 h-4 mt-0.5"
                />
                <span className="leading-tight text-left">
                  Acepto recibir correos comerciales y actualizaciones de producto (opcional).
                </span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !privacyConsent}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-0 active:bg-indigo-700 disabled:bg-slate-800 transition-all gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 loader" />
                    <span>Creando Cuenta...</span>
                  </>
                ) : (
                  <span>Registrar Cuenta Corporativa</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-850 text-center">
            <p className="text-xs text-slate-400">
              ¿Ya tienes una cuenta registrada?{' '}
              <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Inicia Sesión
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
