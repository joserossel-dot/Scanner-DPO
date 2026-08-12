import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  ShieldCheck, 
  Users, 
  Globe, 
  CheckSquare, 
  Calendar, 
  RefreshCw,
  Award
} from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

interface AuditDossierViewProps {
  token: string | null;
}

interface DossierData {
  company_name: string;
  company_email: string;
  created_at: string;
  latest_score: number;
  severity_counts: {
    leve: number;
    grave: number;
    gravisima: number;
  };
  last_policy_updated: string | null;
  transfers: {
    total: number;
    with_scc: number;
  };
  risks: {
    total: number;
    mitigated: number;
  };
  ropa?: {
    confirmed_count: number;
  };
}

export default function AuditDossierView({ token }: AuditDossierViewProps) {
  const [data, setData] = useState<DossierData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (token) {
      fetchDossier();
    }
  }, [token]);

  const fetchDossier = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/reports/dossier`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const dossier = await response.json();
        setData(dossier);
      } else {
        setErrorMsg('No se pudo compilar la información de auditoría del inquilino.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al consultar el dossier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px', flexDirection: 'column', gap: '10px' }}>
        <RefreshCw className="loader w-8 h-8 text-indigo-500" />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Compilando evidencia y armando dossier...</span>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="card p-6 text-center" style={{ minHeight: '200px' }}>
        <p className="text-rose-400 text-sm font-semibold">{errorMsg || 'Cargue la vista nuevamente.'}</p>
        <button 
          onClick={fetchDossier}
          className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-lg text-xs font-semibold text-white transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const getDpaPercent = () => {
    if (data.transfers.total === 0) return 100;
    return Math.round((data.transfers.with_scc / data.transfers.total) * 100);
  };

  const getRiskPercent = () => {
    if (data.risks.total === 0) return 100;
    return Math.round((data.risks.mitigated / data.risks.total) * 100);
  };

  return (
    <div className="space-y-6 relative text-left">
      
      {/* Estilos CSS @media print */}
      <style>{`
        @media print {
          /* Hide sidebar navigation and print controls */
          aside, nav, header, button, .print-hidden {
            display: none !important;
          }
          /* Reset container margins for A4 paper */
          body, .main-workspace, .workspace-layout, main, #root {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .dossier-sheet {
            border: none !important;
            background: #ffffff !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
          }
          /* Ensure font scales are crisp in grayscale printing */
          h1, h2, h3, h4, h5, th {
            color: #000000 !important;
          }
          p, td, span, li {
            color: #1f2937 !important;
          }
          .badge-print {
            border: 1px solid #000000 !important;
            background: transparent !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Floating Toolbar (Print Hidden) */}
      <div className="card print-hidden" style={{ padding: '16px' }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-950/50 text-indigo-400 rounded-lg border border-indigo-900/50">
              <FileText size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Generador de Dossier Audit-Ready</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Informe unificado de descargos ante requerimientos de fiscalización formal de la Agencia.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDossier}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg text-xs transition-all border border-slate-800"
            >
              Recargar Datos
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-white text-xs transition-all shadow-md"
            >
              <Printer size={14} />
              <span>Exportar a PDF (Audit-Ready)</span>
            </button>
          </div>
        </div>
      </div>

      {/* The Printable Dossier Document */}
      <div className="dossier-sheet bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-4xl mx-auto text-slate-900 font-sans">
        
        {/* Header Block */}
        <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded">
              Expediente de Evidencia Legal
            </span>
            <h1 className="text-2xl font-black text-slate-900 font-serif" style={{ margin: '8px 0 0 0' }}>
              DOSSIER OFICIAL DE CUMPLIMIENTO
            </h1>
            <p className="text-xs font-semibold text-slate-650" style={{ margin: 0 }}>
              Ley N° 21.719 sobre Protección de Datos Personales • República de Chile
            </p>
          </div>
          <div className="text-right space-y-1 text-xs">
            <div className="font-bold text-slate-900">PrivacyTech APD-Scanner</div>
            <div className="text-slate-500 text-[10px] font-mono">Generado: {new Date().toLocaleDateString('es-CL')}</div>
          </div>
        </div>

        {/* Company and Tenant Info */}
        <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-150">
          <div>
            <div className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">Responsable del Tratamiento</div>
            <div className="text-xs font-bold text-slate-800 mt-1">{data.company_name}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">Canal de Contacto DPO</div>
            <div className="text-xs font-bold text-slate-800 mt-1">{data.company_email}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">Fecha Alta de Organización</div>
            <div className="text-xs font-bold text-slate-800 mt-1">
              {new Date(data.created_at).toLocaleDateString('es-CL')}
            </div>
          </div>
        </div>

        {/* SECTION 1: Executive Summary */}
        <div className="py-4 space-y-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Award className="text-indigo-650 w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">Sección 1: Resumen Ejecutivo de Cumplimiento</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Score circle gauge */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <div className="relative flex items-center justify-center">
                <span className="text-3xl font-black text-slate-900 font-mono">{data.latest_score}%</span>
              </div>
              <div className="text-[10px] font-extrabold uppercase text-slate-500 mt-2">Índice Global de Apego</div>
            </div>

            {/* Severity stats and description */}
            <div className="md:col-span-8 space-y-3.5">
              <p className="text-xs text-slate-700 leading-relaxed text-justify" style={{ margin: 0 }}>
                Este informe compila la evidencia legal, la auditoría del consentimiento web (CMP) y las medidas operativas aplicadas por la organización en conformidad con las directrices y exigencias de fiscalización de la Ley N° 21.719 en Chile.
              </p>
              
              <div className="flex gap-4">
                <div className="text-center bg-rose-50 border border-rose-200 rounded px-3 py-1">
                  <div className="text-xs font-black text-rose-700">{data.severity_counts.gravisima}</div>
                  <div className="text-[9px] font-bold text-rose-500 uppercase">Gravísimas</div>
                </div>
                <div className="text-center bg-amber-50 border border-amber-200 rounded px-3 py-1">
                  <div className="text-xs font-black text-amber-700">{data.severity_counts.grave}</div>
                  <div className="text-[9px] font-bold text-amber-500 uppercase">Graves</div>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded px-3 py-1">
                  <div className="text-xs font-black text-emerald-700">{data.severity_counts.leve}</div>
                  <div className="text-[9px] font-bold text-emerald-500 uppercase">Leves</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Governance & Prevention */}
        <div className="py-5 space-y-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-indigo-650 w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">Sección 2: Gobernanza Interna y Modelo de Prevención</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-750">
            <div className="space-y-2 bg-slate-50/50 p-4 border border-slate-150 rounded-xl">
              <h4 className="font-bold text-slate-900 text-xs">Matriz de Prevención de Riesgos (Art. 49 let. d)</h4>
              <p className="leading-relaxed">
                La organización mantiene un modelo de prevención delictual y de infracciones operacionales activo y mapeado en base a procesos de negocio.
              </p>
              <div className="flex justify-between items-center pt-1">
                <span>Riesgos Totales Evaluados:</span>
                <span className="font-bold text-slate-900">{data.risks.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Riesgos con Control Mitigado:</span>
                <span className="font-bold text-slate-900">{data.risks.mitigated} ({getRiskPercent()}%)</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50/50 p-4 border border-slate-150 rounded-xl">
              <h4 className="font-bold text-slate-900 text-xs">Gobernanza de Información Obligatoria (Art. 14 ter)</h4>
              <p className="leading-relaxed">
                En cumplimiento del principio de transparencia informativa activa, se mantiene una política oficial disponible para todos los titulares de datos.
              </p>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] text-slate-455 uppercase font-extrabold">Última Actualización de Política</span>
                <span className="text-xs font-bold text-slate-800">
                  {data.last_policy_updated ? new Date(data.last_policy_updated).toLocaleDateString('es-CL') : 'Sin política activa'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-150 flex justify-between items-center">
                <span className="text-[10px] text-slate-455 uppercase font-extrabold">Inventario RoPA Confirmado (Art. 12)</span>
                <span className="text-xs font-bold text-indigo-750">
                  {data.ropa?.confirmed_count || 0} Procesos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Traceability & Contracts */}
        <div className="py-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="text-indigo-650 w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">Sección 3: Trazabilidad Contratista y Transferencias</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-750">
            <div className="space-y-2 bg-slate-50/50 p-4 border border-slate-150 rounded-xl col-span-2">
              <h4 className="font-bold text-slate-900 text-xs">Proveedores y Encargados del Tratamiento (Art. 15 bis)</h4>
              <p className="leading-relaxed">
                Todos los datos personales transferidos a contratistas y proveedores externos se encuentran cubiertos bajo garantías de confidencialidad y procesamiento.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-2 text-center">
                <div className="p-2 border border-slate-150 rounded">
                  <div className="font-bold text-slate-950">{data.transfers.total}</div>
                  <div className="text-[9px] text-slate-500 uppercase mt-0.5">Proveedores</div>
                </div>
                <div className="p-2 border border-slate-150 rounded">
                  <div className="font-bold text-slate-950">{data.transfers.with_scc}</div>
                  <div className="text-[9px] text-slate-500 uppercase mt-0.5">Con Cláusulas SCC</div>
                </div>
                <div className="p-2 border border-slate-150 rounded">
                  <div className="font-bold text-slate-950">{getDpaPercent()}%</div>
                  <div className="text-[9px] text-slate-500 uppercase mt-0.5">Cobertura Legal</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures block */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-10">
          <div className="text-center space-y-1">
            <div className="w-48 h-0.5 bg-slate-300 mx-auto mb-2"></div>
            <div className="text-xs font-bold text-slate-900">Representante Legal</div>
            <div className="text-[10px] text-slate-500 uppercase font-mono">{data.company_name}</div>
          </div>
          <div className="text-center space-y-1">
            <div className="w-48 h-0.5 bg-slate-300 mx-auto mb-2"></div>
            <div className="text-xs font-bold text-slate-900">Delegado de Protección de Datos (DPO)</div>
            <div className="text-[10px] text-slate-500 uppercase font-mono">DPO Suite Validado</div>
          </div>
        </div>

      </div>

    </div>
  );
}
