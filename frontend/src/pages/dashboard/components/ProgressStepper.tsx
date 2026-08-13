import React from 'react';
import { ShieldCheck, HelpCircle, Check, Play } from 'lucide-react';

interface ProgressStepperProps {
  activeTab: string;
  diagnosisData: any;
  draftsCount: number;
}

export default function ProgressStepper({ activeTab, diagnosisData, draftsCount }: ProgressStepperProps) {
  const findings = diagnosisData?.findings || [];
  const isRopaMissing = findings.some((f: any) => f?.id === 'FIND_ROPA_MISSING');
  const hasDraftsPending = findings.some((f: any) => f?.id === 'FIND_ROPA_DRAFTS_PENDING');

  const hasCompletedDiagnosis = diagnosisData && !isRopaMissing && !hasDraftsPending && diagnosisData.globalScore > 0;

  if (hasCompletedDiagnosis) {
    return (
      <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/60 px-4 py-2 rounded-xl text-left w-fit shadow-md">
        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <ShieldCheck size={13} className="animate-pulse" />
        </div>
        <div>
          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Cumplimiento Activo</span>
          <p className="text-[9px] text-emerald-500/80 -mt-0.5 font-medium">RoPA confirmado y Score: {diagnosisData.globalScore}%</p>
        </div>
      </div>
    );
  }

  // Active step selection
  let currentStep = 1;
  if (activeTab === 'diagnosis') {
    currentStep = 2;
  } else if (['remediation', 'dpo', 'dossier'].includes(activeTab)) {
    currentStep = 3;
  }

  const steps = [
    { number: 1, label: 'Escáner Automático', tab: 'scanner' },
    { number: 2, label: 'Inventario & Diagnóstico', tab: 'diagnosis' },
    { number: 3, label: 'Soluciones Legales', tab: 'remediation' }
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-sm w-full text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>Ruta de Adecuación Normativa</span>
            <span className="bg-indigo-950 text-indigo-400 text-[8px] font-black px-1.5 py-0.2 rounded border border-indigo-900">Ley 21.719</span>
          </h4>
          <p className="text-[10px] text-slate-450 mt-0.5">Complete cada etapa para obtener su certificación y contratos legales blindados.</p>
        </div>

        {/* Stepper display */}
        <div className="flex items-center gap-2 md:gap-6 flex-1 max-w-xl">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;
            
            return (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all border ${
                    isCompleted 
                      ? 'bg-emerald-600 border-emerald-500 text-white' 
                      : isActive 
                        ? 'bg-indigo-650 border-indigo-500 text-white ring-2 ring-indigo-900/60' 
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    {isCompleted ? <Check size={11} /> : step.number}
                  </div>
                  <span className={`text-[10.5px] font-bold whitespace-nowrap ${
                    isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-[1px] bg-slate-850" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
