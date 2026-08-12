import React from 'react';
import { 
  Scale, 
  Info, 
  UserCheck, 
  ShieldAlert, 
  Briefcase, 
  BookOpen, 
  ArrowRight 
} from 'lucide-react';

interface ComplianceOverviewViewProps {
  onStartDiagnosis: () => void;
}

export default function ComplianceOverviewView({ onStartDiagnosis }: ComplianceOverviewViewProps) {
  const pillars = [
    {
      id: 1,
      icon: <Info className="w-6 h-6 text-indigo-400" />,
      title: "1. Deber de Información (Art. 14 ter)",
      description: "Obliga a las organizaciones a informar explícitamente y con lenguaje claro el destino, fines, tiempo de almacenamiento y la identidad del responsable del tratamiento de los datos recolectados."
    },
    {
      id: 2,
      icon: <UserCheck className="w-6 h-6 text-emerald-400" />,
      title: "2. Derechos ARCO+",
      description: "Establece canales gratuitos y eficientes para garantizar que los titulares ejerzan de forma inmediata sus derechos de Acceso, Rectificación, Cancelación, Oposición, Portabilidad y Bloqueo Temporal."
    },
    {
      id: 3,
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
      title: "3. Seguridad y Brechas",
      description: "Exige implementar medidas de cifrado técnico avanzadas. En caso de filtración de datos, impone el deber impostergable de reportar el incidente a la Agencia y notificar a los afectados de forma oportuna."
    },
    {
      id: 4,
      icon: <Briefcase className="w-6 h-6 text-amber-400" />,
      title: "4. Modelo de Prevención e Infracciones (DPO)",
      description: "Fomenta la designación formal de un Oficial de Protección de Datos (DPO) y la gobernanza activa de la matriz de riesgos para evitar sanciones que alcanzan multas graves de hasta 20.000 UTM."
    }
  ];

  return (
    <div className="space-y-8 text-left">
      {/* Intro Header */}
      <header className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-indigo-400">
            <Scale size={18} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/30">
              Marco Legal Regulado
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            Gobernanza y Pilares de la Ley N° 21.719
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Reforma integral a la Ley N° 19.628 de Protección de Datos Personales en Chile. Prepare su organización e incorpore las directivas de cumplimiento técnico y mitigación penal.
          </p>
        </div>

        <a 
          href="https://bcn.cl/GapReB" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-2 px-4 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-350 hover:text-slate-100 font-bold text-xs rounded-xl transition-all shadow-md flex-shrink-0"
        >
          <BookOpen size={14} />
          <span>Leer texto oficial de la Ley (BCN)</span>
        </a>
      </header>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map(pillar => (
          <div 
            key={pillar.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4 hover:border-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                {pillar.icon}
              </div>
              <h3 className="font-extrabold text-sm text-white tracking-wide">{pillar.title}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed text-justify">{pillar.description}</p>
          </div>
        ))}
      </div>

      {/* Call to Action Footer Card */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-slate-950/20 border border-indigo-900/20 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg">
        <div className="space-y-1.5 max-w-lg text-left">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">¿Listo para auditar su nivel de adecuación?</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Responda el cuestionario diagnóstico de brechas para consolidar su informe de hallazgos del DPO, calcular su riesgo máximo en UTM y habilitar el plan de remedición automatizado.
          </p>
        </div>
        <button
          onClick={onStartDiagnosis}
          className="flex items-center gap-2 py-3 px-6 bg-indigo-650 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/15 flex-shrink-0"
        >
          <span>Comenzar Diagnóstico Operativo</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
