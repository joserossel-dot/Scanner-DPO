import React, { useState } from 'react';
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
}

interface DiagnosisResultsViewProps {
  results: DiagnosisResults;
  onNavigateToRemediation: (subTab: 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub') => void;
  onReset: () => void;
}

export default function DiagnosisResultsView({ 
  results, 
  onNavigateToRemediation, 
  onReset 
}: DiagnosisResultsViewProps) {
  const { scoreTotal, riesgoUTM, findings } = results;
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const isRopaMissing = findings.some(f => f.id === 'FIND_ROPA_MISSING');
  const displayScore = isRopaMissing ? 30 : scoreTotal;

  // Determine severity border and text color for the score
  const getScoreColor = () => {
    if (isRopaMissing) return 'text-amber-500 stroke-amber-500 animate-pulse';
    if (scoreTotal >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (scoreTotal >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getScoreBgColorClass = () => {
    if (isRopaMissing) return 'bg-amber-950/20 border-amber-900/30';
    if (scoreTotal >= 80) return 'bg-emerald-950/20 border-emerald-900/30';
    if (scoreTotal >= 50) return 'bg-amber-950/20 border-amber-900/30';
    return 'bg-rose-950/20 border-rose-900/30';
  };

  // Phase classification helper
  const classifyFinding = (f: DiagnosisFinding): 1 | 2 | 3 => {
    const id = f.id;
    const cat = f.category?.toLowerCase() || '';
    const desc = f.description?.toLowerCase() || '';
    
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
    
    // Fase 2: Blindaje Documental: Política de Privacidad, Textos Informativos y Contratos DPA/SCC.
    if (
      id?.includes('POLICY') || 
      id?.includes('POLICIES') || 
      id?.includes('CONTRACT') || 
      id?.includes('TRANSFER') || 
      id?.includes('TID') || 
      id?.includes('DPA') || 
      id?.includes('SCC') || 
      id?.includes('VENDORS') || 
      cat.includes('polic') || 
      cat.includes('contract') || 
      cat.includes('transfer') || 
      cat.includes('proveedor') ||
      desc.includes('política') || 
      desc.includes('contrato') || 
      desc.includes('cláusula') ||
      desc.includes('scc') ||
      desc.includes('dpa')
    ) {
      return 2;
    }
    
    // Fase 3: Cambios Operativos y Procesos: Cifrado, Bases de Datos, Biometría, retención de CVs, y Shadow IT.
    return 3;
  };

  // Maps finding to corresponding remediation subtab
  const getSubTabForFinding = (f: DiagnosisFinding): 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub' => {
    const id = f.id;
    const cat = f.category?.toLowerCase() || '';
    const desc = f.description?.toLowerCase() || '';

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
    const id = f.id;
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

  const phase1Findings = findings.filter(f => classifyFinding(f) === 1);
  const phase2Findings = findings.filter(f => classifyFinding(f) === 2);
  const phase3Findings = findings.filter(f => classifyFinding(f) === 3);

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
                <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Sin hallazgos web o digitales pendientes.</p>
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
                        <span>Resolver ahora</span>
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
                <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Su blindaje documental y contratos están en regla.</p>
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
                        <span>Resolver ahora</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
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
                <p className="text-xs text-emerald-450 font-semibold py-2">🟢 Fase Completada: Sin brechas operativas o de TI identificadas.</p>
              ) : (
                phase3Findings.map((f, idx) => (
                  <div key={f.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                    <div className="space-y-1">
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
                          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-1">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">⚠️ Impacto en su forma de trabajar</span>
                            <p className="text-[11px] text-slate-350 leading-relaxed">{getBusinessImpact(f)}</p>
                          </div>

                          {/* Quick navigation to ROPA Hub if relevant */}
                          {(f.id === 'FIND_ROPA_MISSING' || f.id === 'FIND_ROPA_DRAFTS_PENDING') && (
                            <button
                              onClick={() => onNavigateToRemediation('ropa_hub')}
                              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-650/10 hover:bg-indigo-650 text-indigo-400 hover:text-white font-bold text-[10px] rounded border border-indigo-900/30 hover:border-indigo-600 transition-all w-fit"
                            >
                              <span>Ir al Panel de Inventario RoPA</span>
                              <ArrowRight size={10} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Detailed Infractions Appendix */}
      {findings.length > 0 && (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-lg space-y-4 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-500" />
            <h3 className="text-base font-bold text-white tracking-wide">Apéndice: Detalle de Infracciones y Multas Asociadas</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  <th className="py-3 px-2">Categoría</th>
                  <th className="py-3 px-2">Infracción</th>
                  <th className="py-3 px-2 text-center">Puntaje</th>
                  <th className="py-3 px-2 text-right">Riesgo Máx.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {findings.map((f, idx) => (
                  <tr key={idx} className="text-xs hover:bg-slate-950/20">
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold uppercase">
                        {f.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 space-y-1">
                      <span className="font-semibold text-white block">{f.description}</span>
                      
                      {f.isGated ? (
                        <span className="text-[11px] text-slate-500 italic">Contenido exclusivo del Plan Pro</span>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-400 block"><strong>Recomendación:</strong> {f.recommendation}</span>
                          {f.effort && (
                            <span className={`inline-block text-[9px] uppercase font-black px-2 py-0.5 rounded mt-1 border ${
                              f.effort === 'LOW'
                                ? 'bg-emerald-950/60 text-emerald-450 border-emerald-900/40'
                                : f.effort === 'MEDIUM'
                                  ? 'bg-amber-950/60 text-amber-500 border-amber-900/40'
                                  : 'bg-rose-950/60 text-rose-455 border-rose-900/40'
                            }`}>
                              Esfuerzo: {f.effort === 'LOW' ? 'Bajo' : f.effort === 'MEDIUM' ? 'Medio' : 'Alto'}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-center font-bold text-rose-500">-{f.penalty}</td>
                    <td className="py-3.5 px-2 text-right font-extrabold text-rose-400">{f.riskUtm.toLocaleString()} UTM</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      )}

    </div>
  );
}
