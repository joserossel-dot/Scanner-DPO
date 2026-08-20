import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../lib/authFetch';
import { 
  Shield, 
  Copy, 
  Check, 
  ExternalLink, 
  Settings, 
  Search, 
  Plus, 
  Globe, 
  Key, 
  AlertTriangle,
  Code,
  FileCheck,
  Eye,
  RefreshCw,
  Cookie,
  UserCheck
} from 'lucide-react';

interface CmpManagerViewProps {
  token: string | null;
}

interface SiteConfig {
  domain: string;
  company_name: string;
  policy_version: string;
  banner_title: string;
  banner_description: string;
  api_key: string;
  updated_at: string;
}

interface ConsentLog {
  id: number;
  domain: string;
  ip_hash: string;
  consent_token: string;
  preferences: {
    essential: boolean;
    analytical: boolean;
    marketing: boolean;
    analytics?: boolean; // fallback
  };
  user_agent: string;
  policy_version: string;
  created_at: string;
}

interface FormConsentLog {
  id: number;
  client_id: string;
  user_identifier: string;
  privacy_policy_accepted: boolean;
  privacy_policy_version: string;
  marketing_opt_in: boolean;
  form_id: string;
  ip_hash: string;
  created_at: string;
}

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

export default function CmpManagerView({ token }: CmpManagerViewProps) {
  const [configs, setConfigs] = useState<SiteConfig[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  
  // Tab control: 'cookies' (Cookie Banner) vs 'forms' (Form Audit & Marketing)
  const [activeSubTab, setActiveSubTab] = useState<'cookies' | 'forms'>('cookies');
  
  // Consent Logs states
  const [logs, setLogs] = useState<ConsentLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Form Consent Logs states
  const [formLogs, setFormLogs] = useState<FormConsentLog[]>([]);
  const [isFormLogsLoading, setIsFormLogsLoading] = useState<boolean>(false);
  const [formCopied, setFormCopied] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New domain modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDomain, setNewDomain] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch configs
  const fetchConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/configs`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
        if (data.length > 0) {
          const exists = data.some((c: SiteConfig) => c.domain === selectedDomain);
          if (!exists) {
            setSelectedDomain(data[0].domain);
          }
        }
      } else {
        setError('Error al cargar las configuraciones de CMP.');
      }
    } catch (e) {
      console.error(e);
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cookie consent logs
  const fetchLogs = async (domain: string) => {
    if (!domain) return;
    setIsLogsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/consent/logs?client_id=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Fetch form consent logs
  const fetchFormLogs = async (domain: string) => {
    if (!domain) return;
    setIsFormLogsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/consent/form-logs?client_id=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setFormLogs(data);
      }
    } catch (e) {
      console.error('Error fetching form logs:', e);
    } finally {
      setIsFormLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  useEffect(() => {
    if (selectedDomain) {
      fetchLogs(selectedDomain);
      fetchFormLogs(selectedDomain);
    } else {
      setLogs([]);
      setFormLogs([]);
    }
  }, [selectedDomain]);

  const activeConfig = configs.find(c => c.domain === selectedDomain) || null;

  const getEmbedCode = () => {
    if (!selectedDomain) return '';
    const origin = API_BASE || window.location.origin;
    return `<!-- PrivacyTech CMP Cookie Consent (Ley 21.719) -->\n<script src="${origin}/embed/cmp.js" data-client-id="${selectedDomain}" async></script>`;
  };

  const getFormEmbedCode = () => {
    if (!selectedDomain) return '';
    const origin = API_BASE || window.location.origin;
    return `<!-- Registro de Consentimiento de Formulario (API) -->\n<script>\nfunction reportFormConsent(email, acceptedPrivacy, optInMarketing) {\n  fetch('${origin}/api/consent/form-collect', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      client_id: '${selectedDomain}',\n      user_identifier: email,\n      privacy_policy_accepted: acceptedPrivacy,\n      marketing_opt_in: optInMarketing,\n      form_id: 'formulario_contacto'\n    })\n  });\n}\n</script>`;
  };

  const handleCopyCode = () => {
    const code = getEmbedCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFormCode = () => {
    const code = getFormEmbedCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setFormCopied(true);
    setTimeout(() => setFormCopied(false), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !newCompanyName) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        company_name: newCompanyName,
        policy_version: 'v1.0.0',
        policy_content: {
          representative: 'Representante de Datos',
          representative_email: `privacidad@${newDomain}`,
          purposes: 'Finalidades del tratamiento declaradas en el portal.',
          retention_time: '24 meses.',
          exercise_channels: 'Formulario ARCO+ del sitio web.'
        },
        banner_title: 'Control de Cookies',
        banner_description: 'Este sitio utiliza cookies analíticas y comerciales para optimizar su experiencia según la Ley N° 21.719.'
      };

      const res = await authFetch(`${API_BASE}/api/config/${encodeURIComponent(newDomain)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewDomain('');
        setNewCompanyName('');
        await fetchConfigs();
      } else {
        alert('Error al registrar el nuevo dominio.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation for Cookie logs
  const totalLogs = logs.length;
  const analyticsOpts = logs.filter(l => l.preferences?.analytical || l.preferences?.analytics).length;
  const marketingOpts = logs.filter(l => l.preferences?.marketing).length;
  const analyticsPct = totalLogs > 0 ? Math.round((analyticsOpts / totalLogs) * 100) : 0;
  const marketingPct = totalLogs > 0 ? Math.round((marketingOpts / totalLogs) * 100) : 0;

  // Stats calculation for Form logs
  const totalFormLogs = formLogs.length;
  const formMarketingOpts = formLogs.filter(l => l.marketing_opt_in).length;
  const formMarketingPct = totalFormLogs > 0 ? Math.round((formMarketingOpts / totalFormLogs) * 100) : 0;

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-emerald-450" size={24} />
            Gestión de Consentimiento CMP B2B
          </h2>
          <p className="text-xs text-slate-400">
            Administre banners de cookies, configure integraciones de formularios y audite bitácoras de opt-in comercial conforme a la legislación vigente.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-650 hover:bg-emerald-505 text-white font-bold text-xs rounded-xl transition-all shadow-lg"
        >
          <Plus size={14} />
          <span>Añadir Dominio</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/20 border border-rose-900/35 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-rose-500 flex-shrink-0" size={20} />
          <p className="text-xs text-rose-350">{error}</p>
        </div>
      )}

      {/* Sub-tabs selectors */}
      <div className="flex border-b border-slate-800 gap-1.5">
        <button
          onClick={() => setActiveSubTab('cookies')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-t-2 ${activeSubTab === 'cookies' ? 'bg-slate-900/50 border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'}`}
        >
          <Cookie size={14} />
          <span>Configuración de Cookies</span>
        </button>
        <button
          onClick={() => setActiveSubTab('forms')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-t-2 ${activeSubTab === 'forms' ? 'bg-slate-900/50 border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'}`}
        >
          <UserCheck size={14} />
          <span>Auditoría de Formularios y Marketing</span>
        </button>
      </div>

      {/* Main CMP Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Configuration & Snippet (Common selection) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={13} className="text-emerald-450" />
              Selección de Cliente B2B
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 block">Dominio Activo</label>
              {isLoading ? (
                <div className="h-9 w-full bg-slate-950/40 rounded-lg animate-pulse border border-slate-800" />
              ) : configs.length === 0 ? (
                <p className="text-xs text-slate-500">No hay dominios registrados.</p>
              ) : (
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {configs.map((c) => (
                    <option key={c.domain} value={c.domain}>
                      {c.domain} ({c.company_name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeConfig && (
              <div className="space-y-3.5 pt-2 border-t border-slate-800/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Nombre del Cliente</span>
                  <span className="text-xs font-bold text-white block">{activeConfig.company_name}</span>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                    <Key size={10} className="text-amber-500" /> Clave API B2B (client_id)
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-2 rounded-lg border border-slate-850">
                    <code className="text-[10px] text-slate-355 select-all truncate flex-1 font-mono">
                      {activeConfig.api_key}
                    </code>
                  </div>
                </div>

                <div className="space-y-1 pt-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block">Versión de Política</span>
                  <span className="text-xs font-black text-emerald-450 block">{activeConfig.policy_version}</span>
                </div>
              </div>
            )}
          </div>

          {/* Snippet box - Swaps between tabs */}
          {activeConfig && activeSubTab === 'cookies' && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code size={13} className="text-indigo-400" />
                Código de Integración (Snippet)
              </h3>
              
              <p className="text-[11px] text-slate-455 leading-relaxed">
                Pegue la siguiente etiqueta <code className="font-mono text-indigo-400">&lt;script&gt;</code> en la cabecera del sitio de su cliente para desplegar el CMP y habilitar el bloqueo reactivo.
              </p>

              <div className="relative bg-slate-950 p-3 rounded-xl border border-slate-855">
                <pre className="text-[10px] text-indigo-300 font-mono whitespace-pre-wrap select-all text-left overflow-x-auto leading-relaxed">
                  {getEmbedCode()}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-all"
                  title="Copiar Código"
                >
                  {copied ? <Check size={12} className="text-emerald-450" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}

          {activeConfig && activeSubTab === 'forms' && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code size={13} className="text-indigo-400" />
                API de Formularios Externos
              </h3>
              
              <p className="text-[11px] text-slate-455 leading-relaxed">
                Envíe una petición <code className="font-mono text-indigo-400">POST</code> a nuestra API al procesar registros en su sitio web para certificar de forma legal la aceptación de políticas.
              </p>

              <div className="relative bg-slate-950 p-3 rounded-xl border border-slate-855">
                <pre className="text-[10px] text-indigo-300 font-mono whitespace-pre-wrap select-all text-left overflow-x-auto leading-relaxed">
                  {getFormEmbedCode()}
                </pre>
                <button
                  onClick={handleCopyFormCode}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-all"
                  title="Copiar Código"
                >
                  {formCopied ? <Check size={12} className="text-emerald-450" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live stats and Audit trail */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Swapped content by subtab */}
          {activeSubTab === 'cookies' ? (
            <>
              {/* Stats overview cards */}
              {activeConfig && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Registros Totales</span>
                    <span className="text-2xl font-black text-white block">{totalLogs}</span>
                    <span className="text-[10px] text-slate-400 block">últimos 100 eventos</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Opt-in Analítica</span>
                    <span className="text-2xl font-black text-emerald-450 block">{analyticsPct}%</span>
                    <span className="text-[10px] text-slate-400 block">{analyticsOpts} aceptados</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Opt-in Marketing</span>
                    <span className="text-2xl font-black text-indigo-400 block">{marketingPct}%</span>
                    <span className="text-[10px] text-slate-400 block">{marketingOpts} aceptados</span>
                  </div>
                </div>
              )}

              {/* Audit trail table */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck size={13} className="text-emerald-450" />
                    Bitácora de Consentimiento en Vivo
                  </h3>
                  <button 
                    onClick={() => selectedDomain && fetchLogs(selectedDomain)}
                    disabled={isLogsLoading}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-850"
                    title="Refrescar logs"
                  >
                    <RefreshCw size={12} className={isLogsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {isLogsLoading && logs.length === 0 ? (
                  <div className="space-y-3 py-6">
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/20 border border-dashed border-slate-855 rounded-xl space-y-2">
                    <Globe className="text-slate-600 mx-auto" size={24} />
                    <p className="text-xs font-bold text-slate-400">Sin consentimientos registrados aún</p>
                    <p className="text-[10px] text-slate-550 max-w-sm mx-auto leading-relaxed">
                      Instale el código de integración en el sitio web para capturar y auditar la trazabilidad de sus visitas en tiempo real.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-855 rounded-xl">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold">
                          <th className="p-3">Visitante (Token / IP)</th>
                          <th className="p-3">Preferencia Esenciales</th>
                          <th className="p-3">Preferencia Analítica</th>
                          <th className="p-3">Preferencia Marketing</th>
                          <th className="p-3">Política Versión</th>
                          <th className="p-3">Fecha y Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {logs.map((log) => {
                          const finalAnalytical = log.preferences?.analytical || log.preferences?.analytics || false;
                          const finalMarketing = log.preferences?.marketing || false;
                          return (
                            <tr key={log.id} className="hover:bg-slate-950/40 transition-colors">
                              <td className="p-3 font-mono">
                                <span className="text-white block font-bold" title={log.ip_hash}>{log.ip_hash.substring(0, 10)}...</span>
                                <span className="text-[9px] text-slate-500 block truncate max-w-[120px]">{log.consent_token}</span>
                              </td>
                              <td className="p-3">
                                <span className="bg-slate-950/80 text-emerald-450 border border-emerald-900/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Aceptada
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded ${finalAnalytical ? 'bg-slate-950/80 text-emerald-450 border-emerald-900/30' : 'bg-slate-950/20 text-rose-450 border-rose-950'}`}>
                                  {finalAnalytical ? 'Aceptada' : 'Rechazada'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded ${finalMarketing ? 'bg-slate-950/80 text-indigo-400 border-indigo-900/20' : 'bg-slate-950/20 text-rose-450 border-rose-950'}`}>
                                  {finalMarketing ? 'Aceptada' : 'Rechazada'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 font-bold">{log.policy_version}</td>
                              <td className="p-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Form Stats overview cards */}
              {activeConfig && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Registros de Formulario</span>
                    <span className="text-2xl font-black text-white block">{totalFormLogs}</span>
                    <span className="text-[10px] text-slate-400 block">últimos 100 envíos</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Aceptación Comercial</span>
                    <span className="text-2xl font-black text-emerald-450 block">{formMarketingPct}%</span>
                    <span className="text-[10px] text-slate-400 block">{formMarketingOpts} con Opt-in comercial</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Opt-out de Marketing</span>
                    <span className="text-2xl font-black text-rose-450 block">{totalFormLogs - formMarketingOpts}</span>
                    <span className="text-[10px] text-slate-400 block">rechazados comercialmente</span>
                  </div>
                </div>
              )}

              {/* Form consent audit trail table */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck size={13} className="text-emerald-450" />
                    Bitácora de Formularios y Aceptaciones de Políticas
                  </h3>
                  <button 
                    onClick={() => selectedDomain && fetchFormLogs(selectedDomain)}
                    disabled={isFormLogsLoading}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-850"
                    title="Refrescar logs de formulario"
                  >
                    <RefreshCw size={12} className={isFormLogsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {isFormLogsLoading && formLogs.length === 0 ? (
                  <div className="space-y-3 py-6">
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                    <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                  </div>
                ) : formLogs.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/20 border border-dashed border-slate-855 rounded-xl space-y-2">
                    <UserCheck className="text-slate-600 mx-auto" size={24} />
                    <p className="text-xs font-bold text-slate-400">Sin logs de formularios registrados aún</p>
                    <p className="text-[10px] text-slate-550 max-w-sm mx-auto leading-relaxed">
                      Conecte sus formularios web usando la API para certificar legalmente el opt-in comercial y aceptación de políticas en tiempo real.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-855 rounded-xl">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold">
                          <th className="p-3">Identificador del Usuario</th>
                          <th className="p-3">Formulario ID</th>
                          <th className="p-3">Polít. Privacidad</th>
                          <th className="p-3">Polít. Versión</th>
                          <th className="p-3">Opt-in Marketing</th>
                          <th className="p-3">IP (Anon) / Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {formLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="p-3 font-bold text-white font-mono truncate max-w-[150px]" title={log.user_identifier}>
                              {log.user_identifier}
                            </td>
                            <td className="p-3 text-slate-400 font-mono">{log.form_id}</td>
                            <td className="p-3">
                              <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded ${log.privacy_policy_accepted ? 'bg-slate-950/80 text-emerald-450 border-emerald-900/30' : 'bg-slate-950/20 text-rose-450 border-rose-955'}`}>
                                {log.privacy_policy_accepted ? 'Aceptado' : 'No aceptado'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-bold">{log.privacy_policy_version}</td>
                            <td className="p-3">
                              <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded ${log.marketing_opt_in ? 'bg-slate-950/80 text-emerald-450 border-emerald-900/30' : 'bg-slate-950/20 text-slate-500 border-slate-800'}`}>
                                {log.marketing_opt_in ? 'Opt-in' : 'Opt-out'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-mono">
                              <span className="block text-slate-500 text-[9px]">{log.ip_hash.substring(0, 10)}...</span>
                              <span className="block text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className="text-emerald-450" />
              <h3 className="text-base font-bold text-white">Añadir Nuevo Dominio CMP</h3>
            </div>
            
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-450 block">Dominio (ej: misitio.com)</label>
                <input
                  type="text"
                  required
                  placeholder="ejemplo.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.trim().toLowerCase())}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-505 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-450 block">Nombre de la Empresa o Portal</label>
                <input
                  type="text"
                  required
                  placeholder="Mi Sitio Corporativo SpA"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-505 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-4 py-2 bg-emerald-650 hover:bg-emerald-505 disabled:bg-slate-800 text-white disabled:text-slate-500 font-bold text-xs rounded-xl transition-all"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
