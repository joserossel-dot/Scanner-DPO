import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../lib/authFetch';
import { 
  Award, 
  BookOpen, 
  Check, 
  Copy, 
  Globe, 
  Plus, 
  RefreshCw, 
  Settings, 
  Share2, 
  ShieldCheck, 
  Users, 
  AlertTriangle 
} from 'lucide-react';

interface EmployeeTrainingDashboardProps {
  token: string | null;
}

interface SiteConfig {
  domain: string;
  company_name: string;
  policy_version: string;
  banner_title: string;
  banner_description: string;
  api_key: string;
}

interface EmployeeTrainingReport {
  id: number;
  client_id: string;
  employee_name: string;
  employee_email: string;
  completed_at: string;
  declaration_accepted: boolean;
  quiz_score: number;
  status: 'Pendiente' | 'Aprobado';
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

export default function EmployeeTrainingDashboard({ token }: EmployeeTrainingDashboardProps) {
  const [configs, setConfigs] = useState<SiteConfig[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [reports, setReports] = useState<EmployeeTrainingReport[]>([]);
  
  // Custom materials states
  const [presentationUrl, setPresentationUrl] = useState<string>('');
  const [policyText, setPolicyText] = useState<string>('');
  const [isSavingMaterials, setIsSavingMaterials] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('Error al consultar configuraciones de dominio.');
      }
    } catch (e) {
      console.error(e);
      setError('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reports
  const fetchReports = async (domain: string) => {
    if (!domain) return;
    setIsReportsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/training/reports?client_id=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setIsReportsLoading(false);
    }
  };

  // Fetch materials
  const fetchMaterials = async (domain: string) => {
    if (!domain) return;
    try {
      const res = await fetch(`${API_BASE}/api/training/materials/${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setPresentationUrl(data.presentation_url || '');
        setPolicyText(data.policy_text || '');
      }
    } catch (e) {
      console.error('Error fetching training materials:', e);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  useEffect(() => {
    if (selectedDomain) {
      fetchReports(selectedDomain);
      fetchMaterials(selectedDomain);
    } else {
      setReports([]);
      setPresentationUrl('');
      setPolicyText('');
    }
  }, [selectedDomain]);

  const activeConfig = configs.find(c => c.domain === selectedDomain) || null;

  const getTrainingLink = () => {
    if (!selectedDomain) return '';
    return `${window.location.origin}/train/${selectedDomain}`;
  };

  const handleCopyLink = () => {
    const link = getTrainingLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;

    setIsSavingMaterials(true);
    setSaveSuccess(false);
    try {
      const res = await authFetch(`${API_BASE}/api/training/materials/${encodeURIComponent(selectedDomain)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          presentation_url: presentationUrl,
          policy_text: policyText
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert('Error al guardar materiales de capacitación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSavingMaterials(false);
    }
  };

  // Metrics
  const totalEmployees = reports.length;
  const approvedCount = reports.filter(r => r.status === 'Aprobado').length;
  const passingRate = totalEmployees > 0 ? Math.round((approvedCount / totalEmployees) * 100) : 0;

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="text-emerald-450" size={24} />
            Módulo de Capacitación y Colaboradores B2B
          </h2>
          <p className="text-xs text-slate-400">
            Configure materiales explicativos, comparta el portal de certificación e inspeccione el registro legal de sus empleados capacitados.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/20 border border-rose-900/35 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-rose-500 flex-shrink-0" size={20} />
          <p className="text-xs text-rose-350">{error}</p>
        </div>
      )}

      {/* Main Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Setup & Shared Link */}
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
          </div>

          {/* Invitation Snippet */}
          {activeConfig && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 size={13} className="text-indigo-400" />
                Enlace Único de Invitación
              </h3>
              
              <p className="text-[11px] text-slate-455 leading-relaxed">
                Comparta esta URL con sus empleados para que accedan al curso interactivo y rindan la prueba de capacitación.
              </p>

              <div className="relative bg-slate-955 p-3 rounded-xl border border-slate-855 flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={getTrainingLink()} 
                  className="bg-transparent text-[10px] text-indigo-300 font-mono select-all text-left flex-1 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-white rounded border border-slate-800 transition-all flex-shrink-0"
                  title="Copiar Enlace"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-450" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}

          {/* Configure Training Materials */}
          {activeConfig && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={13} className="text-amber-500" />
                Personalizar Materiales
              </h3>
              
              <form onSubmit={handleSaveMaterials} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 block">URL Diapositivas Explicativas</label>
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/presentation/..."
                    value={presentationUrl}
                    onChange={(e) => setPresentationUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 block">Directrices Escritas de Privacidad</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Directrices a seguir..."
                    value={policyText}
                    onChange={(e) => setPolicyText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingMaterials}
                  className="w-full flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-850 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {isSavingMaterials ? 'Guardando...' : saveSuccess ? '✓ Cambios Guardados' : 'Guardar Materiales'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Metrics and Employees reports */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats overview cards */}
          {activeConfig && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Capacitados</span>
                <span className="text-2xl font-black text-white block">{totalEmployees}</span>
                <span className="text-[10px] text-slate-400 block">empleados registrados</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Avance Aprobados</span>
                <span className="text-2xl font-black text-emerald-450 block">{passingRate}%</span>
                <span className="text-[10px] text-slate-400 block">{approvedCount} aprobados</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Estado de Cumplimiento</span>
                <span className={`text-2xl font-black block ${passingRate >= 80 ? 'text-emerald-450' : 'text-amber-500'}`}>
                  {passingRate >= 80 ? 'Excelente' : 'Pendiente'}
                </span>
                <span className="text-[10px] text-slate-400 block">80% meta corporativa</span>
              </div>
            </div>
          )}

          {/* Audit trail table */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-450" />
                Bitácora de Colaboradores Capacitados
              </h3>
              <button 
                onClick={() => selectedDomain && fetchReports(selectedDomain)}
                disabled={isReportsLoading}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-850"
                title="Refrescar reportes"
              >
                <RefreshCw size={12} className={isReportsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {isReportsLoading && reports.length === 0 ? (
              <div className="space-y-3 py-6">
                <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
                <div className="h-6 bg-slate-950/40 rounded-lg animate-pulse" />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center bg-slate-950/20 border border-dashed border-slate-855 rounded-xl space-y-2">
                <Users className="text-slate-600 mx-auto" size={24} />
                <p className="text-xs font-bold text-slate-400">Sin colaboradores registrados aún</p>
                <p className="text-[10px] text-slate-550 max-w-sm mx-auto leading-relaxed">
                  Comparta el enlace de invitación para que sus colaboradores comiencen a rendir el cuestionario legal interactivo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-855 rounded-xl">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold">
                      <th className="p-3">Nombre Colaborador</th>
                      <th className="p-3">Correo Electrónico</th>
                      <th className="p-3">Declaración Jurada</th>
                      <th className="p-3">Test (Nota)</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Fecha de Capacitación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-350">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="p-3 font-bold text-white">{report.employee_name}</td>
                        <td className="p-3 font-mono text-slate-400">{report.employee_email}</td>
                        <td className="p-3">
                          <span className={`bg-slate-950/80 text-emerald-450 border border-emerald-900/30 text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                            Aceptada
                          </span>
                        </td>
                        <td className="p-3 text-slate-450 font-bold font-mono">
                          {report.quiz_score} / 5
                        </td>
                        <td className="p-3">
                          <span className={`border text-[9px] font-bold px-1.5 py-0.5 rounded ${report.status === 'Aprobado' ? 'bg-slate-950/80 text-emerald-450 border-emerald-900/30' : 'bg-slate-950/20 text-amber-500 border-amber-950'}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(report.completed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
