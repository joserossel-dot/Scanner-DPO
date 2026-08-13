import React from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight, 
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles
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
  const { scoreTotal, riesgoUTM, findings, actionPlan } = results;

  // Determine severity border and text color for the score
  const getScoreColor = () => {
    if (scoreTotal >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (scoreTotal >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getScoreBgColorClass = () => {
    if (scoreTotal >= 80) return 'bg-emerald-950/20 border-emerald-900/30';
    if (scoreTotal >= 50) return 'bg-amber-950/20 border-amber-900/30';
    return 'bg-rose-950/20 border-rose-900/30';
  };

  // Maps action plan title to corresponding remediation subtab
  const getRemediationSubtab = (title: string, findingId?: string): 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub' => {
    if (findingId === 'FIND_ROPA_MISSING' || findingId === 'FIND_ROPA_DRAFTS_PENDING') {
      return 'ropa_hub';
    }
    if (findingId === 'FIND_POLICIES_MISSING') {
      return 'policies';
    }
    if (findingId === 'FIND_TRANSFERS_UNAUTHORIZED') {
      return 'transfers';
    }
    if (findingId === 'FIND_ARCO_MISSING') {
      return 'arco';
    }
    
    // Fallback structured matching
    const t = title.toLowerCase();
    if (t.includes('ropa') || t.includes('inventario')) {
      return 'ropa_hub';
    }
    if (t.includes('dpa') || t.includes('scc') || t.includes('cláusulas') || t.includes('proveedor')) {
      return 'transfers';
    }
    if (t.includes('asistencia') || t.includes('biomet') || t.includes('arco') || t.includes('canal')) {
      return 'arco';
    }
    if (t.includes('polít') || t.includes('aviso')) {
      return 'policies';
    }
    return 'cmp';
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 1. Hero Card: Global Score & Risk callout */}
      <div className={`p-6 md:p-8 rounded-xl border ${getScoreBgColorClass()} grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xl`}>
        
        {/* Score Ring column */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Nivel de Cumplimiento</span>
          
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
                fill="transparent" 
                r="60" 
                cx="72" 
                cy="72" 
                strokeDasharray={377}
                strokeDashoffset={377 - (377 * scoreTotal) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out-in' }}
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-3xl font-extrabold text-white block">{scoreTotal}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Cumplido</span>
            </div>
          </div>
        </div>

        {/* Legal Risk Callout Column */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-950 text-rose-500 rounded-lg border border-rose-900/30 flex-shrink-0 mt-1">
              <ShieldAlert size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-500">Alerta de Sanciones Máximas</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mt-1">
                Riesgo Legal Estimado: Hasta <span className="text-rose-500">{riesgoUTM.toLocaleString()} UTM</span>
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Según el Art. 34 de la Ley N° 21.719 de Chile, las infracciones identificadas conllevan multas graves/gravísimas y la posible suspensión del tratamiento de bases de datos por parte de la Agencia.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-850 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Diagnóstico de Brechas Operacionales</span>
              <span className="text-[11px] text-slate-400">Total infracciones graves o superiores detectadas: {findings.length}</span>
            </div>
            <button 
              onClick={onReset}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-800 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw size={13} />
              <span>Reevaluar</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. Plan de Acción (Roadmap) */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-lg space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-wide">Roadmap Priorizado de Mitigación</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tareas de regularización técnica y legal ordenadas por nivel de riesgo normativo para blindar la organización.
          </p>
        </div>

        <div className="space-y-4">
          {actionPlan.length > 0 ? (
            actionPlan.map((step) => {
              const finding = findings.find(f => {
                if (f.id === 'FIND_ROPA_MISSING' && step.title.toLowerCase().includes('ropa')) return true;
                if (f.id === 'FIND_ROPA_DRAFTS_PENDING' && step.title.toLowerCase().includes('borradores')) return true;
                if (f.id === 'FIND_POLICIES_MISSING' && step.title.toLowerCase().includes('política')) return true;
                if (f.id === 'FIND_TRANSFERS_UNAUTHORIZED' && step.title.toLowerCase().includes('contratos')) return true;
                if (f.id === 'FIND_ARCO_MISSING' && step.title.toLowerCase().includes('arco')) return true;
                return false;
              });
              const subTab = getRemediationSubtab(step.title, finding?.id);
              return (
                <div 
                  key={step.step} 
                  className="p-5 bg-slate-950/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                >
                  <div className="flex gap-4">
                    {/* Index circle */}
                    <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900/50 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-bold text-sm text-white">{step.title}</h4>
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          step.priority === 'Alta' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' : 
                          step.priority === 'Media' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' : 
                          'bg-emerald-950 text-emerald-400 border border-emerald-900/30'
                        }`}>
                          Prioridad {step.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{step.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                        <span><strong>Esfuerzo:</strong> {step.estimatedEffort}</span>
                        <span>•</span>
                        <span><strong>Acción Técnica:</strong> {step.details}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToRemediation(subTab)}
                    className="w-full md:w-auto px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-semibold rounded-lg border border-indigo-900/30 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Solucionar</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
              <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-white">¡No se detectaron brechas operativas!</p>
              <p className="text-xs text-slate-400 mt-1">Tu cuestionario operativo interno se encuentra en estado de cumplimiento conforme.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Findings breakdown list */}
      {findings.length > 0 && (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-500" />
            <h3 className="text-base font-bold text-white tracking-wide">Detalle de Infracciones Detectadas</h3>
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

    </div>
  );
}
