import { authFetch } from '../../../lib/authFetch';
import { API_BASE } from '../../../lib/api';
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  FileText, 
  HelpCircle, 
  ShieldAlert,
  X,
  ToggleLeft,
  ToggleRight,
  AlertTriangle
} from 'lucide-react';
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
  scanUrl?: string;
  onEvaluationSuccess?: (evalData: any) => void;
  setActiveTab?: (tab: 'scanner' | 'diagnosis' | 'remediation' | 'dpo' | 'dossier' | 'ropa' | 'admin') => void;
}

export default function DiagnosticHubView({ token, scanUrl, onEvaluationSuccess, setActiveTab }: DiagnosticHubViewProps) {
  const [drafts, setDrafts] = useState<RopaRecord[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RopaRecord | null>(null);
  const [processName, setProcessName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [retentionPeriod, setRetentionPeriod] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [crossBorderTransfer, setCrossBorderTransfer] = useState(false);

  // Fetch initial drafts
  const fetchDrafts = async () => {
    if (!token) return;
    setIsLoadingDrafts(true);
    try {
      const response = await authFetch(`${API_BASE}/api/ropa`, {
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
      const cleanDomain = (() => {
        const url = scanUrl || 'localhost:3000';
        try { return new URL(url).hostname; } catch (e) { return url.replace(/^https?:\/\//, '').replace(/\/$/, ''); }
      })();
      const res = await authFetch(`${API_BASE}/api/reports/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...answers, domain: cleanDomain })
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluationData(data);
        if (onEvaluationSuccess) {
          onEvaluationSuccess(data);
        }
        if (data.ropaDraftsGenerated) {
          setDrafts(data.ropaDraftsGenerated);
        } else {
          fetchDrafts();
        }
      } else {
        alert('Ocurrió un error al enviar el diagnóstico.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al enviar el diagnóstico.');
    }
  };

  // Open modal prefilled with draft data
  const handleOpenEditModal = (record: RopaRecord) => {
    setEditingRecord(record);
    setProcessName(record.process_name || '');
    setPurpose(record.purpose || '');
    setLegalBasis(record.legal_basis || '');
    setRetentionPeriod(record.retention_period || '');
    setDataCategories(record.data_categories || []);
    setCrossBorderTransfer(record.cross_border_transfer || false);
    setIsModalOpen(true);
  };

  // Save confirmed draft
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !token) return;
    try {
      const response = await authFetch(`${API_BASE}/api/ropa/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          process_name: processName,
          purpose,
          legal_basis: legalBasis,
          retention_period: retentionPeriod,
          data_categories: dataCategories,
          cross_border_transfer: crossBorderTransfer,
          status: 'confirmed'
        })
      });
      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== editingRecord.id));
        setIsModalOpen(false);
        setEditingRecord(null);
      } else {
        alert('Error al confirmar la actividad de tratamiento.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Reject Draft
  const handleRejectDraft = async (record: RopaRecord) => {
    if (!token) return;
    try {
      const response = await authFetch(`${API_BASE}/api/ropa/${record.id}`, {
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

  // Toggle category checkboxes in modal
  const handleCategoryToggle = (categoryName: string) => {
    setDataCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Transition to results (always fetching latest to ensure newly confirmed ROPAs are included)
  const handleTransitionToResults = async () => {
    if (!onEvaluationSuccess) return;
    
    setIsTransitioning(true);
    try {
      const res = await authFetch(`${API_BASE}/api/reports/diagnosis?domain=${window.location.hostname}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Transition ONLY after successfully receiving valid results
        onEvaluationSuccess(data);
      } else {
        alert('Por favor complete y envíe el cuestionario primero.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de comunicación al obtener los resultados.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const showSecurityWarning = dataCategories.includes('Salud/Sensibles') || dataCategories.includes('Biométricos');

  return (
    <div className="space-y-6">
      {/* Header local */}
      <div className="text-left">
        <h1 className="text-xl font-bold text-white tracking-wide">📋 Hub de Diagnóstico e Inventario RoPA</h1>
        <p className="text-xs text-slate-400 mt-0.5">Complete el cuestionario de adecuación y confirme los borradores normativos sugeridos en vivo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        
        {/* Columna Izquierda (7/12): Cuestionario */}
        <div className="lg:col-span-7 max-h-[780px] overflow-y-auto pr-2 space-y-6 text-left scrollbar-thin">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="text-indigo-400 w-4 h-4" />
              <span>Cuestionario de Cumplimiento PYME</span>
            </h2>
            <DiagnosticQuestionnaire onSubmit={handleQuestionnaireSubmit} token={token} setActiveTab={setActiveTab} />
          </div>
        </div>

        {/* Columna Derecha (5/12): Panel de Borradores en Vivo */}
        <div className="lg:col-span-5 max-h-[780px] overflow-y-auto pl-2 flex flex-col justify-between bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-lg relative scrollbar-thin">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-left">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={15} className="text-amber-400 animate-pulse" />
                <span>Panel en Vivo: Borradores RoPA</span>
              </h2>
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                {drafts.length} sugeridos
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-left">
              Los borradores se generan automáticamente a partir de sus respuestas. Edítelos y confírmelos para regularizar el Registro de Actividades.
            </p>

            {/* List of drafts */}
            {isLoadingDrafts ? (
              <div className="text-center py-12 text-xs text-slate-500">Buscando borradores...</div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-850 rounded-xl bg-slate-950/20 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-350">Sin borradores pendientes</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-xs mx-auto">
                    Todos los borradores han sido procesados. Puede proceder a revisar su Diagnóstico haciendo clic abajo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((record) => (
                  <div
                    key={record.id}
                    className="bg-slate-950/70 border border-slate-850 hover:border-slate-800 rounded-xl p-4 space-y-3 transition-all relative overflow-hidden text-left"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500/80" />
                    
                    <div className="space-y-1 pl-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-xs text-white leading-tight">{record.process_name}</h4>
                        <span className="bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold">
                          {record.source === 'scan' ? 'Escáner' : 'Cuestionario'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-relaxed mt-1">{record.purpose}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[9px] pl-1">
                      <span className="bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded">
                        Conservación sugerida: {record.retention_period || 'Por definir'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        record.cross_border_transfer 
                          ? 'bg-amber-950/30 text-amber-400 border border-amber-900/20' 
                          : 'bg-emerald-950/30 text-emerald-450 border-emerald-900/20'
                      }`}>
                        {record.cross_border_transfer ? '✈️ Transf. Internacional' : '🏠 Almacenamiento Local'}
                      </span>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2 pt-1 border-t border-slate-900 pl-1">
                      <button
                        onClick={() => handleOpenEditModal(record)}
                        className="flex-grow flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all"
                      >
                        <CheckCircle size={11} />
                        <span>Completar y Confirmar</span>
                      </button>
                      <button
                        onClick={() => handleRejectDraft(record)}
                        className="flex-shrink-0 flex items-center justify-center gap-1 py-1.5 px-2.5 bg-rose-955/20 border border-rose-900/30 hover:bg-rose-950 text-rose-400 font-bold text-[10px] rounded-lg transition-all"
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

          {/* Master CTA Container at the bottom */}
          <div className="pt-4 border-t border-slate-800/80 mt-6 bg-slate-900/20 sticky bottom-0 text-left">
            <button
              onClick={handleTransitionToResults}
              disabled={isTransitioning}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white disabled:text-slate-500 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isTransitioning ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Confirmar Inventario y Ver Resultados</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Edit/Confirm Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center text-left">
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wide">
                  Confirmar Actividad de Tratamiento
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Defina las bases de licitud, conservación y alcance legal para regularizar este tratamiento.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-0.5">Nombre del Proceso o Actividad *</label>
                <input
                  type="text"
                  required
                  value={processName}
                  onChange={e => setProcessName(e.target.value)}
                  placeholder="ej. Envío de Boletines Comerciales / Registro de Clientes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-0.5">Finalidad y Alcance del Tratamiento *</label>
                <textarea
                  required
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Describa para qué fines específicos se almacenan y procesan estos datos..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Base de Licitud *</label>
                  <select
                    required
                    value={legalBasis}
                    onChange={e => setLegalBasis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Seleccione una base</option>
                    <option value="Consentimiento">Consentimiento del Titular</option>
                    <option value="Contrato">Ejecución del Contrato</option>
                    <option value="Obligación Legal">Cumplimiento de Obligación Legal</option>
                    <option value="Interés Legítimo">Interés Legítimo</option>
                    <option value="Interés Público">Interés Público / Ley</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Plazo de Conservación *</label>
                  <input
                    type="text"
                    required
                    value={retentionPeriod}
                    onChange={e => setRetentionPeriod(e.target.value)}
                    placeholder="ej. 5 años desde cese contrato"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Categorías de Datos Personales Tratados *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  {[
                    'Identificatorios',
                    'Financieros',
                    'Salud/Sensibles',
                    'Biométricos',
                    'Menores de Edad (NNA)',
                    'Geolocalización'
                  ].map(cat => {
                    const isChecked = dataCategories.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 text-[11px] text-slate-450 cursor-pointer select-none hover:text-slate-300">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCategoryToggle(cat)}
                          className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {showSecurityWarning && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/40 text-amber-500 text-[10px] rounded-lg flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    <strong>Atención (Art. 16 bis):</strong> Los datos de salud o biometría requieren medidas adicionales de cifrado en reposo/tránsito y consentimiento explícito firmado.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-950/30 p-3 rounded-lg border border-slate-855 select-none">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-300 block">Transferencia Internacional de Datos</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">¿Se transfieren estos datos personales a servidores en el extranjero?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCrossBorderTransfer(!crossBorderTransfer)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors bg-transparent border-none p-0 focus:outline-none"
                >
                  {crossBorderTransfer ? (
                    <ToggleRight className="w-8 h-8 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-650" />
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                >
                  Confirmar y Guardar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
