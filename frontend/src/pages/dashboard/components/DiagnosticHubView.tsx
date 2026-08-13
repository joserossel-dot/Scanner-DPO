import React, { useState, useEffect } from 'react';
import { Sparkles, Info, CheckCircle, XCircle, FileText, HelpCircle, ShieldAlert } from 'lucide-react';
import DiagnosticQuestionnaire from './DiagnosticQuestionnaire';

interface RopaRecord {
  id: string;
  process_name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  retention_period: string;
  cross_border_transfer: boolean;
  source?: string;
  status?: string;
  created_at: string;
}

interface DiagnosticHubViewProps {
  token: string | null;
  onEvaluationSuccess?: (evalData: any) => void;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function DiagnosticHubView({ token, onEvaluationSuccess }: DiagnosticHubViewProps) {
  const [drafts, setDrafts] = useState<RopaRecord[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);

  // Fetch initial drafts
  const fetchDrafts = async () => {
    if (!token) return;
    setIsLoadingDrafts(true);
    try {
      const response = await fetch(`${API_BASE}/api/ropa`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data: RopaRecord[] = await response.json();
        setDrafts(data.filter(r => r.status === 'draft'));
      }
    } catch (e) {
      console.error('Error fetching drafts in Hub:', e);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [token]);

  // Handle questionnaire submit
  const handleQuestionnaireSubmit = async (answers: any) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...answers, domain: window.location.hostname || 'localhost' })
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluationData(data);
        if (data.ropaDraftsGenerated) {
          setDrafts(data.ropaDraftsGenerated);
        } else {
          fetchDrafts();
        }
        if (onEvaluationSuccess) {
          onEvaluationSuccess(data);
        }
      } else {
        alert('Ocurrió un error al enviar el diagnóstico.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al enviar el diagnóstico.');
    }
  };

  // Quick Action: Confirm Draft
  const handleConfirmDraft = async (record: RopaRecord) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/ropa/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...record,
          status: 'confirmed'
        })
      });
      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== record.id));
      } else {
        alert('Error al confirmar el borrador.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Reject Draft
  const handleRejectDraft = async (record: RopaRecord) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/ropa/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...record,
          status: 'rejected'
        })
      });
      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== record.id));
      } else {
        alert('Error al descartar el borrador.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header local */}
      <div className="text-left">
        <h1 className="text-xl font-bold text-white tracking-wide">📋 Módulo Unificado de Diagnóstico e Inventario</h1>
        <p className="text-xs text-slate-400 mt-0.5">Complete el cuestionario operativo y verifique en tiempo real los borradores sugeridos para su RoPA.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Columna Izquierda (60%): Cuestionario */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md text-left">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="text-indigo-400 w-4 h-4" />
              <span>Cuestionario de Cumplimiento PYME</span>
            </h2>
            <DiagnosticQuestionnaire onSubmit={handleQuestionnaireSubmit} token={token} />
          </div>
        </div>

        {/* Columna Derecha (40%): Panel de Borradores en Vivo */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-lg flex flex-col h-full text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={15} className="text-amber-400 animate-pulse" />
                <span>Panel en Vivo: Borradores RoPA</span>
              </h2>
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                {drafts.length} detectados
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Las actividades que se deducen a partir de sus respuestas aparecen aquí en tiempo real como sugerencias. Confírmelas para completar su inventario oficial.
            </p>

            {/* List of drafts */}
            {isLoadingDrafts ? (
              <div className="text-center py-12 text-xs text-slate-500">Buscando borradores...</div>
            ) : drafts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 border border-dashed border-slate-850 rounded-xl bg-slate-950/20 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-350">Sin borradores pendientes</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-xs mx-auto">
                    Complete y envíe el cuestionario de la izquierda para que el motor de inferencia genere los borradores automáticos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {drafts.map((record) => (
                  <div
                    key={record.id}
                    className="bg-slate-950/70 border border-slate-850 hover:border-slate-800 rounded-xl p-4 space-y-3 transition-all relative overflow-hidden animate-fadeIn"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500/80" />
                    
                    <div className="space-y-1 pl-1">
                      <h4 className="font-extrabold text-xs text-white leading-tight">{record.process_name}</h4>
                      <p className="text-[10px] text-slate-450 line-clamp-3 leading-relaxed">{record.purpose}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[9px] pl-1">
                      <span className="bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded">
                        Conservación: {record.retention_period}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        record.cross_border_transfer 
                          ? 'bg-amber-950/30 text-amber-400 border border-amber-900/20' 
                          : 'bg-emerald-950/30 text-emerald-450 border border-emerald-900/20'
                      }`}>
                        {record.cross_border_transfer ? '✈️ Transf. Internacional' : '🏠 Almacenamiento Local'}
                      </span>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2 pt-1 border-t border-slate-900 pl-1">
                      <button
                        onClick={() => handleConfirmDraft(record)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all"
                      >
                        <CheckCircle size={11} />
                        <span>Confirmar</span>
                      </button>
                      <button
                        onClick={() => handleRejectDraft(record)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-[10px] rounded-lg transition-all"
                      >
                        <XCircle size={11} />
                        <span>Descartar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
