import { useEffect, useState } from 'react';
import { CheckCircle, ChevronRight, CircleHelp, Save } from 'lucide-react';
import { authFetch } from '../../../lib/authFetch';
import { API_BASE, getApiError } from '../../../lib/api';

const UNKNOWN = 'UNKNOWN';
const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

export default function BusinessDiscoveryQuestionnaire({ onDraftCreated }: { onDraftCreated?: () => void }) {
  const [schema, setSchema] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>({ contacts: [], systems: [], parties: [] });
  const [answers, setAnswers] = useState<any>({ movesBetweenSystems: UNKNOWN, sharesData: UNKNOWN, internationalTransfer: UNKNOWN, sensitiveData: UNKNOWN, automatedDecisions: UNKNOWN });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickAdd, setQuickAdd] = useState({ system: '', processOwner: '', processOwnerEmail: '', technicalOwner: '', technicalOwnerEmail: '', party: '' });

  useEffect(() => { void (async () => {
    try {
      const [schemaResponse, sessionResponse, catalogResponse] = await Promise.all([
        authFetch(`${API_BASE}/api/discovery/schema`), authFetch(`${API_BASE}/api/discovery/sessions/current`), authFetch(`${API_BASE}/api/data-inventory/catalog`)
      ]);
      if (!schemaResponse.ok) throw new Error(await getApiError(schemaResponse, 'No fue posible cargar el recorrido.'));
      setSchema(await schemaResponse.json());
      const current = sessionResponse.ok ? await sessionResponse.json() : null;
      if (current) setSession(current);
      else {
        const created = await authFetch(`${API_BASE}/api/discovery/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (!created.ok) throw new Error(await getApiError(created, 'No fue posible iniciar el recorrido.'));
        setSession(await created.json());
      }
      if (catalogResponse.ok) setCatalog(await catalogResponse.json());
    } catch (cause: any) { setError(cause.message); }
  })(); }, []);

  const update = (key: string, value: any) => setAnswers((current: any) => ({ ...current, [key]: value }));
  const refreshCatalog = async () => {
    const response = await authFetch(`${API_BASE}/api/data-inventory/catalog`);
    if (!response.ok) throw new Error(await getApiError(response, 'No fue posible actualizar los responsables y sistemas.'));
    const next = await response.json(); setCatalog(next); return next;
  };
  const createCatalogItem = async (entity: 'systems' | 'contacts' | 'parties', body: any, answerKey: string) => {
    setSaving(true); setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/data-inventory/${entity}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible registrar la información.'));
      const created = await response.json(); await refreshCatalog();
      setAnswers((current: any) => ({ ...current, [answerKey]: created.id, ...(answerKey === 'sourceSystemId' ? { systems: [created.id] } : {}) }));
      setQuickAdd(current => ({ ...current, system: answerKey === 'sourceSystemId' ? '' : current.system, party: answerKey === 'externalPartyId' ? '' : current.party,
        processOwner: answerKey === 'processOwner' ? '' : current.processOwner, processOwnerEmail: answerKey === 'processOwner' ? '' : current.processOwnerEmail,
        technicalOwner: answerKey === 'technicalOwner' ? '' : current.technicalOwner, technicalOwnerEmail: answerKey === 'technicalOwner' ? '' : current.technicalOwnerEmail }));
    } catch (cause: any) { setError(cause.message); } finally { setSaving(false); }
  };
  const choose = (template: any) => { setSelected(template); setResult(null); setAnswers({ movesBetweenSystems: UNKNOWN, sharesData: UNKNOWN, internationalTransfer: UNKNOWN, sensitiveData: UNKNOWN, automatedDecisions: UNKNOWN }); };

  const save = async () => {
    if (!session || !selected) return;
    setSaving(true); setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/discovery/sessions/${session.id}/processes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_template_code: selected.code, display_name: selected.label, answers })
      });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible guardar esta actividad.'));
      const saved = await response.json(); setResult(saved);
      if (saved.completeness_percent === 100) {
        const mapped = await authFetch(`${API_BASE}/api/discovery/processes/${saved.id}/map-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (mapped.ok) onDraftCreated?.();
      }
    } catch (cause: any) { setError(cause.message); } finally { setSaving(false); }
  };

  if (!schema) return <div className="text-xs text-slate-400">Cargando recorrido empresarial...</div>;
  const templates = schema.definition?.processTemplates || [];
  const input = 'w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white';
  const yesNoUnknown = (key: string) => <select className={input} value={answers[key]} onChange={e => update(key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : UNKNOWN)}><option value={UNKNOWN}>No sé todavía</option><option value="true">Sí</option><option value="false">No</option></select>;

  return <div className="space-y-5">
    <div className="p-4 rounded-xl border border-indigo-900/50 bg-indigo-950/20"><h3 className="text-sm font-bold text-white">Cuéntenos cómo trabaja su empresa</h3><p className="text-xs text-slate-400 mt-1">No necesita conocer la ley. Seleccione una actividad cotidiana y responda con lo que sabe. Cada “No sé” quedará como tarea pendiente.</p></div>
    {error && <div className="p-3 text-xs text-rose-400 border border-rose-900/40 rounded-lg">{error}</div>}
    {!selected ? <div className="grid sm:grid-cols-2 gap-3">{templates.map((template: any) => <button key={template.code} onClick={() => choose(template)} className="text-left p-4 bg-slate-950/50 border border-slate-800 hover:border-indigo-600 rounded-xl"><strong className="text-xs text-white flex justify-between">{template.label}<ChevronRight size={14} /></strong><span className="text-[11px] text-slate-400 block mt-1">{template.examples}</span></button>)}</div> : <>
      <button className="text-xs text-indigo-400" onClick={() => setSelected(null)}>← Elegir otra actividad</button>
      <h3 className="text-base font-bold text-white">{selected.label}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-xs text-slate-300 md:col-span-2">¿Para qué usa esta información?<textarea className={input} value={answers.purpose || ''} onChange={e => update('purpose', e.target.value)} placeholder="Ej. preparar cotizaciones, entregar pedidos y atender garantías" /></label>
        <label className="text-xs text-slate-300">¿De qué personas guarda información?<input className={input} value={answers.subjectsText || ''} onChange={e => { update('subjectsText', e.target.value); update('subjects', split(e.target.value)); }} placeholder="Clientes, trabajadores, postulantes" /></label>
        <label className="text-xs text-slate-300">¿Qué información guarda o consulta?<input className={input} value={answers.dataText || ''} onChange={e => { update('dataText', e.target.value); update('dataCategories', split(e.target.value)); }} placeholder="Nombre, RUT, correo, dirección" /></label>
        <label className="text-xs text-slate-300">¿Cómo obtiene la información?<input className={input} value={answers.sourcesText || ''} onChange={e => { update('sourcesText', e.target.value); update('sources', split(e.target.value)); }} placeholder="La entrega la persona, la genera la empresa" /></label>
        <label className="text-xs text-slate-300">¿Qué hace necesario usarla?<select className={input} value={answers.legalBasis || UNKNOWN} onChange={e => update('legalBasis', e.target.value)}><option value={UNKNOWN}>No sé, necesito revisión</option><option value="CONTRACT">Para cumplir un contrato o solicitud</option><option value="LEGAL_OBLIGATION">Porque una ley lo exige</option><option value="CONSENT">La persona lo autoriza libremente</option><option value="LEGITIMATE_INTEREST">Existe otra razón justificada</option></select></label>
        <label className="text-xs text-slate-300">¿Dónde se guarda primero?<select className={input} value={answers.sourceSystemId || UNKNOWN} onChange={e => { update('sourceSystemId', e.target.value); update('systems', e.target.value === UNKNOWN ? UNKNOWN : [e.target.value]); }}><option value={UNKNOWN}>No sé o falta registrar el sistema</option>{catalog.systems.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className="text-xs text-slate-300"><span>Si no aparece, regístrelo aquí</span><div className="flex gap-2 mt-1"><input className={input} value={quickAdd.system} onChange={e => setQuickAdd(x => ({ ...x, system: e.target.value }))} placeholder="Ej. planilla Excel, Nubox o correo" /><button type="button" disabled={saving || !quickAdd.system.trim()} onClick={() => void createCatalogItem('systems', { name: quickAdd.system.trim(), system_type: 'OTHER' }, 'sourceSystemId')} className="px-3 rounded-lg bg-indigo-700 disabled:bg-slate-800">Agregar</button></div></div>
        <label className="text-xs text-slate-300">¿La información pasa a otro sistema?{yesNoUnknown('movesBetweenSystems')}</label>
        {answers.movesBetweenSystems === true && <label className="text-xs text-slate-300">¿A qué sistema pasa?<select className={input} value={answers.destinationSystemId || UNKNOWN} onChange={e => update('destinationSystemId', e.target.value)}><option value={UNKNOWN}>No sé todavía</option>{catalog.systems.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
        <label className="text-xs text-slate-300">¿La ve o recibe otra empresa?{yesNoUnknown('sharesData')}</label>
        {answers.sharesData === true && <><label className="text-xs text-slate-300">Proveedor o destinatario registrado<select className={input} value={answers.externalPartyId || UNKNOWN} onChange={e => update('externalPartyId', e.target.value)}><option value={UNKNOWN}>No está registrado</option>{catalog.parties.map((x: any) => <option key={x.id} value={x.id}>{x.legal_name}</option>)}</select></label><div className="text-xs text-slate-300"><span>Agregar proveedor o destinatario</span><div className="flex gap-2 mt-1"><input className={input} value={quickAdd.party} onChange={e => setQuickAdd(x => ({ ...x, party: e.target.value }))} placeholder="Ej. contador o empresa de despacho" /><button type="button" disabled={saving || !quickAdd.party.trim()} onClick={() => void createCatalogItem('parties', { legal_name: quickAdd.party.trim(), party_roles: ['PROCESSOR'] }, 'externalPartyId')} className="px-3 rounded-lg bg-indigo-700 disabled:bg-slate-800">Agregar</button></div></div><label className="text-xs text-slate-300">¿Quién recibe o puede acceder?<input className={input} value={answers.recipientsText || ''} onChange={e => { update('recipientsText', e.target.value); update('recipients', split(e.target.value)); }} placeholder="Contador, proveedor de software" /></label><label className="text-xs text-slate-300">¿En qué países?<input className={input} value={answers.countriesText || ''} onChange={e => { update('countriesText', e.target.value); update('countries', e.target.value ? split(e.target.value) : UNKNOWN); }} placeholder="Chile, Estados Unidos" /></label></>}
        <label className="text-xs text-slate-300">¿Sale de Chile o se accede desde otro país?{yesNoUnknown('internationalTransfer')}</label>
        {answers.internationalTransfer === true && <label className="text-xs text-slate-300">¿Qué respaldo tiene esa transferencia?<select className={input} value={answers.transferMechanism || UNKNOWN} onChange={e => update('transferMechanism', e.target.value)}><option value={UNKNOWN}>No sé</option><option value="CONTRACTUAL_GUARANTEES">Contrato o garantías</option><option value="ADEQUACY">País reconocido como adecuado</option><option value="OTHER">Otro mecanismo</option></select></label>}
        <label className="text-xs text-slate-300">¿Durante cuánto tiempo se conserva?<input className={input} value={answers.retentionPeriod || ''} onChange={e => update('retentionPeriod', e.target.value || UNKNOWN)} placeholder="Ej. 5 años" /></label>
        <label className="text-xs text-slate-300">¿Desde qué momento se cuenta ese plazo?<input className={input} value={answers.retentionTrigger || ''} onChange={e => update('retentionTrigger', e.target.value || UNKNOWN)} placeholder="Ej. término del contrato" /></label>
        <label className="text-xs text-slate-300">¿Qué ocurre al vencer el plazo?<input className={input} value={answers.deletionMethod || ''} onChange={e => update('deletionMethod', e.target.value || UNKNOWN)} placeholder="Borrado, anonimización o archivo" /></label>
        <label className="text-xs text-slate-300">¿Quién responde por esta actividad?<select className={input} value={answers.processOwner || UNKNOWN} onChange={e => update('processOwner', e.target.value)}><option value={UNKNOWN}>No está definido</option>{catalog.contacts.map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
        <label className="text-xs text-slate-300">¿Quién administra el sistema?<select className={input} value={answers.technicalOwner || UNKNOWN} onChange={e => update('technicalOwner', e.target.value)}><option value={UNKNOWN}>No está definido</option>{catalog.contacts.map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-3 p-3 border border-slate-800 rounded-xl"><div><span className="text-xs text-slate-300">Registrar responsable del proceso</span><input className={input} value={quickAdd.processOwner} onChange={e => setQuickAdd(x => ({ ...x, processOwner: e.target.value }))} placeholder="Nombre y apellido" /><input type="email" className={input} value={quickAdd.processOwnerEmail} onChange={e => setQuickAdd(x => ({ ...x, processOwnerEmail: e.target.value }))} placeholder="correo@empresa.cl" /><button type="button" disabled={saving || !quickAdd.processOwner.trim() || !quickAdd.processOwnerEmail.trim()} onClick={() => void createCatalogItem('contacts', { full_name: quickAdd.processOwner.trim(), email: quickAdd.processOwnerEmail.trim(), responsibility: 'PROCESS_OWNER' }, 'processOwner')} className="mt-2 px-3 py-2 rounded-lg bg-indigo-700 disabled:bg-slate-800">Registrar responsable</button></div><div><span className="text-xs text-slate-300">Registrar responsable técnico</span><input className={input} value={quickAdd.technicalOwner} onChange={e => setQuickAdd(x => ({ ...x, technicalOwner: e.target.value }))} placeholder="Nombre y apellido" /><input type="email" className={input} value={quickAdd.technicalOwnerEmail} onChange={e => setQuickAdd(x => ({ ...x, technicalOwnerEmail: e.target.value }))} placeholder="correo@empresa.cl" /><button type="button" disabled={saving || !quickAdd.technicalOwner.trim() || !quickAdd.technicalOwnerEmail.trim()} onClick={() => void createCatalogItem('contacts', { full_name: quickAdd.technicalOwner.trim(), email: quickAdd.technicalOwnerEmail.trim(), responsibility: 'TECHNICAL_OWNER' }, 'technicalOwner')} className="mt-2 px-3 py-2 rounded-lg bg-indigo-700 disabled:bg-slate-800">Registrar responsable técnico</button></div></div>
        <label className="text-xs text-slate-300">¿Cómo protege esta información?<input className={input} value={answers.controlsText || ''} onChange={e => { update('controlsText', e.target.value); update('securityControls', e.target.value ? split(e.target.value) : UNKNOWN); }} placeholder="Cuentas individuales, doble factor, respaldo" /></label>
        <label className="text-xs text-slate-300">¿Incluye salud, biometría, menores u otros datos sensibles?{yesNoUnknown('sensitiveData')}</label>
        {answers.sensitiveData === true && <label className="text-xs text-slate-300">¿Cuáles?<input className={input} value={answers.sensitiveText || ''} onChange={e => { update('sensitiveText', e.target.value); update('sensitiveCategories', split(e.target.value)); }} /></label>}
        <label className="text-xs text-slate-300">¿Se toma automáticamente una decisión importante?{yesNoUnknown('automatedDecisions')}</label>
        {answers.automatedDecisions === true && <label className="text-xs text-slate-300">¿Qué decisión y qué efecto produce?<input className={input} value={answers.automatedDecisionDetails || ''} onChange={e => update('automatedDecisionDetails', e.target.value)} /></label>}
      </div>
      <button className="btn-save" disabled={saving} onClick={() => void save()}><Save size={14} /> Guardar actividad</button>
      {result && <div className="p-4 border border-slate-800 rounded-xl"><div className="flex items-center gap-2 text-sm font-bold text-white">{result.completeness_percent === 100 ? <CheckCircle className="text-emerald-400" size={17} /> : <CircleHelp className="text-amber-400" size={17} />} Información recopilada: {result.completeness_percent}%</div><p className="text-xs text-slate-400 mt-2">{result.completeness_percent === 100 ? 'Se creó un borrador para revisión. Todavía no constituye una conclusión jurídica.' : `Pendientes: ${(result.unknown_fields || []).join(', ')}`}</p></div>}
    </>}
  </div>;
}
