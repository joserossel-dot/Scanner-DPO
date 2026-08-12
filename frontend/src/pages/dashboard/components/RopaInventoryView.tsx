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
  Lock
} from 'lucide-react';

interface RopaRecord {
  id: string;
  process_name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  retention_period: string;
  cross_border_transfer: boolean;
  created_at: string;
}

interface RopaInventoryViewProps {
  token: string | null;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function RopaInventoryView({ token }: RopaInventoryViewProps) {
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

  // Fetch all RoPA records
  const fetchRopa = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/ropa`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRopaList(data);
      } else {
        setErrorMsg('Error al consultar el inventario de actividades (RoPA).');
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
    setEditingRecord(null);
  };

  // Open modal for creation
  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (record: RopaRecord) => {
    setEditingRecord(record);
    setProcessName(record.process_name);
    setPurpose(record.purpose);
    setLegalBasis(record.legal_basis);
    setDataCategories(record.data_categories);
    setRetentionPeriod(record.retention_period);
    setCrossBorderTransfer(record.cross_border_transfer);
    setIsModalOpen(true);
  };

  // Handle submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processName || !purpose || !legalBasis || dataCategories.length === 0 || !retentionPeriod) {
      alert('Por favor complete todos los campos obligatorios del inventario.');
      return;
    }

    const payload = {
      process_name: processName,
      purpose,
      legal_basis: legalBasis,
      data_categories: dataCategories,
      retention_period: retentionPeriod,
      cross_border_transfer: crossBorderTransfer
    };

    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const url = editingRecord 
        ? `${API_BASE}/api/ropa/${editingRecord.id}` 
        : `${API_BASE}/api/ropa`;

      const response = await fetch(url, {
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
      } else {
        const data = await response.json();
        alert(data.error || 'Error al guardar la actividad de tratamiento.');
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
      const response = await fetch(`${API_BASE}/api/ropa/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchRopa();
      } else {
        alert('Error al intentar eliminar la actividad de tratamiento.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el servidor.');
    }
  };

  // Toggle Category Selection
  const handleCategoryToggle = (cat: string) => {
    setDataCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    );
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (ropaList.length === 0) {
      alert('No hay actividades de tratamiento mapeadas para exportar.');
      return;
    }

    const headers = [
      'ID Actividad',
      'Nombre del Proceso',
      'Finalidad del Tratamiento',
      'Base Lícita de Licitud',
      'Categorías de Datos Personales',
      'Plazo de Conservación',
      'Transferencia Internacional',
      'Fecha de Registro'
    ];

    const rows = ropaList.map(item => [
      item.id,
      `"${item.process_name.replace(/"/g, '""')}"`,
      `"${item.purpose.replace(/"/g, '""')}"`,
      item.legal_basis,
      `"${item.data_categories.join(', ')}"`,
      `"${item.retention_period.replace(/"/g, '""')}"`,
      item.cross_border_transfer ? 'SÍ' : 'NO',
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

  return (
    <div className="space-y-6">
      
      {/* Header section with Actions */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="text-left">
          <h1 className="text-xl font-bold text-white tracking-wide">📓 Registro de Actividades de Tratamiento (RoPA - Art. 12)</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestione y mantenga el inventario legalizado de procesamiento de datos personales de la organización.</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 py-2 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-100 font-bold text-xs rounded-xl transition-all shadow-md"
          >
            <Download size={14} />
            <span>Exportar para Auditoría (CSV)</span>
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
          <p className="text-xs text-slate-350 leading-relaxed">
            El RoPA es la columna vertebral de su cumplimiento (Art. 12, Ley N° 21.719). Es un inventario obligatorio donde usted declara qué datos personales recopila su empresa, para qué los usa, dónde los guarda y con quién los comparte. Sin este mapa, es imposible demostrar cumplimiento ante una fiscalización.
          </p>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Consultando inventario RoPA...</div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-450 rounded-xl text-xs">{errorMsg}</div>
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
              <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-2">
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

              <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-2">
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

              <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-950 text-rose-450 rounded-lg border border-slate-850">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ropaList.map(record => {
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
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-rose-950/40 text-rose-450 border border-rose-900/30">
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

      {/* Creation/Edit Modal Wizard */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center text-left">
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wide">
                  {editingRecord ? 'Editar Actividad de Tratamiento' : 'Mapear Actividad de Tratamiento (RoPA)'}
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

              {/* Show compliance warning if sensitive categories are selected */}
              {showSecurityWarning && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/40 text-amber-500 text-[10px] rounded-lg flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    <strong>Atención (Art. 16 bis - Ley N° 21.719):</strong> El tratamiento de datos de salud o biometría exige la aplicación forzosa de medidas de cifrado técnico tanto en reposo como en tránsito, junto con el consentimiento explícito firmado del titular.
                  </span>
                </div>
              )}

              {/* Toggle for international transfer */}
              <div className="flex items-center justify-between bg-slate-950/30 p-3 rounded-lg border border-slate-850 select-none">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-300 block">Transferencia Internacional de Datos</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">¿Se transfieren estos datos personales a servidores/proveedores en el extranjero?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCrossBorderTransfer(!crossBorderTransfer)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                >
                  {editingRecord ? 'Guardar Cambios' : 'Registrar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
