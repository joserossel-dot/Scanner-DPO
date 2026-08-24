import { authFetch } from '../../../lib/authFetch';
import { API_BASE, getApiError } from '../../../lib/api';
import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  Plus, 
  Download, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle,
  X,
  CheckCircle,
  HelpCircle,
  Info,
  Users,
  Megaphone,
  Lock,
  Sparkles
} from 'lucide-react';

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
  systems?: string[];
  data_sources?: string[];
  data_subject_categories?: string[];
  recipients?: string[];
  deletion_method?: string;
  contains_sensitive_data?: boolean;
  sensitive_data_categories?: string[];
  legal_basis_rationale?: string;
  retention_legal_basis?: string;
  security_measures?: string[];
  review_due_at?: string;
  automated_decisions?: boolean;
  automated_decision_details?: string;
  created_at: string;
}

interface RopaInventoryViewProps {
  token: string | null;
  onRopaUpdated?: () => void;
}

export default function RopaInventoryView({ token, onRopaUpdated }: RopaInventoryViewProps) {
  const [ropaList, setRopaList] = useState<RopaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RopaRecord | null>(null);
  
  // Form fields
  const [processName, setProcessName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState('');
  const [crossBorderTransfer, setCrossBorderTransfer] = useState(false);
  const [systems, setSystems] = useState('');
  const [dataSources, setDataSources] = useState('');
  const [dataSubjects, setDataSubjects] = useState('');
  const [recipients, setRecipients] = useState('');
  const [deletionMethod, setDeletionMethod] = useState('');
  const [legalBasisRationale, setLegalBasisRationale] = useState('');
  const [retentionLegalBasis, setRetentionLegalBasis] = useState('');
  const [securityMeasures, setSecurityMeasures] = useState('');
  const [reviewDueAt, setReviewDueAt] = useState('');
  const [automatedDecisions, setAutomatedDecisions] = useState(false);
  const [automatedDecisionDetails, setAutomatedDecisionDetails] = useState('');

  // Evidence AI states
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResultMsg, setAnalysisResultMsg] = useState('');

  // Fetch all RoPA records
  const fetchRopa = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await authFetch(`${API_BASE}/api/ropa`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRopaList(data);
      } else {
        setErrorMsg(await getApiError(response, 'Error al consultar el inventario de actividades (RoPA).'));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de red al consultar el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRopa();
    }
  }, [token]);

  // Clean form fields
  const resetForm = () => {
    setProcessName('');
    setPurpose('');
    setLegalBasis('');
    setDataCategories([]);
    setRetentionPeriod('');
    setCrossBorderTransfer(false);
    setSystems(''); setDataSources(''); setDataSubjects(''); setRecipients(''); setDeletionMethod('');
    setLegalBasisRationale(''); setRetentionLegalBasis(''); setSecurityMeasures(''); setReviewDueAt('');
    setAutomatedDecisions(false); setAutomatedDecisionDetails('');
    setEvidenceFile(null);
    setAnalysisResultMsg('');
    setEditingRecord(null);
  };

  // Open modal for creation
  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for editing/confirming draft
  const handleOpenEditModal = (record: RopaRecord) => {
    setEditingRecord(record);
    setProcessName(record.process_name);
    setPurpose(record.purpose);
    setLegalBasis(record.legal_basis);
    setDataCategories(record.data_categories);
    setRetentionPeriod(record.retention_period);
    setCrossBorderTransfer(record.cross_border_transfer);
    setSystems((record.systems || []).join(', '));
    setDataSources((record.data_sources || []).join(', '));
    setDataSubjects((record.data_subject_categories || []).join(', '));
    setRecipients((record.recipients || []).join(', '));
    setDeletionMethod(record.deletion_method || '');
    setLegalBasisRationale(record.legal_basis_rationale || '');
    setRetentionLegalBasis(record.retention_legal_basis || '');
    setSecurityMeasures((record.security_measures || []).join(', '));
    setReviewDueAt(record.review_due_at ? record.review_due_at.slice(0, 10) : '');
    setAutomatedDecisions(record.automated_decisions === true);
    setAutomatedDecisionDetails(record.automated_decision_details || '');
    setEvidenceFile(null);
    setAnalysisResultMsg('');
    setIsModalOpen(true);
  };

  // Handle submit (Create or Update, automatically setting status to 'confirmed')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processName || !purpose || !legalBasis || dataCategories.length === 0 || !retentionPeriod) {
      alert('Por favor complete todos los campos obligatorios del inventario.');
      return;
    }

    const list = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
    const payload = {
      process_name: processName,
      purpose,
      legal_basis: legalBasis,
      data_categories: dataCategories,
      retention_period: retentionPeriod,
      cross_border_transfer: crossBorderTransfer,
      systems: list(systems), data_sources: list(dataSources),
      data_subject_categories: list(dataSubjects), recipients: list(recipients),
      deletion_method: deletionMethod,
      contains_sensitive_data: dataCategories.some(category => ['Salud/Sensibles', 'Biométricos', 'Menores de Edad (NNA)'].includes(category)),
      sensitive_data_categories: dataCategories.filter(category => ['Salud/Sensibles', 'Biométricos', 'Menores de Edad (NNA)'].includes(category)),
      legal_basis_rationale: legalBasisRationale,
      retention_legal_basis: retentionLegalBasis,
      security_measures: list(securityMeasures),
      review_due_at: reviewDueAt || null,
      automated_decisions: automatedDecisions,
      automated_decision_details: automatedDecisions ? automatedDecisionDetails : null,
      source: editingRecord?.source || 'manual',
      status: 'confirmed' // Submitting changes always transitions the process to confirmed status
    };

    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const url = editingRecord 
        ? `${API_BASE}/api/ropa/${editingRecord.id}` 
        : `${API_BASE}/api/ropa`;

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchRopa();
        onRopaUpdated?.();
      } else {
        alert(await getApiError(response, 'Error al guardar la actividad de tratamiento.'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de comunicación con el servidor.');
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta actividad de tratamiento de su RoPA?')) return;
    try {
      const response = await authFetch(`${API_BASE}/api/ropa/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchRopa();
        onRopaUpdated?.();
      } else {
        alert(await getApiError(response, 'Error al intentar eliminar la actividad de tratamiento.'));
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el servidor.');
    }
  };

  // Handle Reject Draft
  const handleRejectDraft = async (record: RopaRecord) => {
    if (!window.confirm(`¿Está seguro de rechazar la sugerencia '${record.process_name}'?`)) return;

    try {
      const response = await authFetch(`${API_BASE}/api/ropa/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          process_name: record.process_name,
          purpose: record.purpose,
          legal_basis: record.legal_basis,
          data_categories: record.data_categories,
          retention_period: record.retention_period,
          cross_border_transfer: record.cross_border_transfer,
          systems: record.systems || [],
          data_sources: record.data_sources || [],
          data_subject_categories: record.data_subject_categories || [],
          recipients: record.recipients || [],
          deletion_method: record.deletion_method || null,
          contains_sensitive_data: record.contains_sensitive_data === true,
          sensitive_data_categories: record.sensitive_data_categories || [],
          legal_basis_rationale: record.legal_basis_rationale || null,
          retention_legal_basis: record.retention_legal_basis || null,
          security_measures: record.security_measures || [],
          review_due_at: record.review_due_at || null,
          automated_decisions: record.automated_decisions === true,
          automated_decision_details: record.automated_decision_details || null,
          source: record.source,
          status: 'rejected'
        })
      });

      if (response.ok) {
        fetchRopa();
        onRopaUpdated?.();
      } else {
        alert('Error al rechazar el borrador sugerido.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de comunicación al rechazar el borrador.');
    }
  };

  // Toggle Category Selection
  const handleCategoryToggle = (category: string) => {
    if (dataCategories.includes(category)) {
      setDataCategories(dataCategories.filter(c => c !== category));
    } else {
      setDataCategories([...dataCategories, category]);
    }
  };

  // AI vision autofill trigger
  const handleAnalyzeEvidence = async () => {
    if (!evidenceFile || !token) return;

    setIsAnalyzing(true);
    setAnalysisResultMsg('');

    const formData = new FormData();
    formData.append('evidence', evidenceFile);

    try {
      const response = await authFetch(`${API_BASE}/api/ropa/analyze-evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.categories) {
          setDataCategories(data.categories);
        }
        if (data.reasoning) {
          setAnalysisResultMsg(`✨ Analizado con IA: ${data.reasoning}`);
        } else {
          setAnalysisResultMsg('✨ Análisis de evidencia completado con éxito.');
        }
      } else {
        const errData = await response.json();
        alert(errData.error || 'Error al analizar evidencia con IA.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al analizar la imagen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export to CSV Function (Confirmed only)
  const handleExportCSV = () => {
    const confirmedList = ropaList.filter(r => r.status === 'confirmed' || !r.status);
    
    if (confirmedList.length === 0) {
      alert('No hay actividades de tratamiento confirmadas para exportar.');
      return;
    }

    const headers = [
      'ID Actividad',
      'Nombre del Proceso',
      'Finalidad del Tratamiento',
      'Base Lícita de Licitud',
      'Categorías de Datos Personales',
      'Categorías de Titulares',
      'Sistemas',
      'Destinatarios',
      'Plazo de Conservación',
      'Fundamento de Conservación',
      'Método de Eliminación',
      'Medidas de Seguridad',
      'Transferencia Internacional',
      'Próxima Revisión',
      'Fecha de Registro'
    ];

    const rows = confirmedList.map(item => [
      item.id,
      `"${item.process_name.replace(/"/g, '""')}"`,
      `"${item.purpose.replace(/"/g, '""')}"`,
      item.legal_basis,
      `"${item.data_categories.join(', ')}"`,
      `"${(item.data_subject_categories || []).join(', ')}"`,
      `"${(item.systems || []).join(', ')}"`,
      `"${(item.recipients || []).join(', ')}"`,
      `"${item.retention_period.replace(/"/g, '""')}"`,
      `"${(item.retention_legal_basis || '').replace(/"/g, '""')}"`,
      `"${(item.deletion_method || '').replace(/"/g, '""')}"`,
      `"${(item.security_measures || []).join(', ')}"`,
      item.cross_border_transfer ? 'SÍ' : 'NO',
      item.review_due_at || '',
      item.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ropa_record_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showSecurityWarning = dataCategories.includes('Salud/Sensibles') || dataCategories.includes('Biométricos');

  // Filter records into Draft suggestions vs Confirmed official inventory
  const drafts = ropaList.filter(r => r.status === 'draft');
  const confirmed = ropaList.filter(r => r.status === 'confirmed' || !r.status);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">📓 Inventario de Actividades de Tratamiento (RoPA)</h1>
          <p className="text-xs text-slate-400 mt-0.5">Inventario formalizado de actividades de datos personales de la empresa.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 py-2 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all shadow-md"
          >
            <Download size={15} />
            <span>Exportar CSV (Auditores)</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/10"
          >
            <Plus size={15} />
            <span>Mapear Nuevo Proceso</span>
          </button>
        </div>
      </header>

      {/* UX/UI Banner Informativo */}
      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-4 md:p-5 flex items-start gap-4 text-left">
        <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-xl border border-indigo-850 flex-shrink-0">
          <Info size={18} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">¿Qué es el inventario RoPA?</h3>
          <p className="text-xs text-slate-355 leading-relaxed">
            Este inventario documenta qué datos personales utiliza la empresa, para qué finalidades, en qué sistemas, por cuánto tiempo y con quién los comparte. Cada actividad debe ser confirmada por su responsable y respaldada con evidencia.
          </p>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Consultando inventario RoPA...</div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-455 rounded-xl text-xs">{errorMsg}</div>
      ) : ropaList.length === 0 ? (
        <div className="space-y-8">
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-8 md:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 bg-slate-950 border border-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
              <FolderLock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No se han registrado procesos</h4>
              <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                Mapee las actividades de tratamiento de su empresa (RoPA) para cumplir formalmente con las obligaciones de inventariado ante fiscalizaciones del regulador.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="py-1.5 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold text-xs rounded-lg transition-all border border-indigo-900/50"
            >
              Registrar Primer Proceso
            </button>
          </div>

          {/* Estado Vacío Enriquecido (Ejemplos Comunes) */}
          <div className="max-w-4xl mx-auto space-y-4 text-left">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle size={14} className="text-indigo-400" />
              <span>¿Por dónde empezar? Ejemplos comunes:</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/30 border border-slate-855 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-950 text-indigo-400 rounded-lg border border-slate-850">
                    <Users size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-white">Recursos Humanos</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tratamiento de planillas para pago de nómina, control de asistencia (reloj biométrico), y base de reclutamiento de candidatos.
                </p>
              </div>

              <div className="bg-slate-900/30 border border-slate-855 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-950 text-emerald-400 rounded-lg border border-slate-850">
                    <Megaphone size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-white">Marketing y Ventas</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bases de clientes alojadas en el CRM, listas de suscripción para envíos de newsletters, y captación mediante cookies de analítica web.
                </p>
              </div>

              <div className="bg-slate-900/30 border border-slate-855 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-950 text-rose-455 rounded-lg border border-slate-850">
                    <Lock size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-white">Seguridad y Operaciones</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Registros de cámaras de videovigilancia (CCTV) en sucursales, bitácora física de visitas en portería, y credenciales de acceso a redes locales.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* BLOQUE 1: Sugerencias Detectadas (Borradores) */}
          {drafts.length > 0 && (
            <div className="space-y-4 text-left bg-amber-500/5 border border-amber-550/15 p-5 rounded-2xl">
              <h3 className="text-xs font-black text-amber-500 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles size={16} className="text-amber-500 animate-pulse animate-duration-1000" />
                <span>Sugerencias del Escáner e IA ({drafts.length} Borradores)</span>
              </h3>
              <p className="text-[11px] text-amber-305/80 leading-relaxed">
                El sistema ha detectado estas actividades. Por favor, confirme o complete la información para generar su diagnóstico de riesgos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts.map(record => {
                  return (
                    <div 
                      key={record.id}
                      className="bg-slate-950 border border-amber-900/35 hover:border-amber-900/60 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/30" />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-xs text-white leading-tight">{record.process_name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                            record.source === 'auto_scanner'
                              ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40'
                              : 'bg-teal-950 text-teal-450 border border-teal-900/40'
                          }`}>
                            {record.source === 'auto_scanner' ? '🔍 Escáner' : '📋 Cuestionario'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{record.purpose}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                          <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            {record.legal_basis}
                          </span>
                          <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            conserva: {record.retention_period}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-850 flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-lg text-[11px] transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                        >
                          <span>Revisar y Confirmar</span>
                        </button>
                        <button
                          onClick={() => handleRejectDraft(record)}
                          className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-850 text-rose-455 hover:text-rose-350 rounded-lg text-[11px] transition-all border border-slate-800"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BLOQUE 2: Inventario Oficial Confirmado */}
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <FolderLock size={15} className="text-indigo-400" />
              <span>Inventario Oficial Registrado ({confirmed.length})</span>
            </h3>

            {confirmed.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
                <FolderLock size={22} className="text-slate-650 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-300">No hay procesos confirmados</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Mapee un proceso utilizando el botón superior o valide las sugerencias de la IA para iniciar su RoPA formal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {confirmed.map(record => {
                  const hasSensitive = record.data_categories.includes('Salud/Sensibles') || record.data_categories.includes('Biométricos');
                  return (
                    <div 
                      key={record.id}
                      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/50 transition-all flex flex-col justify-between space-y-4 shadow-md text-left"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-extrabold text-sm text-white leading-tight">{record.process_name}</h3>
                          
                          {/* Actions button group */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button 
                              onClick={() => handleOpenEditModal(record)}
                              className="p-1.5 bg-slate-950 border border-slate-850 text-slate-450 hover:text-indigo-400 rounded hover:border-indigo-900/40 transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 bg-slate-950 border border-slate-850 text-slate-450 hover:text-rose-500 rounded hover:border-rose-950/40 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{record.purpose}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {/* Legal basis badge */}
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/50">
                            {record.legal_basis}
                          </span>

                          {/* International transfer badge */}
                          {record.cross_border_transfer && (
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-950/40 text-amber-500 border border-amber-900/30">
                              Transferencia Int.
                            </span>
                          )}

                          {/* Sensitive indicator badge */}
                          {hasSensitive && (
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-rose-950/40 text-rose-455 border border-rose-900/30">
                              Datos Sensibles
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-850 space-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Categorías:</span>{' '}
                          <span className="text-slate-300 font-medium">{record.data_categories.join(', ')}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <div>Conservación: <span className="text-slate-350 font-bold">{record.retention_period}</span></div>
                          <div>{new Date(record.created_at).toLocaleDateString('es-CL')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation/Edit Modal Wizard */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center text-left">
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wide">
                  {editingRecord ? 'Confirmar Actividad de Tratamiento' : 'Mapear Actividad de Tratamiento (RoPA)'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Registre los fines y el sustento de licitud de la recolección.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
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
                <span className="text-[10px] text-slate-500 block mt-1">
                  Ej: Liquidación de Sueldos, Campaña de Email Marketing, CCTV.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-0.5">Finalidad y Alcance del Tratamiento *</label>
                <textarea
                  required
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Describa para qué fines específicos se almacenan y procesan estos datos en su organización..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Explique brevemente para qué usa estos datos. La ley prohíbe usarlos para fines distintos a los declarados.
                </span>
              </div>

              {/* Killer Feature: Evidence File Upload + AI Autofill Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Adjuntar Evidencia (Opcional - Pantallazo del software o formulario)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setEvidenceFile(e.target.files[0]);
                        setAnalysisResultMsg('');
                      }
                    }}
                    className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-400 focus:outline-none file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-650 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeEvidence}
                    disabled={isAnalyzing || !evidenceFile}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-950 border border-indigo-900/50 hover:border-indigo-700 text-indigo-400 hover:text-white font-bold text-xs rounded-lg transition-all shadow-md disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-850"
                  >
                    {isAnalyzing ? (
                      <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>Analizar con IA</span>
                      </>
                    )}
                  </button>
                </div>
                {analysisResultMsg && (
                  <span className="text-[10px] text-indigo-400 block mt-1.5 font-medium leading-relaxed">
                    {analysisResultMsg}
                  </span>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-slate-300">Justificación de la base de licitud
                  <textarea value={legalBasisRationale} onChange={e => setLegalBasisRationale(e.target.value)} rows={2} placeholder="Hecho, contrato o norma que sustenta la selección; pendiente de revisión profesional" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs font-semibold text-slate-300">Fundamento del plazo de conservación
                  <textarea value={retentionLegalBasis} onChange={e => setRetentionLegalBasis(e.target.value)} rows={2} placeholder="Obligación, necesidad operativa o criterio documentado" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-slate-300">Sistemas o bases
                  <input value={systems} onChange={e => setSystems(e.target.value)} placeholder="CRM, ERP, planilla de remuneraciones" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs font-semibold text-slate-300">Origen de los datos
                  <input value={dataSources} onChange={e => setDataSources(e.target.value)} placeholder="Titular, formulario web, empleador" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs font-semibold text-slate-300">Categorías de titulares
                  <input value={dataSubjects} onChange={e => setDataSubjects(e.target.value)} placeholder="Clientes, trabajadores, postulantes" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs font-semibold text-slate-300">Destinatarios o proveedores
                  <input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="Contabilidad, proveedor de nube" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-300 block">Método de eliminación o anonimización
                <input value={deletionMethod} onChange={e => setDeletionMethod(e.target.value)} placeholder="Borrado seguro, anonimización o devolución" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-slate-300">Medidas de seguridad
                  <input value={securityMeasures} onChange={e => setSecurityMeasures(e.target.value)} placeholder="Control de acceso, respaldo, cifrado" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
                <label className="text-xs font-semibold text-slate-300">Próxima revisión
                  <input type="date" value={reviewDueAt} onChange={e => setReviewDueAt(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                </label>
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

              {/* Show compliance warning if sensitive categories are selected */}
              {showSecurityWarning && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/40 text-amber-500 text-[10px] rounded-lg flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    <strong>Revisión reforzada:</strong> Esta actividad incluye categorías que pueden requerir condiciones de licitud y medidas de seguridad específicas. La selección debe ser revisada y respaldada con evidencia; no implica por sí sola que el consentimiento sea la base aplicable.
                  </span>
                </div>
              )}

              {/* Toggle for international transfer */}
              <div className="flex items-center justify-between bg-slate-950/30 p-3 rounded-lg border border-slate-855 select-none">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-300 block">Transferencia Internacional de Datos</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">¿Se transfieren estos datos personales a servidores/proveedores en el extranjero?</span>
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

              <div className="space-y-2 bg-slate-950/30 p-3 rounded-lg border border-slate-855">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <input type="checkbox" checked={automatedDecisions} onChange={e => setAutomatedDecisions(e.target.checked)} />
                  Incluye decisiones automatizadas o elaboración de perfiles
                </label>
                {automatedDecisions && (
                  <textarea required value={automatedDecisionDetails} onChange={e => setAutomatedDecisionDetails(e.target.value)} rows={2} placeholder="Describa la lógica general, uso y posibles efectos sobre el titular" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                )}
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
                  {editingRecord ? 'Confirmar y Guardar' : 'Registrar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
