import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Server, 
  Lock, 
  Globe, 
  FileText, 
  Sliders, 
  Activity,
  Users,
  Search,
  RefreshCw
} from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function LandingPage() {
  const [scanUrl, setScanUrl] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const navigate = useNavigate();

  const handleFreeScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl.trim() || !emailInput.trim()) return;

    setIsScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/free-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: scanUrl, email: emailInput }),
      });

      const data = await response.json();

      if (response.ok) {
        setScanResult(data);
        // Smooth scroll to results
        setTimeout(() => {
          const el = document.getElementById('free-scan-results');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setScanError(data.error || 'Error al ejecutar el escaneo.');
      }
    } catch (err) {
      console.error(err);
      setScanError('Error de comunicación con el servidor de auditorías.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Shield size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              PrivacyTech
            </span>
            <span className="text-[10px] uppercase font-extrabold tracking-widest bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-800/50">
              Ley N° 21.719
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#riesgos" className="hover:text-indigo-400 transition-colors">Riesgos</a>
            <a href="#solucion" className="hover:text-indigo-400 transition-colors">Nuestra Solución</a>
            <a href="#metodologia" className="hover:text-indigo-400 transition-colors">Metodología</a>
            <a href="#planes" className="hover:text-indigo-400 transition-colors">Planes y Precios</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
            >
              Acceso Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        {/* Decorative background glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/50 border border-indigo-800/30 text-indigo-400 text-xs font-semibold mb-8 tracking-wide animate-pulse">
          🛡️ Solución Integral de Cumplimiento Normativo
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight md:leading-none text-white">
          Blindaje integral contra las sanciones de la nueva{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-300 bg-clip-text text-transparent">
            Ley N° 21.719
          </span>{' '}
          en Chile.
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Automatiza el cumplimiento web e interno en tiempo récord con nuestra plataforma SaaS y el acompañamiento de consultores legales y técnicos expertos.
        </p>

        {/* Lead Magnet Double-Input Form */}
        <div className="mt-10 max-w-2xl mx-auto">
          <form 
            onSubmit={handleFreeScanSubmit} 
            className="p-4 rounded-xl bg-slate-900 border border-slate-850 shadow-2xl flex flex-col gap-3 text-left"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Sitio Web de la Empresa</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  placeholder="ej. misitio.cl"
                  value={scanUrl}
                  onChange={e => setScanUrl(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Correo Electrónico Corporativo</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  placeholder="ej. dpo@misitio.cl"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isScanning}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 loader" />
                  <span>Ejecutando Auditoría Legal en Vivo...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Auditoría Técnica Gratuita</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {scanError && (
            <p className="mt-3 text-xs text-rose-400 font-semibold">{scanError}</p>
          )}
          <p className="mt-3 text-[11px] text-slate-500">
            * El escáner gratuito analiza cookies externas, scripts espías de terceros y formularios con opt-in ausentes.
          </p>
        </div>
      </section>

      {/* 2. Public Scan Results (Lead Magnet Gancho / Regwall) */}
      {scanResult && (
        <section id="free-scan-results" className="py-16 bg-slate-900/30 border-y border-slate-900 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-8">
              
              {/* Header result */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-slate-800">
                <div className="text-center md:text-left">
                  <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest block">Reporte Inicial Generado</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1">
                    Análisis de cookies y scripts para: <span className="text-indigo-400 font-mono text-xl">{scanResult.url}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-2">Evaluado en tiempo real conforme a las regulaciones de la Ley N° 21.719 en Chile.</p>
                </div>

                {/* score ring */}
                <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle className="stroke-slate-800" strokeWidth="8" fill="transparent" r="46" cx="56" cy="56" />
                    <circle 
                      className={scanResult.score >= 80 ? 'stroke-emerald-500' : scanResult.score >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'} 
                      strokeWidth="8" 
                      fill="transparent" 
                      r="46" 
                      cx="56" 
                      cy="56" 
                      strokeDasharray={289}
                      strokeDashoffset={289 - (289 * scanResult.score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <span className="text-2xl font-extrabold text-white block">{scanResult.score}%</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Score</span>
                  </div>
                </div>
              </div>

              {/* Findings grid */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Brechas y Vulnerabilidades Web Detectadas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scanResult.findings && scanResult.findings.map((f: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex gap-3 items-start">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        f.severity === 'Grave' || f.severity === 'Gravísima' ? 'bg-rose-950/60 text-rose-400' : 'bg-amber-950/60 text-amber-400'
                      }`}>
                        <AlertTriangle size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{f.description}</span>
                        <span className="text-[11px] text-slate-400 block mt-1">Recomendación: {f.recommendation}</span>
                      </div>
                    </div>
                  ))}
                  {(!scanResult.findings || scanResult.findings.length === 0) && (
                    <p className="text-slate-400 text-xs col-span-2 text-center py-4">No se detectaron brechas críticas externas de scripts o cookies.</p>
                  )}
                </div>
              </div>

              {/* Action plan priorizado - Regwall blurred! */}
              <div className="relative mt-8 pt-6 border-t border-slate-800">
                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Plan de Acción y Remedición Priorizado</h4>
                
                {/* Blurred Content */}
                <div className="space-y-3 blur-md opacity-25 select-none pointer-events-none">
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-white block">1. Implementar CMP y Banner de Consentimiento Seguro</span>
                      <span className="text-[11px] text-slate-400 block">Esfuerzo: 2 horas • Infracción Art. 14 quinquies</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-white block">2. Regularizar cláusulas DPA con proveedores SaaS</span>
                      <span className="text-[11px] text-slate-400 block">Esfuerzo: 1 día • Infracción Art. 15 bis</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-white block">3. Redactar políticas de privacidad automatizadas</span>
                      <span className="text-[11px] text-slate-400 block">Esfuerzo: 30 mins • Infracción Art. 14 ter</span>
                    </div>
                  </div>
                </div>

                {/* Overlaid Lock and CTA */}
                <div className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 bg-indigo-950 text-indigo-400 border border-indigo-900/50 rounded-full mb-4 shadow-xl">
                    <Lock size={24} className="animate-bounce" />
                  </div>
                  <h5 className="text-white font-extrabold text-base md:text-lg max-w-md leading-snug">
                    Desbloquea el plan de mitigación priorizado y las herramientas de remedición
                  </h5>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm mb-5">
                    Genera anexos DPA, cláusulas SCC, configura el CMP y obtén el score de cumplimiento legal al 100%.
                  </p>
                  <button
                    onClick={() => navigate(`/register?email=${encodeURIComponent(emailInput)}`)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 group"
                  >
                    <span>Crear cuenta gratis y ver plan de acción</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

            </div>
          </div>
        </section>
      )}

      {/* Risks Section (Urgency) */}
      <section id="riesgos" className="border-y border-slate-900 bg-slate-950/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-rose-500 font-bold text-xs uppercase tracking-widest">Peligros de Incumplimiento</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2">
              ¿Conoces los riesgos reales de incumplir la ley?
            </h2>
            <p className="text-slate-400 mt-4">
              La Agencia de Protección de Datos Personales de Chile aplicará estrictas auditorías y sanciones a partir de la entrada en vigor de la nueva normativa.
            </p>
          </div>

          <div className="grid md:grid-row-3 gap-6 max-w-4xl mx-auto">
            {/* Risk Item 1 */}
            <div className="flex gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-rose-900/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-rose-950/40 border border-rose-900/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Multas Millonarias</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Las sanciones monetarias alcanzan multas graves de hasta <strong className="text-rose-400">20.000 UTM</strong> o el equivalente al <strong className="text-rose-400">4% de los ingresos anuales globales</strong> del infractor.
                </p>
              </div>
            </div>

            {/* Risk Item 2 */}
            <div className="flex gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-rose-900/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-rose-950/40 border border-rose-900/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                <Server size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Suspensión del Tratamiento de Datos</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Riesgo inmediato de <strong className="text-rose-400">bloqueo de bases de datos operativas</strong>. La Agencia tiene la facultad de congelar tu base de clientes si no demuestras consentimientos lícitos.
                </p>
              </div>
            </div>

            {/* Risk Item 3 */}
            <div className="flex gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-rose-900/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-rose-950/40 border border-rose-900/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Pérdida Reputacional Irrecuperable</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  La publicación en el registro oficial de infractores acarrea desconfianza comercial inmediata, ahuyentando a clientes finales, socios y proveedores estratégicos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hybrid Solution Section */}
      <section id="solucion" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest">Nuestra Oferta de Valor</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2">
            La Única Solución Híbrida del Mercado
          </h2>
          <p className="text-slate-400 mt-4">
            Unificamos herramientas SaaS autogestionadas con el soporte legal permanente de expertos de privacidad.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card 1: SaaS Platform */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 hover:border-indigo-500/30 shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-xl bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center text-indigo-400 mb-6">
                <Sliders size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">1. Plataforma Tecnológica SaaS</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Herramientas operativas listas para inyectar en tu ecosistema digital.
              </p>
              <ul className="mt-6 space-y-3.5 text-slate-300 text-sm">
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Consent Manager (CMP):</strong> Almacenamiento auditable de cookies.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Bandeja ARCO+:</strong> Ejercicio de derechos integrado.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Regularización TID:</strong> Cláusulas SCC generadas.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Bitácora de Brechas:</strong> Oficios legales automatizados.</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-900">
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold block mb-1">Tecnología</span>
              <span className="text-indigo-400 text-xs font-semibold">Integración en minutos vía script async</span>
            </div>
          </div>

          {/* Card 2: Legal Acompañamiento */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 hover:border-indigo-500/30 shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-xl bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center text-indigo-400 mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">2. Consultoría Legal & Técnica</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Nuestros abogados y auditores asumen la gobernanza de tu cumplimiento.
              </p>
              <ul className="mt-6 space-y-3.5 text-slate-300 text-sm">
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>DPO Externo:</strong> Asignamos un Oficial de Privacidad.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Auditoría GAP:</strong> Evaluamos riesgos iniciales.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Redacción de Contratos:</strong> DPAs y acuerdos de terceros.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>Auditoría de Certificación:</strong> Sellos de adecuación final.</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-900">
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold block mb-1">Servicios</span>
              <span className="text-indigo-400 text-xs font-semibold">Consultores certificados con experiencia real</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Phase Methodology Section */}
      <section id="metodologia" className="py-20 border-y border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">El Proceso</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2">
              Metodología Híbrida de 5 Fases
            </h2>
            <p className="text-slate-400 mt-4">
              El camino estructurado y probado hacia la total adecuación normativa en tu organización.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto flex flex-col gap-12">
            {/* Timeline center line */}
            <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-slate-800 -z-10"></div>

            {[
              {
                fase: 'Fase 1',
                title: 'Diagnóstico GAP (Brechas)',
                desc: 'Auditoría inicial técnica de scripts y cookies en la web. Identificación de bases de datos internas, flujos de datos sensibles y sistemas no autorizados (Shadow IT).',
                icon: <Search size={18} />,
                align: 'right'
              },
              {
                fase: 'Fase 2',
                title: 'Diseño Legal y Contractual',
                desc: 'Redacción de las cláusulas de política de privacidad requeridas, redacción de DPAs y Cláusulas Contractuales Tipo (SCC) para proveedores extranjeros, y estructuración de autorizaciones.',
                icon: <FileText size={18} />,
                align: 'left'
              },
              {
                fase: 'Fase 3',
                title: 'Implementación Técnica y Automatización',
                desc: 'Inyección y personalización de los scripts del CMP en frontend. Despliegue del portal público de derechos ARCO+ con plazos configurados.',
                icon: <Sliders size={18} />,
                align: 'right'
              },
              {
                fase: 'Fase 4',
                title: 'Monitoreo Preventivo y DPO',
                desc: 'Auditorías automatizadas de red y SSL. Capacitaciones internas ante incidentes de ciberseguridad y habilitación de la bitácora legal ante brechas.',
                icon: <Activity size={18} />,
                align: 'left'
              },
              {
                fase: 'Fase 5',
                title: 'Certificación de Cierre',
                desc: 'Auditoría de validación final externa del programa de cumplimiento y entrega del informe anual de gobernanza ante el directorio.',
                icon: <CheckCircle size={18} />,
                align: 'right'
              }
            ].map((step, idx) => (
              <div key={idx} className="relative flex flex-col md:flex-row items-start md:justify-between w-full">
                {/* Timeline circle node */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 z-10">
                  {step.icon}
                </div>

                <div className="w-full md:w-[45%] pl-16 md:pl-0 md:text-right mt-1.5 order-last md:order-first">
                  {step.align === 'left' && (
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">{step.fase}</span>
                      <h3 className="text-lg font-bold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  )}
                </div>

                {/* Empty block for layout grid spacing */}
                <div className="hidden md:block w-[5%]" />

                <div className="w-full md:w-[45%] pl-16 md:pl-0 mt-1.5">
                  {step.align === 'right' && (
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">{step.fase}</span>
                      <h3 className="text-lg font-bold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Plan and CTA Footer Section */}
      <section id="planes" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            ¿Listo para blindar tu negocio hoy mismo?
          </h2>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">
            Nuestros planes se adaptan a empresas medianas y corporativas. Obtén la plataforma SaaS de manera inmediata o solicita una reunión de diagnóstico.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all"
            >
              Comenzar Auditoría SaaS
            </Link>
            <button 
              onClick={() => alert('Próximamente: Integración del agendador de llamadas Calendly')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 font-bold text-slate-300 hover:text-white transition-all"
            >
              Agendar Asesoría Legal
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
          <div>
            &copy; {new Date().getFullYear()} PrivacyTech. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <a href="#riesgos" className="hover:text-slate-400 transition-colors">Riesgos</a>
            <a href="#solucion" className="hover:text-slate-400 transition-colors">Solución</a>
            <a href="#metodologia" className="hover:text-slate-400 transition-colors">Metodología</a>
            <Link to="/dashboard" className="hover:text-indigo-400 transition-colors font-semibold">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
