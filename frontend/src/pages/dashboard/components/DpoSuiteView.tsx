import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Inbox, 
  RefreshCw, 
  X, 
  Search,
  FileText
} from 'lucide-react';

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

interface DpoSuiteViewProps {
  token: string | null;
}

interface RiskItem {
  id: string;
  process_name: string;
  identified_risk: string;
  severity: 'Leve' | 'Grave' | 'Gravísima' | string;
  mitigation_control: string;
  status: string;
  created_at?: string;
}

interface WhistleblowerReport {
  id: string;
  incident_description: string;
  reported_date: string;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | string;
}

export default function DpoSuiteView({ token }: DpoSuiteViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'inbox'>('matrix');
  
  // Data lists
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [reports, setReports] = useState<WhistleblowerReport[]>([]);
  
  // State helpers
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newIdentifiedRisk, setNewIdentifiedRisk] = useState('');
  const [newSeverity, setNewSeverity] = useState('Grave');
  const [newMitigationControl, setNewMitigationControl] = useState('');

  // Whistleblower demo creator (for mock compliance testing)
  const [whistleblowerInput, setWhistleblowerInput] = useState('');

  useEffect(() => {
    if (token) {
      fetchRisks();
      fetchReports();
    }
  }, [token]);

  const fetchRisks = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/dpo/risks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRisks(data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al consultar la matriz de riesgos.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dpo/whistleblower`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcessName || !newIdentifiedRisk || !newMitigationControl) return;

    setIsSaving(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/dpo/risks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          process_name: newProcessName,
          identified_risk: newIdentifiedRisk,
          severity: newSeverity,
          mitigation_control: newMitigationControl,
          status: 'IMPLEMENTED'
        })
      });

      if (response.ok) {
        const added = await response.json();
        setRisks([added, ...risks]);
        setIsModalOpen(false);
        triggerToast('Nuevo riesgo agregado y registrado en la matriz.');
        
        // Reset fields
        setNewProcessName('');
        setNewIdentifiedRisk('');
        setNewSeverity('Grave');
        setNewMitigationControl('');
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Error al guardar el riesgo.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión al guardar el riesgo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRisk = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este riesgo de la matriz de cumplimiento?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/dpo/risks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setRisks(risks.filter(r => r.id !== id));
        triggerToast('Riesgo eliminado de la matriz.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error al eliminar el riesgo.');
    }
  };

  const handleUpdateReportStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/dpo/whistleblower/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updated = await response.json();
        setReports(reports.map(r => r.id === id ? updated : r));
        triggerToast(`Denuncia marcada como: ${newStatus}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error al actualizar el estado de la denuncia.');
    }
  };

  const handleCreateMockReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whistleblowerInput.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/dpo/whistleblower`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ incident_description: whistleblowerInput })
      });

      if (response.ok) {
        const added = await response.json();
        setReports([added, ...reports]);
        setWhistleblowerInput('');
        triggerToast('Denuncia simulada registrada en la bandeja.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const getSeverityBadgeColor = (sev: string) => {
    switch (sev) {
      case 'Gravísima':
        return 'bg-rose-950/50 text-rose-400 border-rose-900/50';
      case 'Grave':
        return 'bg-amber-950/50 text-amber-400 border-amber-900/50';
      case 'Leve':
      default:
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50';
    }
  };

  const getReportStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50';
      case 'INVESTIGATING':
        return 'bg-sky-950/50 text-sky-400 border-sky-900/50';
      case 'PENDING':
      default:
        return 'bg-amber-950/50 text-amber-400 border-amber-900/50';
    }
  };

  const getReportStatusLabel = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'Resuelto';
      case 'INVESTIGATING': return 'Investigando';
      case 'PENDING':
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="space-y-6 relative text-left">
      
      {/* Local floating toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 bg-indigo-650 border border-indigo-500 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-pulse">
          <Shield size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main header block */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', borderRadius: '8px' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>DPO Command Center</h3>
                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full border border-amber-400 shadow-sm tracking-wide">
                  Enterprise
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Gestione el modelo de prevención de infracciones de su organización de acuerdo con el Art. 49 de la Ley N° 21.719.
              </p>
            </div>
          </div>
          
          {/* Sub-navigation tabs */}
          <div style={{ display: 'flex', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px' }}>
            <button 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveSubTab('matrix')}
            >
              Matriz de Riesgos (Art. 49-d)
            </button>
            <button 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'inbox' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveSubTab('inbox')}
            >
              Canal de Denuncias (Art. 49-f)
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '10px' }}>
          <RefreshCw className="loader w-8 h-8 text-indigo-500" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cargando centro de control...</span>
        </div>
      ) : (
        <>
          {/* Tab 1: Matriz de Riesgos */}
          {activeSubTab === 'matrix' && (
            <div className="card space-y-4" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                    Mapa e Historial de Controles de Riesgos
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Visualización integrada de riesgos de privacidad asociados a procesos corporativos.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-white text-[11px] transition-all shadow-md shadow-indigo-600/10"
                >
                  <Plus size={13} />
                  <span>Añadir Nuevo Riesgo</span>
                </button>
              </div>

              {/* DataGrid Risk Matrix */}
              <div className="overflow-x-auto" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table className="min-w-full divide-y divide-slate-800 text-left">
                  <thead className="bg-[#0c0c16]">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proceso</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Riesgo Identificado</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severidad</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medida de Control / Mitigación</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/10">
                    {risks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-bold text-white whitespace-nowrap">{item.process_name}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-300 max-w-xs truncate" title={item.identified_risk}>
                          {item.identified_risk}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-block border text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityBadgeColor(item.severity)}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 max-w-sm truncate" title={item.mitigation_control}>
                          {item.mitigation_control}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            item.status === 'IMPLEMENTED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'IMPLEMENTED' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                            {item.status === 'IMPLEMENTED' ? 'Mitigado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-slate-500">
                          <button
                            onClick={() => handleDeleteRisk(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Eliminar de la matriz"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {risks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                          No existen riesgos registrados en la matriz para esta organización. Presione "Añadir Nuevo Riesgo" para inicializar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Canal de Denuncias */}
          {activeSubTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Inbox List */}
              <div className="lg:col-span-8 card space-y-4" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={16} className="text-indigo-400" />
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                    Bandeja de Entrada de Incidencias Internas
                  </h4>
                </div>

                <div className="space-y-3">
                  {reports.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl space-y-3 transition-all"
                    >
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {item.id} • Recibido: {new Date(item.reported_date).toLocaleDateString('es-CL')}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className={`inline-block border text-[10px] font-bold px-2 py-0.5 rounded-full ${getReportStatusBadgeColor(item.status)}`}>
                            {getReportStatusLabel(item.status)}
                          </span>
                          
                          <select
                            className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                            value={item.status}
                            onChange={(e) => handleUpdateReportStatus(item.id, e.target.value)}
                          >
                            <option value="PENDING">Pendiente</option>
                            <option value="INVESTIGATING">Investigando</option>
                            <option value="RESOLVED">Resuelto</option>
                          </select>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, textAlign: 'justify' }}>
                        {item.incident_description}
                      </p>
                    </div>
                  ))}

                  {reports.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Bandeja vacía. No existen denuncias registradas para resolver en esta organización.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Whistleblower Simulator Wizard */}
              <div className="lg:col-span-4 card space-y-4" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} className="text-amber-500 animate-pulse" />
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                    Simulador del Canal (Auditoría)
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Para validar el correcto aislamiento y el tiempo de respuesta del DPO, registre denuncias ficticias desde este panel de auditoría GAP.
                </p>

                <form onSubmit={handleCreateMockReport} className="space-y-3.5">
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Descripción del Incidente / Brecha Interna</label>
                    <textarea
                      className="input-text"
                      style={{ width: '100%', fontSize: '11.5px', padding: '8px' }}
                      rows={4}
                      placeholder="ej. Se detectó el envío de una base de correos de clientes a un proveedor externo sin firmar DPA previo..."
                      value={whistleblowerInput}
                      onChange={e => setWhistleblowerInput(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Registrar Denuncia en Inbox
                  </button>
                </form>
              </div>

            </div>
          )}
        </>
      )}

      {/* MODAL: ADD NEW RISK MATRIX ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="card max-w-lg w-full p-0 overflow-hidden shadow-2xl border border-slate-850">
            
            {/* Modal header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/30">
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                Añadir Riesgo a la Matriz
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddRisk}>
              <div className="p-5 space-y-4 text-left">
                
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Proceso Asociado</label>
                  <input
                    type="text"
                    className="input-text"
                    style={{ width: '100%', fontSize: '12px' }}
                    placeholder="ej. Marketing, Ventas, Recursos Humanos"
                    value={newProcessName}
                    onChange={e => setNewProcessName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Riesgo de Infracción Identificado</label>
                  <textarea
                    className="input-text"
                    style={{ width: '100%', fontSize: '12px' }}
                    rows={2}
                    placeholder="ej. Almacenamiento de logs de comportamiento web sin cifrado..."
                    value={newIdentifiedRisk}
                    onChange={e => setNewIdentifiedRisk(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Severidad del Riesgo</label>
                  <select
                    className="input-text"
                    style={{ width: '100%', fontSize: '12px', background: '#09090b' }}
                    value={newSeverity}
                    onChange={e => setNewSeverity(e.target.value)}
                  >
                    <option value="Leve">Leve (Amonestación o hasta 5.000 UTA)</option>
                    <option value="Grave">Grave (Multas hasta 10.000 UTA)</option>
                    <option value="Gravísima">Gravísima (Multas hasta 20.000 UTA / 4% ingresos)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Medida de Control / Mitigación Implementada</label>
                  <textarea
                    className="input-text"
                    style={{ width: '100%', fontSize: '12px' }}
                    rows={2}
                    placeholder="ej. Inyección del CMP para gestionar la aceptación activa de cookies..."
                    value={newMitigationControl}
                    onChange={e => setNewMitigationControl(e.target.value)}
                    required
                  />
                </div>

              </div>

              {/* Modal footer actions */}
              <div className="p-5 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg text-slate-400 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs rounded-lg transition-all shadow-md"
                >
                  {isSaving ? 'Guardando...' : 'Registrar en la Matriz'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
