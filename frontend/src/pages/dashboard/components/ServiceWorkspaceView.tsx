import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle, ClipboardList, Download, FileText, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import { API_BASE, getApiError } from '../../../lib/api';
import { authFetch } from '../../../lib/authFetch';
import { complianceTrafficLight } from '../../../lib/complianceTrafficLight';

interface Workspace {
  permissions: string[];
  organization: any | null;
  engagement: any | null;
  eligibility: any | null;
  taskStats: Array<{ status: string; count: number }>;
  nextTasks: any[];
  periodicReviews: any[];
  contacts: any[];
  readiness: any;
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [arcoRequests, setArcoRequests] = useState<any[]>([]);
  const [legalName, setLegalName] = useState('');
  const [taxIdentifier, setTaxIdentifier] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [arcoDrafts, setArcoDrafts] = useState<Record<number, { analysis: string; response: string; channel: string }>>({});

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [workspaceResponse, documentsResponse, arcoResponse, deliverablesResponse] = await Promise.all([
        authFetch(`${API_BASE}/api/service/workspace`),
        authFetch(`${API_BASE}/api/service/documents`),
        authFetch(`${API_BASE}/api/service/arco`),
        authFetch(`${API_BASE}/api/service/deliverables/readiness`)
      ]);
      if (!workspaceResponse.ok) throw new Error(await getApiError(workspaceResponse, 'No fue posible cargar el expediente.'));
      const workspaceData = await workspaceResponse.json();
      setWorkspace(workspaceData);
      setLegalName(workspaceData.organization?.legal_name || workspaceData.organization?.name || '');
      setTaxIdentifier(workspaceData.organization?.tax_identifier || '');
      setEmployeeCount(workspaceData.eligibility?.employee_count ?? 20);
      setIndustry(workspaceData.eligibility?.industries?.[0] || 'RETAIL');
      setOperatesInChile(workspaceData.eligibility?.operates_in_chile ?? true);
      setRiskFactors(workspaceData.eligibility?.risk_factors || {});
      setContactName(workspaceData.contacts?.[0]?.full_name || '');
      setContactEmail(workspaceData.contacts?.[0]?.email || '');
      setDocuments(documentsResponse.ok ? await documentsResponse.json() : []);
      setArcoRequests(arcoResponse.ok ? await arcoResponse.json() : []);
      setDeliverables(deliverablesResponse.ok ? (await deliverablesResponse.json()).deliverables : []);
    } catch (cause: any) {
      setError(cause.message || 'No fue posible cargar el expediente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOrganizationProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const profileResponse = await authFetch(`${API_BASE}/api/service/organization`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legal_name: legalName, tax_identifier: taxIdentifier })
      });
      if (!profileResponse.ok) throw new Error(await getApiError(profileResponse, 'No fue posible guardar la empresa.'));
      if (!workspace?.contacts?.length && contactName && contactEmail) {
        const contactResponse = await authFetch(`${API_BASE}/api/service/contacts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: contactName, email: contactEmail, responsibility: 'CLIENT_REPRESENTATIVE', is_primary: true })
        });
        if (!contactResponse.ok) throw new Error(await getApiError(contactResponse, 'No fue posible guardar el responsable.'));
      }
      await loadWorkspace();
    } catch (cause: any) {
      setError(cause.message || 'No fue posible guardar la ficha empresarial.');
    } finally {
      setSaving(false);
    }
  };

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

  const generateDocument = async (documentType: string) => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/documents/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: documentType })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible generar el documento.'));
      await loadWorkspace();
    } catch (cause: any) { setError(cause.message || 'No fue posible generar el documento.'); }
    finally { setSaving(false); }
  };

  const reviewDocument = async (documentId: string, decision: string) => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/documents/${documentId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible revisar el documento.'));
      await loadWorkspace();
    } catch (cause: any) { setError(cause.message || 'No fue posible revisar el documento.'); }
    finally { setSaving(false); }
  };

  const downloadDocument = async (document: any) => {
    const response = await authFetch(`${API_BASE}/api/documents/${document.id}/version/${document.version_number}`);
    if (!response.ok) return setError(await getApiError(response, 'No fue posible descargar el documento.'));
    const payload = await response.json();
    const blob = new Blob([payload.version.content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url; anchor.download = `${document.document_type}-v${document.version_number}.html`; anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateArco = async (id: number, body: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/service/arco/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible actualizar la solicitud ARCO+.'));
      await loadWorkspace();
    } catch (cause: any) { setError(cause.message || 'No fue posible actualizar la solicitud ARCO+.'); }
    finally { setSaving(false); }
  };

  const arcoDraft = (request: any) => arcoDrafts[request.id] || {
    analysis: request.analysis_notes || '', response: request.response_content || '', channel: request.response_channel || 'EMAIL'
  };
  const setArcoDraft = (request: any, field: 'analysis' | 'response' | 'channel', value: string) => {
    setArcoDrafts(current => ({ ...current, [request.id]: { ...arcoDraft(request), [field]: value } }));
  };

  if (loading) return <div className="card"><RefreshCw className="loader" size={18} /> Cargando expediente...</div>;

  const eligibility = workspace?.eligibility;
  const eligibilityLabels: Record<string, string> = {
    STANDARD: 'Paquete estándar',
    STANDARD_WITH_ADDON: 'Paquete estándar con actividades adicionales',
    SPECIAL_ASSESSMENT: 'Evaluación y cotización separada'
  };
  const engagement = workspace?.engagement;
  const canActivate = engagement?.status === 'ACCEPTED' && eligibility?.professional_status === 'APPROVED';
  const canReview = workspace?.permissions?.includes('service.review') === true;
  const active = engagement && !['ELIGIBILITY_REVIEW', 'ACCEPTED', 'SPECIAL_ASSESSMENT', 'REJECTED', 'CLOSED'].includes(engagement.status);
  const readinessChecks = [
    ['Identidad legal confirmada', Boolean(workspace?.organization?.legal_name && workspace?.organization?.tax_identifier)],
    ['Responsable principal designado', (workspace?.contacts?.length || 0) > 0],
    ['Admisibilidad evaluada', Boolean(workspace?.eligibility)],
    ['Sitio web escaneado', workspace?.readiness?.has_web_scan === true],
    ['Cuestionario interno guardado', workspace?.readiness?.has_questionnaire === true],
    ['Inventario RoPA confirmado', workspace?.readiness?.has_confirmed_ropa === true],
    ['Matriz de riesgos iniciada', workspace?.readiness?.has_risk_assessment === true],
    ['Controles evaluados', workspace?.readiness?.has_control_assessment === true],
    ['Paquete documental aprobado', Number(workspace?.readiness?.approved_documents || 0) >= 4]
  ] as Array<[string, boolean]>;
  const readinessScore = Math.round((readinessChecks.filter(([, complete]) => complete).length / readinessChecks.length) * 100);
  const readinessLight = complianceTrafficLight(readinessScore);

  return (
    <div className="text-left">
      <header className="page-header">
        <h1 className="page-title">Expediente de implementación y administración</h1>
        <p className="page-subtitle">Admisibilidad, revisión profesional, tareas y calendario del servicio por 12 meses.</p>
      </header>

      {error && <div className="card" style={{ borderColor: '#ef4444', color: '#fca5a5', marginBottom: 16 }}>{error}</div>}

      <div className="dashboard-grid">
        <section className="card col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><h3 style={{ margin: 0 }}>Cobertura verificable del expediente</h3><p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Mide antecedentes y evidencias disponibles. No equivale por sí solo a una conclusión jurídica de cumplimiento.</p></div>
            <div style={{ fontSize: 30, fontWeight: 900, color: readinessLight === 'green' ? 'var(--color-success)' : readinessLight === 'red' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{readinessScore}%</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8, marginTop: 16 }}>
            {readinessChecks.map(([label, complete]) => <div key={label} style={{ padding: 10, borderRadius: 8, border: `1px solid ${complete ? 'rgba(16,185,129,.35)' : 'rgba(245,158,11,.35)'}`, color: complete ? '#6ee7b7' : '#fcd34d' }}>{complete ? 'Completo' : 'Pendiente'}: {label}</div>)}
          </div>
        </section>
        <section className="card col-12">
          <h3>0. Ficha empresarial reutilizable</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Estos datos alimentan el expediente, responsables y documentos generados. Use información confirmada antes de aprobar entregables.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <label>Razón social<input className="form-input" value={legalName} onChange={event => setLegalName(event.target.value)} /></label>
            <label>RUT u otro identificador<input className="form-input" value={taxIdentifier} onChange={event => setTaxIdentifier(event.target.value)} placeholder="Ej. 76.123.456-7" /></label>
            <label>Responsable principal<input className="form-input" value={contactName} disabled={(workspace?.contacts?.length || 0) > 0} onChange={event => setContactName(event.target.value)} /></label>
            <label>Correo del responsable<input className="form-input" type="email" value={contactEmail} disabled={(workspace?.contacts?.length || 0) > 0} onChange={event => setContactEmail(event.target.value)} /></label>
          </div>
          <button className="btn-save" disabled={saving || !legalName} onClick={saveOrganizationProfile} style={{ marginTop: 16 }}>Guardar ficha empresarial</button>
        </section>
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
              <h4 style={{ marginTop: 0 }}>Alcance estimado: {eligibilityLabels[eligibility.decision] || eligibility.decision}</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Este indicador no rechaza a la organización. Define si el paquete base es suficiente o si deben evaluarse desarrollos, integraciones o asesorías adicionales.</p>
              <ul>{(eligibility.reasons || []).map((reason: string) => <li key={reason}>{reason}</li>)}</ul>
              <p>Revisión profesional: <strong>{eligibility.professional_status}</strong></p>
              {eligibility.professional_status === 'PENDING' && canReview && <div style={{ display: 'flex', gap: 10 }}>
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
          <section className="card col-12">
            <h3><FileText size={17} /> Paquete documental</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                ['PRIVACY_NOTICE', 'Política y aviso de privacidad'], ['DATA_PROTECTION_POLICY', 'Política interna'],
                ['EMPLOYEE_ANNEX', 'Anexo laboral'], ['PROCESSOR_ANNEX', 'Anexo de proveedores'], ['RETENTION_POLICY', 'Política de retención'],
                ['ARCO_PROCEDURE', 'Procedimiento ARCO+'], ['INCIDENT_PLAYBOOK', 'Playbook de incidentes']
              ].map(([type, label]) => <button key={type} className="btn-action" disabled={saving} onClick={() => generateDocument(type)}>{label}</button>)}
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {deliverables.map(item => <div key={item.code} style={{ padding: 10, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <strong>{item.name}</strong><div style={{ fontSize: 12, color: item.status === 'READY_FOR_APPROVAL' ? '#6ee7b7' : '#fcd34d' }}>{item.status === 'READY_FOR_APPROVAL' ? 'Listo para revisión y aprobación' : item.status === 'DRAFT_REVIEW_REQUIRED' ? 'Requiere validar antecedentes preliminares' : `Bloqueado por evidencia faltante: ${item.missingEvidence.join(', ')}`}</div>
              </div>)}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {documents.map(document => <div key={document.id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div><strong>{document.title}</strong><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>v{document.version_number} | {document.workflow_status}</div></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-action" onClick={() => downloadDocument(document)}><Download size={14} /> Descargar</button>
                    {document.workflow_status !== 'APPROVED' && canReview && <button className="btn-save" disabled={saving} onClick={() => reviewDocument(document.id, 'APPROVED')}><ShieldCheck size={14} /> Aprobar</button>}
                  </div>
                </div>
              </div>)}
            </div>
          </section>
          <section className="card col-12">
            <h3><UserCheck size={17} /> Solicitudes ARCO+ administradas</h3>
            {arcoRequests.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No existen solicitudes registradas.</p>}
            <div style={{ display: 'grid', gap: 10 }}>
              {arcoRequests.map(request => {
                const draft = arcoDraft(request);
                return <div key={request.id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div><strong>#{request.id} {request.request_type}</strong><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{request.requester_name} | vence {String(request.due_date).slice(0, 10)}</div></div>
                  <div style={{ fontSize: 12 }}>{request.verification_status} | {request.status}</div>
                </div>
                <p style={{ fontSize: 13 }}>{request.details}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}><strong>Plazo:</strong> {request.deadline_rule || 'Regla pendiente de documentar.'} {request.deadline_reviewed_at ? 'Revisado.' : 'Pendiente de revisión.'}</p>
                <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                  <label style={{ fontSize: 12 }}>Análisis y decisión preliminar
                    <textarea value={draft.analysis} onChange={event => setArcoDraft(request, 'analysis', event.target.value)} rows={3} style={{ width: '100%', marginTop: 4 }} placeholder="Indique datos localizados, procedencia, decisión y acciones requeridas." />
                  </label>
                  <label style={{ fontSize: 12 }}>Respuesta al titular
                    <textarea value={draft.response} onChange={event => setArcoDraft(request, 'response', event.target.value)} rows={3} style={{ width: '100%', marginTop: 4 }} placeholder="Registre el contenido que será enviado al titular." />
                  </label>
                  <label style={{ fontSize: 12 }}>Canal de respuesta
                    <select value={draft.channel} onChange={event => setArcoDraft(request, 'channel', event.target.value)} style={{ display: 'block', marginTop: 4 }}>
                      <option value="EMAIL">Correo electrónico</option><option value="PORTAL">Portal</option><option value="PRESENCIAL">Entrega presencial</option><option value="OTRO">Otro canal verificado</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {request.verification_status !== 'VERIFIED' && <button className="btn-action" disabled={saving} onClick={() => updateArco(request.id, { verification_status: 'VERIFIED', status: 'En Proceso', event_notes: 'Identidad revisada por el operador.' })}>Registrar identidad verificada</button>}
                  {!request.deadline_reviewed_at && <button className="btn-action" disabled={saving} onClick={() => updateArco(request.id, { mark_deadline_reviewed: true, event_notes: 'Plazo aplicable revisado por el operador.' })}>Confirmar revisión del plazo</button>}
                  {request.status !== 'Resuelto' && <button className="btn-action" disabled={saving || request.verification_status !== 'VERIFIED' || !request.deadline_reviewed_at || !draft.analysis.trim()} onClick={() => updateArco(request.id, { status: 'En Revisión', analysis_notes: draft.analysis, event_notes: 'Análisis y decisión preliminar registrados.' })}>Guardar análisis</button>}
                  {request.status !== 'Resuelto' && <button className="btn-save" disabled={saving || request.verification_status !== 'VERIFIED' || !request.deadline_reviewed_at || !draft.analysis.trim() || !draft.response.trim()} onClick={() => updateArco(request.id, { status: 'Resuelto', analysis_notes: draft.analysis, response_content: draft.response, response_channel: draft.channel, mark_response_sent: true, closed_reason: 'Respuesta registrada como enviada y solicitud cerrada.', event_notes: 'Cierre operativo registrado.' })}>Registrar envío y cerrar</button>}
                </div>
                {request.events?.length > 0 && <details style={{ marginTop: 10, fontSize: 12 }}><summary>Bitácora ({request.events.length})</summary>{request.events.map((event: any) => <div key={event.id} style={{ padding: '4px 0' }}>{String(event.created_at).slice(0, 16).replace('T', ' ')} | {event.event_type}{event.notes ? ` | ${event.notes}` : ''}</div>)}</details>}
              </div>})}
            </div>
          </section>
        </>}
      </div>
    </div>
  );
}
