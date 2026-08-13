import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  CreditCard, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Edit3, 
  MessageSquare, 
  Calendar, 
  Globe, 
  Award,
  CheckCircle2
} from 'lucide-react';

interface Lead {
  id: string;
  domain: string;
  email: string;
  score_detected: number;
  status: 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CLOSED' | 'LOST';
  sales_notes: string;
  created_at: string;
}

interface Tenant {
  id: string;
  email: string;
  company_name: string;
  role: string;
  subscription_plan?: string;
  subscription_status?: string;
  created_at: string;
  sales_notes: string;
  sales_status: 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CLOSED' | 'LOST';
  confirmed_ropa_count?: number;
  last_diagnostic_score?: number | null;
}

interface AdminDashboardViewProps {
  token: string | null;
}

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

export default function AdminDashboardView({ token }: AdminDashboardViewProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'tenants'>('leads');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State for Editing Lead CRM
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadStatus, setLeadStatus] = useState<string>('NEW');
  const [leadNotes, setLeadNotes] = useState<string>('');

  // Modal State for Editing Tenant CRM
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string>('NEW');
  const [tenantNotes, setTenantNotes] = useState<string>('');

  const fetchCRMData = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Tenants
      const tenantsRes = await fetch(`${API_BASE}/api/admin/tenants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData);
      } else {
        const errData = await tenantsRes.json();
        setErrorMsg(errData.error || 'Error al obtener inquilinos.');
      }

      // 2. Fetch Leads
      const leadsRes = await fetch(`${API_BASE}/api/admin/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al consultar los paneles de CRM superadmin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData();
  }, [token]);

  // Update Lead CRM
  const handleUpdateLeadCRM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !token) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: leadStatus,
          sales_notes: leadNotes
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ...updated } : l));
        setSelectedLead(null);
      } else {
        alert('Error al actualizar el prospecto.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Tenant CRM
  const handleUpdateTenantCRM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !token) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sales_status: tenantStatus,
          sales_notes: tenantNotes
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, ...updated } : t));
        setSelectedTenant(null);
      } else {
        alert('Error al actualizar la organización.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'CLOSED':
        return 'bg-emerald-950 text-emerald-400 border border-emerald-900/30';
      case 'IN_PROGRESS':
        return 'bg-indigo-950 text-indigo-400 border border-indigo-900/30';
      case 'CONTACTED':
        return 'bg-amber-950 text-amber-400 border border-amber-900/30';
      case 'LOST':
        return 'bg-slate-900 text-slate-500 border border-slate-800';
      default:
        return 'bg-blue-950 text-blue-400 border border-blue-900/30';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Shield size={22} className="text-amber-500 animate-pulse" />
            <span>Superadmin CRM & Ventas (God Mode)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de oportunidades del embudo comercial, notas de seguimiento e inquilinos corporativos.</p>
        </div>

        <button
          onClick={fetchCRMData}
          disabled={isLoading}
          className="flex items-center gap-2 py-2 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-100 font-bold text-xs rounded-xl transition-all shadow-md disabled:bg-slate-950 disabled:text-slate-600"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refrescar CRM</span>
        </button>
      </header>

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-4.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">Inquilinos Registrados</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">{tenants.length}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-4.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Globe size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">Prospectos Libres (Leads)</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">{leads.length}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-4.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">Cierres Exitosos (WON)</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">
              {leads.filter(l => l.status === 'CLOSED').length + tenants.filter(t => t.sales_status === 'CLOSED').length}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-4.5">
          <div className="p-2.5 bg-rose-500/10 text-rose-455 border border-rose-500/20 rounded-xl">
            <CreditCard size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">Inquilinos en Plan Activo</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">
              {tenants.filter(t => t.subscription_status === 'Active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          className="btn-action" 
          style={{ 
            background: activeSubTab === 'leads' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'leads' ? 'white' : 'var(--text-secondary)',
            border: activeSubTab === 'leads' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
          }}
          onClick={() => setActiveSubTab('leads')}
        >
          👤 Prospectos (Embudo Gratuito)
        </button>
        <button 
          className="btn-action" 
          style={{ 
            background: activeSubTab === 'tenants' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'tenants' ? 'white' : 'var(--text-secondary)',
            border: activeSubTab === 'tenants' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
          }}
          onClick={() => setActiveSubTab('tenants')}
        >
          🏢 Inquilinos Registrados (Tenants)
        </button>
      </div>

      {/* Table block */}
      {errorMsg ? (
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs rounded-xl flex items-start gap-2.5 text-left">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      ) : (
        <div className="card col-12 text-left" style={{ padding: '20px' }}>
          
          {/* TAB 1: Leads */}
          {activeSubTab === 'leads' && (
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Prospectos del Escáner Gratuito</h3>
              {isLoading && leads.length === 0 ? (
                <p className="text-slate-500 text-xs py-6 text-center">Cargando prospectos...</p>
              ) : leads.length === 0 ? (
                <p className="text-slate-500 text-xs py-6 text-center">No hay prospectos registrados aún.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="transfers-table">
                    <thead>
                      <tr>
                        <th>Dominio</th>
                        <th>Email de Contacto</th>
                        <th>Score Detectado</th>
                        <th>Estado Comercial</th>
                        <th>Notas de Seguimiento</th>
                        <th>Fecha de Captación</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-900/10">
                          <td style={{ fontWeight: 600, fontSize: '13px' }}>{l.domain}</td>
                          <td style={{ fontSize: '12.5px' }}>{l.email}</td>
                          <td style={{ fontWeight: 700, fontSize: '12px', color: l.score_detected < 50 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                            {l.score_detected}% Score
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(l.status)}`}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.sales_notes || <span className="italic text-slate-600">Sin notas registradas</span>}
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {new Date(l.created_at).toLocaleDateString('es-CL')}
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedLead(l);
                                setLeadStatus(l.status);
                                setLeadNotes(l.sales_notes || '');
                              }}
                              className="btn-action"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', itemsCenter: 'center', gap: '4px' }}
                            >
                              <Edit3 size={11} />
                              <span>Seguimiento</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Tenants */}
          {activeSubTab === 'tenants' && (
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Empresas e Inquilinos Registrados</h3>
              {isLoading && tenants.length === 0 ? (
                <p className="text-slate-500 text-xs py-6 text-center">Cargando inquilinos...</p>
              ) : tenants.length === 0 ? (
                <p className="text-slate-500 text-xs py-6 text-center">No hay inquilinos registrados.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="transfers-table">
                    <thead>
                      <tr>
                        <th>Email / Organización</th>
                        <th>Plan / Suscripción</th>
                        <th>Estado Cuenta</th>
                        <th>RoPA Confirmado</th>
                        <th>Último Diagnóstico</th>
                        <th>Estado Ventas</th>
                        <th>Notas de CRM</th>
                        <th>Registro</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/10">
                          <td style={{ fontWeight: 600, fontSize: '12.5px' }}>
                            <div className="flex flex-col">
                              <span className="text-white">{t.company_name}</span>
                              <span className="text-[10px] text-slate-500">{t.email}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 500, fontSize: '12px' }}>{t.subscription_plan || 'Pro'}</td>
                          <td>
                            <span className={`badge ${(t.subscription_status || 'active').toLowerCase() === 'active' ? 'badge-success' : 'badge-grave'}`}>
                              {t.subscription_status || 'Active'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 650, color: t.confirmed_ropa_count && t.confirmed_ropa_count > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                            {t.confirmed_ropa_count && t.confirmed_ropa_count > 0 ? `✅ ${t.confirmed_ropa_count} procesos` : '❌ Pendiente'}
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 700 }}>
                            {t.last_diagnostic_score !== null && t.last_diagnostic_score !== undefined 
                              ? `${t.last_diagnostic_score}%` 
                              : <span className="text-slate-600 font-normal italic">Sin evaluación</span>}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(t.sales_status)}`}>
                              {t.sales_status || 'NEW'}
                            </span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.sales_notes || <span className="italic text-slate-600">Sin notas registradas</span>}
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {new Date(t.created_at).toLocaleDateString('es-CL')}
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedTenant(t);
                                setTenantStatus(t.sales_status || 'NEW');
                                setTenantNotes(t.sales_notes || '');
                              }}
                              className="btn-action"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', itemsCenter: 'center', gap: '4px' }}
                            >
                              <Edit3 size={11} />
                              <span>Seguimiento</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* LEAD EDIT MODAL */}
      {selectedLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '20px', textAlign: 'left' }}>
            <h3 className="text-base font-bold text-white mb-2">Seguimiento de Lead (Prospecto)</h3>
            <p className="text-xs text-slate-400 mb-4">Dominio: <span className="font-mono text-indigo-400">{selectedLead.domain}</span> ({selectedLead.email})</p>
            
            <form onSubmit={handleUpdateLeadCRM} className="space-y-4">
              <div>
                <label className="form-label">Estado Comercial</label>
                <select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="input-text"
                  style={{ width: '100%', background: '#0a0a14' }}
                >
                  <option value="NEW">Nuevo (NEW)</option>
                  <option value="CONTACTED">Contactado (CONTACTED)</option>
                  <option value="IN_PROGRESS">En Progreso (IN_PROGRESS)</option>
                  <option value="CLOSED">Cerrado / Convertido (CLOSED)</option>
                  <option value="LOST">Perdido (LOST)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Notas de Ventas / CRM</label>
                <textarea
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="input-text"
                  style={{ width: '100%', minHeight: '120px' }}
                  placeholder="Ingrese el historial de llamadas, correos o acuerdos..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  className="btn-action" 
                  onClick={() => setSelectedLead(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-save"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TENANT EDIT MODAL */}
      {selectedTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '20px', textAlign: 'left' }}>
            <h3 className="text-base font-bold text-white mb-2">Seguimiento Comercial de Inquilino</h3>
            <p className="text-xs text-slate-400 mb-4">Empresa: <span className="font-bold text-indigo-400">{selectedTenant.company_name}</span> ({selectedTenant.email})</p>
            
            <form onSubmit={handleUpdateTenantCRM} className="space-y-4">
              <div>
                <label className="form-label">Estado Comercial (CRM)</label>
                <select
                  value={tenantStatus}
                  onChange={(e) => setTenantStatus(e.target.value)}
                  className="input-text"
                  style={{ width: '100%', background: '#0a0a14' }}
                >
                  <option value="NEW">Nuevo (NEW)</option>
                  <option value="CONTACTED">Contactado (CONTACTED)</option>
                  <option value="IN_PROGRESS">En Negociación (IN_PROGRESS)</option>
                  <option value="CLOSED">Cliente Cerrado /WON (CLOSED)</option>
                  <option value="LOST">Perdido / Churn (LOST)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Notas de CRM</label>
                <textarea
                  value={tenantNotes}
                  onChange={(e) => setTenantNotes(e.target.value)}
                  className="input-text"
                  style={{ width: '100%', minHeight: '120px' }}
                  placeholder="Ingrese detalles sobre el plan acordado, facturas o soporte comercial..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  className="btn-action" 
                  onClick={() => setSelectedTenant(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-save"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
