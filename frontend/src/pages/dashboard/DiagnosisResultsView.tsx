import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';
import { complianceTrafficLight } from '../../lib/complianceTrafficLight';
import { 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Shield,
  ExternalLink
} from 'lucide-react';

export interface ActionStep {
  step: number;
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  estimatedEffort: string;
  details: string;
}

export interface DiagnosisFinding {
  id: string;
  category: string;
  severity: 'Leve' | 'Grave' | 'Gravísima';
  description: string;
  recommendation: string;
  penalty: number;
  riskUtm: number;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  isGated?: boolean;
}

export interface DiagnosisResults {
  scoreTotal: number;
  riesgoUTM: number;
  findings: DiagnosisFinding[];
  actionPlan: ActionStep[];
  globalScore?: number;
}

interface DiagnosisResultsViewProps {
  results: DiagnosisResults;
  onNavigateToRemediation: (subTab: 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub') => void;
  onReset: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  token?: string | null;
}

export default function DiagnosisResultsView({ 
  results, 
  onNavigateToRemediation, 
  onReset,
  isLoading = false,
  hasError = false,
  token = null
}: DiagnosisResultsViewProps) {
  const isFetchingDiagnosis = false;
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const [meetingAlertText, setMeetingAlertText] = useState<string | null>(null);
  const [isRequestingHelp, setIsRequestingHelp] = useState<string | null>(null);
  const [helpSuccessMsg, setHelpSuccessMsg] = useState<string | null>(null);

  const handleScheduleMeeting = (f: DiagnosisFinding) => {
    const subject = encodeURIComponent(`[Scanner DPO] Brecha pendiente: ${f.description}`);
    const body = encodeURIComponent(
      `Se detectó la siguiente brecha de cumplimiento (Ley 21.719):\n\n` +
      `Hallazgo: ${f.description}\n` +
      `Severidad: ${f.severity}\n` +
      `Recomendación: ${f.recommendation}\n\n` +
      `Por favor coordinar la corrección con el equipo de TI/Operaciones.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleRequestImplementationHelp = async (f: DiagnosisFinding) => {
    setIsRequestingHelp(f.id);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api/remediation/request-help`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          findingId: f.id,
          description: f.description,
          effort: f.effort
        })
      });
      if (res.ok) {
        setHelpSuccessMsg('Solicitud enviada — nuestro equipo la revisará en las próximas 24-48 horas');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al enviar la solicitud de ayuda.');
      }
    } catch (err) {
      console.error('Error requesting implementation help:', err);
      alert('Error de conexión al enviar la solicitud.');
    } finally {
      setIsRequestingHelp(null);
    }
  };

  // 2. ESTADOS DE CARGA (Loading Fallback)
  if (isLoading || !results || !results.findings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl max-w-xl mx-auto space-y-4 my-8 shadow-xl">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h4 className="text-sm font-bold text-white">Calculando su diagnóstico legal...</h4>
        <p className="text-xs text-slate-400">Procesando respuestas y cruzando datos de la auditoría web en tiempo real.</p>
      </div>
    );
  }

  try {
    const findings = results.findings || [];
    const scoreTotal = results.scoreTotal !== undefined ? results.scoreTotal : (results.globalScore !== undefined ? results.globalScore : 0);
    const riesgoUTM = results.riesgoUTM !== undefined ? results.riesgoUTM : (findings?.reduce((max, f) => Math.max(max, f.riskUtm || 0), 0) || 20000);

    const isRopaMissing = findings?.some(f => f?.id === 'FIND_ROPA_MISSING' || f?.id === 'FIND_ROPA_DRAFTS_PENDING') || false;
    const displayScore = isRopaMissing ? 30 : scoreTotal;

    // Determine severity border and text color for the score
    const getScoreColor = () => {
      if (isRopaMissing) return 'text-amber-500 stroke-amber-500 animate-pulse';
      const light = complianceTrafficLight(displayScore);
      if (light === 'green') return 'text-emerald-500 stroke-emerald-500';
      if (light === 'red') return 'text-rose-500 stroke-rose-500';
      return 'text-amber-500 stroke-amber-500';
    };

    const getScoreBgColorClass = () => {
      if (isRopaMissing) return 'bg-amber-950/20 border-amber-900/30';
      const light = complianceTrafficLight(displayScore);
      if (light === 'green') return 'bg-emerald-950/20 border-emerald-900/30';
      if (light === 'red') return 'bg-rose-950/20 border-rose-900/30';
      return 'bg-amber-950/20 border-amber-900/30';
    };

    // Phase classification helper
    const classifyFinding = (f: DiagnosisFinding): 1 | 2 | 3 => {
      const id = f?.id || '';
      const cat = f?.category?.toLowerCase() || '';
      const desc = f?.description?.toLowerCase() || '';
      
      // Fase 1: Cambios Digitales y Web: Cookies, Trackers, Formularios web y Canal ARCO+.
      if (
        id?.includes('COOKIES') || 
        id?.includes('TRACKER') || 
        id?.includes('FORM') || 
        id?.includes('ARCO') || 
        cat.includes('cookie') || 
        cat.includes('tracker') || 
        cat.includes('form') || 
        cat.includes('arco') ||
        desc.includes('cookie') || 
        desc.includes('tracker') || 
        desc.includes('formulario') || 
        desc.includes('arco')
      ) {
        return 1;
      }
      
      // Fase 2: Blindaje Documental: Política de Privacidad, Textos Informativos.
      if (
        id?.includes('POLICY') || 
        id?.includes('POLICIES') || 
        cat.includes('polic') || 
        desc.includes('política')
      ) {
        return 2;
      }
      
      // Fase 3: Cambios Operativos y Procesos: Cifrado, Bases de Datos, Biometría, retención de CVs, y Shadow IT.
      return 3;
    };

    // Maps finding to corresponding remediation subtab
    const getSubTabForFinding = (f: DiagnosisFinding): 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub' => {
      const id = f?.id || '';
      const cat = f?.category?.toLowerCase() || '';
      const desc = f?.description?.toLowerCase() || '';

      if (id === 'FIND_ROPA_MISSING' || id === 'FIND_ROPA_DRAFTS_PENDING') {
        return 'ropa_hub';
      }
      if (id?.includes('ARCO') || cat.includes('arco') || desc.includes('arco')) {
        return 'arco';
      }
      if (id?.includes('COOKIES') || cat.includes('cookie') || desc.includes('cookie') || desc.includes('tracker')) {
        return 'cmp';
      }
      if (id?.includes('POLICY') || cat.includes('polic') || desc.includes('política')) {
        return 'policies';
      }
      if (
        id?.includes('CONTRACT') || 
        id?.includes('TRANSFER') || 
        id?.includes('TID') || 
        cat.includes('transfer') || 
        cat.includes('proveedor') || 
        desc.includes('dpa') || 
        desc.includes('scc')
      ) {
        return 'transfers';
      }
      return 'cmp';
    };

    // Business impact descriptions for Phase 3 findings
    const getBusinessImpact = (f: DiagnosisFinding): string => {
      const id = f?.id || '';
      if (id === 'FIND_TI_ENCRYPTION' || id === 'FIND_SENSITIVE_UNSECURE') {
        return "Tendrá que modificar sus procesos de almacenamiento. Su equipo no puede seguir guardando bases de datos o información médica sin cifrar en reposo.";
      }
      if (id === 'FIND_BIOMETRICS_UNCONSENTED') {
        return "Tendrá que modificar sus procesos de control de accesos. Su equipo no puede registrar la huella o rostro de los trabajadores sin firma y registro formal de consentimientos.";
      }
      if (id === 'FIND_DEBT_RETENTION') {
        return "Tendrá que modificar sus políticas comerciales. Su organización no puede retener deudas prescriptas ni currículums de candidatos sin plazos regulados de destrucción.";
      }
      if (id === 'FIND_SHADOW_IT_NO_DPA') {
        return "Tendrá que regular el uso de herramientas SaaS. Su equipo no puede habilitar plataformas en la nube de forma desregulada sin firmar contratos DPA corporativos.";
      }
      if (id === 'FIND_ROPA_MISSING' || id === 'FIND_ROPA_DRAFTS_PENDING') {
        return "Tendrá que implementar un inventario formal. Es indispensable registrar y confirmar todas las actividades de tratamiento de datos personales de la empresa.";
      }
      return "Tendrá que modificar sus procesos internos. Su organización debe regularizar y documentar el tratamiento de datos para evitar sanciones.";
    };

    const phase1Findings = findings?.filter(f => classifyFinding(f) === 1) || [];
    const phase2Findings = findings?.filter(f => classifyFinding(f) === 2) || [];
    const phase3Findings = findings?.filter(f => classifyFinding(f) === 3) || [];

    const togglePhase = (phaseNum: number) => {
      setExpandedPhase(expandedPhase === phaseNum ? null : phaseNum);
    };

    const handleTriggerPaywallAlert = () => {
      alert("Esta funcionalidad requiere actualizar al Plan Pro de Scanner DPO. Póngase en contacto con ventas para activar su cuenta.");
    };

    return (
    <div className="w-full space-y-6">
      
      {/* 1. Hero Card: Global Score & Risk callout */}
      <div className={`p-6 md:p-8 rounded-xl border ${getScoreBgColorClass()} grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xl`}>
        
        {/* Score Ring column */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            {isRopaMissing ? "Progreso de Evaluación" : "Nivel de Cumplimiento"}
          </span>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Donut Circle */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle 
                className="stroke-slate-800" 
                strokeWidth="10" 
                fill="transparent" 
                r="60" 
                cx="72" 
                cy="72" 
              />
              <circle 
                className={getScoreColor()}
                strokeWidth="10" 
                strokeDasharray="377" 
                strokeDashoffset={377 - (377 * displayScore) / 100} 
                strokeLinecap="round" 
                fill="transparent" 
                r="60" 
                cx="72" 
                cy="72" 
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-3xl font-black text-white">{displayScore}%</span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mt-0.5">Diagnóstico</span>
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="md:col-span-8 space-y-4 text-left">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Resultados de Evaluación Normativa</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Su score de cumplimiento se calcula cruzando las auditorías técnicas web y la gobernanza declarada en base a la Ley N° 21.719 de Chile.
            </p>
          </div>

          {isRopaMissing ? (
            <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-lg flex items-start gap-4 shadow-md">
              <div className="w-10 h-10 rounded-full bg-amber-950/50 border border-amber-900/30 flex items-center justify-center text-amber-500 flex-shrink-0 animate-pulse mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">Inventario Incompleto</span>
                <span className="text-xs font-bold text-slate-200 block leading-relaxed">
                  Plan de Acción Bloqueado. Debe confirmar su Inventario de Datos (RoPA) en el paso anterior para generar sus acciones correctivas.
                </span>
                <button 
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all shadow-md mt-1"
                >
                  <RotateCcw size={12} />
                  <span>Volver al Inventario RoPA</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-lg flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-900/30 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Exposición Financiera Estimada</span>
                  <span className="text-base font-extrabold text-white">{riesgoUTM.toLocaleString()} UTM</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    (Aprox. ${(riesgoUTM * 65000).toLocaleString('es-CL')} CLP en multas potenciales de la Agencia DPA)
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 font-semibold text-xs rounded-lg border border-slate-800 transition-all"
                >
                  <RotateCcw size={12} />
                  <span>Volver a Evaluar Cuestionario</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. ROADMAP POR FASES (Con Acordeones) */}
      {!isRopaMissing && (
        <>
          <div className="space-y-4 text-left">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
          <h3 className="text-base font-bold text-white tracking-wide">Plan de Acción Estratégico (Fases de Implementación)</h3>
        </div>

        {/* FASE 1: Cambios Digitales y Web */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <button
            onClick={() => togglePhase(1)}
            className="w-full flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 transition-all border-b border-slate-850"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-950 text-rose-400 border border-rose-900 flex items-center justify-center font-bold text-xs">1</span>
              <div>
                <h4 className="text-sm font-bold text-white">Fase 1: Cambios Digitales y Web</h4>
                <p className="text-[10px] text-rose-400/90 font-medium">Prioridad Alta • Cookies, Formularios y Canal ARCO+</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-rose-950/40 text-rose-400 border border-rose-900/20 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                {phase1Findings.length} brechas
              </span>
              {expandedPhase === 1 ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </button>

          {expandedPhase === 1 && (
            <div className="p-5 space-y-4 bg-slate-950/20 divide-y divide-slate-850/40">
              {phase1Findings.length === 0 ? (
                hasError ? (
                  <div className="flex items-center space-x-2 bg-rose-950/20 border border-rose-900/30 p-2 rounded">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span className="text-xs text-rose-400 font-semibold">⚠️ Error al cargar los hallazgos de la fase 1.</span>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Sin hallazgos web o digitales pendientes.</p>
                )
              ) : (
                phase1Findings.map((f, idx) => (
                  <div key={f.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex flex-col md:flex-row gap-4 justify-between items-start md:items-center`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{f.description}</span>
                        <span className="bg-rose-950/30 text-rose-400 border border-rose-900/10 text-[9px] font-black px-1.5 rounded">-{f.penalty} pts</span>
                      </div>
                      
                      {f.isGated ? (
                        <div className="relative mt-1">
                          <p className="text-xs text-slate-400 blur-sm select-none opacity-40">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin sed diam ut diam sodales scelerisque. Curabitur vel leo id urna convallis convallis.
                          </p>
                          <button
                            onClick={handleTriggerPaywallAlert}
                            className="absolute inset-0 flex items-center justify-center m-auto bg-slate-950/60 hover:bg-slate-950/80 border border-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all w-fit shadow-lg gap-1.5"
                          >
                            <span>🔒 Desbloquear Plan de Acción detallado</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">{f.recommendation}</p>
                      )}
                    </div>

                    {!f.isGated && (
                      <button
                        onClick={() => onNavigateToRemediation(getSubTabForFinding(f))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex-shrink-0"
                      >
                        <span>Ir a solucionar</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* FASE 2: Blindaje Documental */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <button
            onClick={() => togglePhase(2)}
            className="w-full flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 transition-all border-b border-slate-850"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-950 text-amber-400 border border-amber-900 flex items-center justify-center font-bold text-xs">2</span>
              <div>
                <h4 className="text-sm font-bold text-white">Fase 2: Blindaje Documental</h4>
                <p className="text-[10px] text-amber-400/90 font-medium">Prioridad Media • Políticas, Avisos y Contratos DPA/SCC</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-amber-950/40 text-amber-400 border border-amber-900/20 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                {phase2Findings.length} brechas
              </span>
              {expandedPhase === 2 ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </button>

          {expandedPhase === 2 && (
            <div className="p-5 space-y-4 bg-slate-950/20 divide-y divide-slate-850/40">
              {phase2Findings.length === 0 ? (
                hasError ? (
                  <div className="flex items-center space-x-2 bg-rose-950/20 border border-rose-900/30 p-2 rounded">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span className="text-xs text-rose-400 font-semibold">⚠️ Error al cargar los hallazgos de la fase 2.</span>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Su blindaje documental y contratos están en regla.</p>
                )
              ) : (
                phase2Findings.map((f, idx) => (
                  <div key={f.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex flex-col md:flex-row gap-4 justify-between items-start md:items-center`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{f.description}</span>
                        <span className="bg-amber-950/30 text-amber-400 border border-amber-900/10 text-[9px] font-black px-1.5 rounded">-{f.penalty} pts</span>
                      </div>

                      {f.isGated ? (
                        <div className="relative mt-1">
                          <p className="text-xs text-slate-400 blur-sm select-none opacity-40">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin sed diam ut diam sodales scelerisque. Curabitur vel leo id urna convallis convallis.
                          </p>
                          <button
                            onClick={handleTriggerPaywallAlert}
                            className="absolute inset-0 flex items-center justify-center m-auto bg-slate-950/60 hover:bg-slate-950/80 border border-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all w-fit shadow-lg gap-1.5"
                          >
                            <span>🔒 Desbloquear Plan de Acción detallado</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">{f.recommendation}</p>
                      )}
                    </div>

                    {!f.isGated && (
                      <button
                        onClick={() => onNavigateToRemediation(getSubTabForFinding(f))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex-shrink-0"
                      >
                        <span>Ir a solucionar</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Permanent access to Privacy Policy Generator */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white block">Herramienta: Generador de Políticas de Privacidad (Art. 14 ter)</span>
                  <span className="text-[10px] text-slate-400 block text-left">Redacte, personalice e instale las cláusulas de privacidad de su sitio web de forma automatizada.</span>
                </div>
                <button
                  onClick={() => onNavigateToRemediation('policies')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex-shrink-0"
                >
                  <span>Generar e Instalar Política</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FASE 3: Cambios Operativos y Procesos */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <button
            onClick={() => togglePhase(3)}
            className="w-full flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 transition-all border-b border-slate-850"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-850 text-indigo-400 border border-indigo-900 flex items-center justify-center font-bold text-xs">3</span>
              <div>
                <h4 className="text-sm font-bold text-white">Fase 3: Cambios Operativos y Procesos</h4>
                <p className="text-[10px] text-indigo-400/90 font-medium">Prioridad Estratégica • Cifrado, Biometría, Retención e IT</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/20 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                {phase3Findings.length} brechas
              </span>
              {expandedPhase === 3 ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </button>

          {expandedPhase === 3 && (
            <div className="p-5 space-y-5 bg-slate-950/20 divide-y divide-slate-850/40">
              {phase3Findings.length === 0 ? (
                hasError ? (
                  <div className="flex items-center space-x-2 bg-rose-950/20 border border-rose-900/30 p-2 rounded">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span className="text-xs text-rose-400 font-semibold">⚠️ Error al cargar los hallazgos de la fase 3.</span>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Sin brechas operativas o de TI identificadas.</p>
                )
              ) : (
                phase3Findings.map((f, idx) => (
                  <div key={f.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex flex-col md:flex-row gap-4 justify-between items-start md:items-center`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{f.description}</span>
                        <span className="bg-indigo-950/30 text-indigo-400 border border-indigo-900/10 text-[9px] font-black px-1.5 rounded">-{f.penalty} pts</span>
                      </div>

                      {f.isGated ? (
                        <div className="relative mt-1">
                          <div className="blur-sm select-none opacity-40 space-y-2">
                            <p className="text-xs text-slate-400">
                              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin sed diam ut diam sodales scelerisque. Curabitur vel leo id urna convallis convallis.
                            </p>
                            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-1">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">⚠️ Impacto en su forma de trabajar</span>
                              <p className="text-[11px] text-slate-350 leading-relaxed">Lorem ipsum dolor sit amet...</p>
                            </div>
                          </div>
                          <button
                            onClick={handleTriggerPaywallAlert}
                            className="absolute inset-0 flex items-center justify-center m-auto bg-slate-950/60 hover:bg-slate-950/80 border border-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all w-fit shadow-lg gap-1.5"
                          >
                            <span>🔒 Desbloquear Plan de Acción detallado</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">{f.recommendation}</p>
                          
                          {/* Business Impact block */}
                          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-1 mt-2">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">⚠️ Impacto en su forma de trabajar</span>
                            <p className="text-[11px] text-slate-350 leading-relaxed">{getBusinessImpact(f)}</p>
                          </div>

                          {/* Quick navigation to ROPA Hub if relevant */}
                          {(f.id === 'FIND_ROPA_MISSING' || f.id === 'FIND_ROPA_DRAFTS_PENDING') && (
                            <button
                              onClick={() => onNavigateToRemediation('ropa_hub')}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-indigo-650/10 hover:bg-indigo-650 text-indigo-400 hover:text-white font-bold text-[10px] rounded border border-indigo-900/30 hover:border-indigo-600 transition-all w-fit"
                            >
                              <span>Ir al Panel de Inventario RoPA</span>
                              <ArrowRight size={10} />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {!f.isGated && (
                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleScheduleMeeting(f)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold text-xs rounded-lg transition-all border border-slate-750"
                        >
                          <span>Agendar reunión interna</span>
                          <ArrowRight size={12} />
                        </button>
                        
                        {(f.effort === 'MEDIUM' || f.effort === 'HIGH') && (
                          <button
                            onClick={() => handleRequestImplementationHelp(f)}
                            disabled={isRequestingHelp === f.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-850 text-white disabled:text-slate-500 font-bold text-xs rounded-lg transition-all"
                          >
                            {isRequestingHelp === f.id ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                <span>Solicitar ayuda de implementación</span>
                                <ArrowRight size={12} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Meeting modal */}
      {meetingAlertText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center text-indigo-400">
                <Sparkles size={20} />
              </div>
              <h4 className="text-base font-bold text-white">Reunión Operativa Agendada</h4>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed">
              {meetingAlertText}
            </p>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setMeetingAlertText(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Success modal (P0-A) */}
      {helpSuccessMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-900/40 flex items-center justify-center text-emerald-450">
                <CheckCircle size={20} />
              </div>
              <h4 className="text-base font-bold text-white">Solicitud Recibida</h4>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed">
              {helpSuccessMsg}
            </p>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setHelpSuccessMsg(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  } catch (err) {
    console.error("Error rendering DiagnosisResultsView:", err);
    return (
      <div className="p-8 text-center max-w-xl mx-auto my-8 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-4 shadow-2xl">
        <div className="w-12 h-12 bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h4 className="text-base font-bold text-white">Ocurrió un error al cargar el plan de acción</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Los datos del diagnóstico no pudieron ser procesados correctamente. Por favor, intente recargar la página o volver a evaluar el cuestionario.
        </p>
        <button 
          onClick={onReset}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-all"
        >
          Volver a Evaluar Cuestionario
        </button>
      </div>
    );
  }
}
