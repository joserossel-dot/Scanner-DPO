import React, { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface Tenant {
  id: string;
  email: string;
  role: string;
  subscription_plan?: string;
  subscription_status?: string;
  created_at: string;
}

interface AdminDashboardViewProps {
  token: string | null;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function AdminDashboardView({ token }: AdminDashboardViewProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTenantsList = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/admin/tenants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Error al recuperar el listado de empresas registradas.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al consultar el panel de superadministrador.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsList();
  }, [token]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Shield size={22} className="text-amber-500 animate-pulse" />
            <span>Superadmin Dashboard (God Mode)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Control de inquilinos, monitoreo normativo general y planes de suscripción activos.</p>
        </div>

        <button
          onClick={fetchTenantsList}
          disabled={isLoading}
          className="flex items-center gap-2 py-2 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-100 font-bold text-xs rounded-xl transition-all shadow-md disabled:bg-slate-950 disabled:text-slate-600"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refrescar Lista</span>
        </button>
      </header>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Total Inquilinos</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{tenants.length}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <CreditCard size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Planes Pro / Enterprise</span>
            <span className="text-xl font-extrabold text-white mt-1 block">
              {tenants.filter(t => t.subscription_plan?.toLowerCase() !== 'free').length}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Licencias Activas</span>
            <span className="text-xl font-extrabold text-white mt-1 block">
              {tenants.filter(t => t.subscription_status?.toLowerCase() === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tenant Table */}
      {errorMsg ? (
        <div className="mb-4 p-4 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs rounded-xl flex items-start gap-2.5 text-left">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      ) : (
        <div className="card col-12 text-left" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: 600 }}>Inquilinos y Empresas Registradas</h3>
          
          {isLoading && tenants.length === 0 ? (
            <p className="text-slate-500 text-xs py-6 text-center">Recuperando registros normativos...</p>
          ) : tenants.length === 0 ? (
            <p className="text-slate-500 text-xs py-6 text-center">No hay empresas registradas en el sistema actualmente.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="transfers-table">
                <thead>
                  <tr>
                    <th>Email Inquilino</th>
                    <th>ID de Cuenta</th>
                    <th>Rol</th>
                    <th>Plan Suscripción</th>
                    <th>Estado de Cuenta</th>
                    <th>Fecha de Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/10">
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{t.email}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{t.id}</td>
                      <td>
                        <span className={`badge ${t.role === 'superadmin' ? 'badge-success' : 'badge-leve'}`}>
                          {t.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: '12px' }}>{t.subscription_plan || 'Pro'}</td>
                      <td>
                        <span className={`badge ${(t.subscription_status || 'active').toLowerCase() === 'active' ? 'badge-success' : 'badge-grave'}`}>
                          {t.subscription_status || 'Active'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {new Date(t.created_at).toLocaleDateString('es-CL')} {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
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
  );
}
