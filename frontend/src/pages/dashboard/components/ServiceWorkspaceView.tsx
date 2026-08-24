import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle, ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react';
import { API_BASE, getApiError } from '../../../lib/api';
import { authFetch } from '../../../lib/authFetch';

interface Workspace {
  engagement: any | null;
  eligibility: any | null;
  taskStats: Array<{ status: string; count: number }>;
  nextTasks: any[];
  periodicReviews: any[];
  contacts: any[];
}

const riskOptions = [
  ['biometrics', 'Utiliza biometría para identificar o controlar acceso'],
  ['largeScaleSensitiveData', 'Trata datos sensibles a gran escala'],
  ['systematicMinorsData', 'Trata sistemáticamente datos de menores'],
  ['intensiveProfiling', 'Realiza perfilamiento intensivo'],
  ['highImpactAutomatedDecisions', 'Adopta decisiones automatizadas de alto impacto'],
  ['systematicLargeScaleMonitoring', 'Realiza monitoreo sistemático a gran escala'],
  ['activeRegulatoryProceeding', 'Mantiene un procedimiento regulatorio activo']
];

export default function ServiceWorkspaceView() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [employeeCount, setEmployeeCount] = useState(20);
  const [industry, setIndustry] = useState('RETAIL');
  const [operatesInChile, setOperatesInChile] = useState(true);
  const [riskFactors, setRiskFactors] = useState<Record<string, boolean>>({});

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/workspace`);
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible cargar el expediente.'));
      setWorkspace(await response.json());
    } catch (cause: any) {
      setError(cause.message || 'No fue posible cargar el expediente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const submitEligibility = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_count: employeeCount,
          operates_in_chile: operatesInChile,
          industries: [industry],
          risk_factors: riskFactors
        })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible evaluar la admisibilidad.'));
      await loadWorkspace();
    } catch (cause: any) {
      setError(cause.message || 'No fue posible evaluar la admisibilidad.');
    } finally {
      setSaving(false);
    }
  };

  const reviewEligibility = async (professionalStatus: 'APPROVED' | 'CHANGES_REQUESTED') => {
    if (!workspace?.eligibility?.id) return;
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/eligibility/${workspace.eligibility.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professional_status: professionalStatus })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible registrar la revisión.'));
      await loadWorkspace();
    } catch (cause: any) {
      setError(cause.message || 'No fue posible registrar la revisión.');
    } finally {
      setSaving(false);
    }
  };

  const activateEngagement = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/engagement/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_on: new Date().toISOString().slice(0, 10) })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible activar el servicio.'));
      await loadWorkspace();
    } catch (cause: any) {
      setError(cause.message || 'No fue posible activar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (taskId: string, status: string) => {
    setSaving(true);
    try {
      const response = await authFetch(`${API_BASE}/api/service/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible actualizar la tarea.'));
      await loadWorkspace();
    } catch (cause: any) {
      setError(cause.message || 'No fue posible actualizar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card"><RefreshCw className="loader" size={18} /> Cargando expediente...</div>;

  const eligibility = workspace?.eligibility;
  const engagement = workspace?.engagement;
  const canActivate = engagement?.status === 'ACCEPTED' && eligibility?.professional_status === 'APPROVED';
  const active = engagement && !['ELIGIBILITY_REVIEW', 'ACCEPTED', 'SPECIAL_ASSESSMENT', 'REJECTED', 'CLOSED'].includes(engagement.status);

  return (
    <div className="text-left">
      <header className="page-header">
        <h1 className="page-title">Expediente de implementación y administración</h1>
        <p className="page-subtitle">Admisibilidad, revisión profesional, tareas y calendario del servicio por 12 meses.</p>
      </header>

      {error && <div className="card" style={{ borderColor: '#ef4444', color: '#fca5a5', marginBottom: 16 }}>{error}</div>}

      <div className="dashboard-grid">
        <section className="card col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Estado del servicio</h3>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{engagement?.status || 'SIN EVALUACIÓN'}</div>
              {engagement?.starts_on && <p>Vigencia: {engagement.starts_on} a {engagement.ends_on}</p>}
            </div>
            <button className="btn-action" onClick={() => void loadWorkspace()}><RefreshCw size={14} /> Actualizar</button>
          </div>
        </section>

        {!active && (
          <section className="card col-12">
            <h3>1. Evaluación de admisibilidad</h3>
            <p style={{ color: 'var(--text-secondary)' }}>El resultado es un triage preliminar y requiere revisión profesional antes de activar el servicio.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <label>Número de trabajadores
                <input className="form-input" type="number" min={0} value={employeeCount} onChange={event => setEmployeeCount(Number(event.target.value))} />
              </label>
              <label>Industria
                <select className="form-input" value={industry} onChange={event => setIndustry(event.target.value)}>
                  <option value="RETAIL">Comercio</option><option value="PROFESSIONAL_SERVICES">Servicios profesionales</option>
                  <option value="TECHNOLOGY">Tecnología</option><option value="MANUFACTURING">Manufactura</option>
                  <option value="HEALTHCARE">Salud</option><option value="EDUCATION_MINORS">Educación con menores</option>
                  <option value="BANKING">Banca</option><option value="FINANCIAL_SERVICES">Servicios financieros</option>
                  <option value="INSURANCE">Seguros</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={operatesInChile} onChange={event => setOperatesInChile(event.target.checked)} /> Opera principalmente en Chile
              </label>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              {riskOptions.map(([key, label]) => <label key={key} style={{ display: 'flex', gap: 8 }}>
                <input type="checkbox" checked={riskFactors[key] === true} onChange={event => setRiskFactors(current => ({ ...current, [key]: event.target.checked }))} /> {label}
              </label>)}
            </div>
            <button className="btn-save" disabled={saving} onClick={submitEligibility} style={{ marginTop: 18 }}>Evaluar admisibilidad</button>

            {eligibility && <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--border-color)', borderRadius: 8 }}>
              <h4 style={{ marginTop: 0 }}>Resultado: {eligibility.decision}</h4>
              <ul>{(eligibility.reasons || []).map((reason: string) => <li key={reason}>{reason}</li>)}</ul>
              <p>Revisión profesional: <strong>{eligibility.professional_status}</strong></p>
              {eligibility.professional_status === 'PENDING' && <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-save" disabled={saving} onClick={() => reviewEligibility('APPROVED')}><ShieldCheck size={14} /> Aprobar revisión</button>
                <button className="btn-action" disabled={saving} onClick={() => reviewEligibility('CHANGES_REQUESTED')}><AlertTriangle size={14} /> Solicitar cambios</button>
              </div>}
            </div>}
            {canActivate && <button className="btn-save" disabled={saving} onClick={activateEngagement} style={{ marginTop: 16 }}><CheckCircle size={14} /> Activar implementación de 12 meses</button>}
          </section>
        )}

        {active && <>
          <section className="card col-12">
            <h3><ClipboardList size={17} /> Próximas tareas</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {(workspace?.nextTasks || []).map(task => <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <div><strong>{task.activity_code ? `${task.activity_code}. ` : ''}{task.title}</strong><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.status} | vence {task.due_date || 'sin fecha'}</div></div>
                {task.status !== 'COMPLETED' && <button className="btn-action" disabled={saving} onClick={() => updateTask(task.id, 'COMPLETED')}>Completar</button>}
              </div>)}
            </div>
          </section>
          <section className="card col-12">
            <h3><CalendarDays size={17} /> Calendario de revisiones</h3>
            <p>{workspace?.periodicReviews?.length || 0} revisiones programadas entre controles mensuales, trimestrales y anuales.</p>
          </section>
        </>}
      </div>
    </div>
  );
}
