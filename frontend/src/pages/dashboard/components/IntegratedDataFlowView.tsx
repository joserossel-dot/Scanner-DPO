import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Database, Network, Plus, RefreshCw } from 'lucide-react';
import { authFetch } from '../../../lib/authFetch';
import { API_BASE, getApiError } from '../../../lib/api';

const list = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

export default function IntegratedDataFlowView({ ropaRecords }: { ropaRecords: Array<{ id: string; process_name: string; status?: string }> }) {
  const [catalog, setCatalog] = useState<any>({ units: [], systems: [], parties: [], contacts: [] });
  const [flows, setFlows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [systemName, setSystemName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [form, setForm] = useState<any>({ direction: 'COLLECTION', ropa_activity_id: '', purpose: '', legal_basis: '', legal_basis_rationale: '', data_subject_categories: '', data_categories: '', data_sources: '', recipient_roles: '', destination_countries: '', transfer_mechanism: '', transfer_safeguards: '', retention_period: '', retention_trigger: '', deletion_method: '', security_controls: '', organization_unit_id: '', source_system_id: '', destination_system_id: '', external_party_id: '', process_owner_contact_id: '', technical_owner_contact_id: '', next_review_date: '' });

  const load = useCallback(async () => {
    const [catalogResponse, flowsResponse] = await Promise.all([
      authFetch(`${API_BASE}/api/data-inventory/catalog`), authFetch(`${API_BASE}/api/data-inventory/flows`)
    ]);
    if (!catalogResponse.ok) throw new Error(await getApiError(catalogResponse, 'No fue posible cargar el catálogo.'));
    setCatalog(await catalogResponse.json());
    setFlows(flowsResponse.ok ? await flowsResponse.json() : []);
  }, []);

  useEffect(() => { void load().catch(cause => setError(cause.message)); }, [load]);
  useEffect(() => {
    const firstConfirmed = ropaRecords.find(record => record.status === 'confirmed' || !record.status);
    if (firstConfirmed && !form.ropa_activity_id) setForm((current: any) => ({ ...current, ropa_activity_id: firstConfirmed.id }));
  }, [ropaRecords, form.ropa_activity_id]);

  const createCatalogItem = async (entity: 'units' | 'systems' | 'parties', body: any) => {
    setSaving(true); setError('');
    try {
      const response = await authFetch(`${API_BASE}/api/data-inventory/${entity}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible guardar el catálogo.'));
      setUnitName(''); setSystemName(''); setPartyName(''); await load();
    } catch (cause: any) { setError(cause.message); } finally { setSaving(false); }
  };

  const saveFlow = async () => {
    setSaving(true); setError('');
    try {
      const arrayFields = ['data_subject_categories', 'data_categories', 'data_sources', 'recipient_roles', 'destination_countries', 'transfer_safeguards', 'security_controls'];
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '').map(([key, value]) => [key, arrayFields.includes(key) ? list(String(value)) : value]));
      const response = await authFetch(`${API_BASE}/api/data-inventory/flows`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await getApiError(response, 'No fue posible guardar el flujo.'));
      setForm((current: any) => ({ ...current, purpose: '', legal_basis: '', legal_basis_rationale: '', data_subject_categories: '', data_categories: '', data_sources: '', recipient_roles: '', destination_countries: '', transfer_mechanism: '', transfer_safeguards: '', retention_period: '', retention_trigger: '', deletion_method: '', security_controls: '', review_status: 'DRAFT', evidence_status: 'PENDING' }));
      await load();
    } catch (cause: any) { setError(cause.message); } finally { setSaving(false); }
  };

  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const confirmedRopa = ropaRecords.filter(record => record.status === 'confirmed' || !record.status);
  const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white';

  return <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5 text-left">
    <div className="flex justify-between gap-4 items-start"><div><h2 className="text-sm font-bold text-white flex items-center gap-2"><Network size={17} /> Mapa integral de datos y responsables</h2><p className="text-xs text-slate-400 mt-1">Conecta cada actividad confirmada con áreas, sistemas, terceros, transferencias, conservación, controles y responsables.</p></div><button onClick={() => void load()} className="text-slate-400"><RefreshCw size={16} /></button></div>
    {error && <div className="text-xs text-rose-400 border border-rose-900/40 bg-rose-950/20 rounded-lg p-3">{error}</div>}

    <div className="grid md:grid-cols-3 gap-3">
      <div><label className="text-xs text-slate-300">Nueva unidad o área</label><div className="flex gap-2 mt-1"><input className={inputClass} value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="Ej. Recursos Humanos" /><button disabled={!unitName || saving} onClick={() => void createCatalogItem('units', { name: unitName })}><Plus size={16} /></button></div></div>
      <div><label className="text-xs text-slate-300">Nuevo sistema</label><div className="flex gap-2 mt-1"><input className={inputClass} value={systemName} onChange={e => setSystemName(e.target.value)} placeholder="Ej. Buk" /><button disabled={!systemName || saving} onClick={() => void createCatalogItem('systems', { name: systemName, system_type: 'SAAS' })}><Plus size={16} /></button></div></div>
      <div><label className="text-xs text-slate-300">Proveedor o destinatario</label><div className="flex gap-2 mt-1"><input className={inputClass} value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="Ej. Proveedor SpA" /><button disabled={!partyName || saving} onClick={() => void createCatalogItem('parties', { legal_name: partyName, party_roles: ['PROCESSOR'] })}><Plus size={16} /></button></div></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <label className="text-xs text-slate-300">Actividad RoPA<select className={`${inputClass} mt-1`} value={form.ropa_activity_id} onChange={e => set('ropa_activity_id', e.target.value)}><option value="">Seleccione</option>{confirmedRopa.map(r => <option key={r.id} value={r.id}>{r.process_name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Dirección<select className={`${inputClass} mt-1`} value={form.direction} onChange={e => set('direction', e.target.value)}><option value="COLLECTION">Recolección</option><option value="INTERNAL">Uso interno</option><option value="DISCLOSURE">Entrega a tercero</option><option value="RETURN">Devolución</option><option value="DELETION">Eliminación</option></select></label>
      <label className="text-xs text-slate-300">Área<select className={`${inputClass} mt-1`} value={form.organization_unit_id} onChange={e => set('organization_unit_id', e.target.value)}><option value="">Pendiente</option>{catalog.units.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Sistema origen<select className={`${inputClass} mt-1`} value={form.source_system_id} onChange={e => set('source_system_id', e.target.value)}><option value="">No aplica</option>{catalog.systems.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Sistema destino<select className={`${inputClass} mt-1`} value={form.destination_system_id} onChange={e => set('destination_system_id', e.target.value)}><option value="">No aplica</option>{catalog.systems.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Tercero<select className={`${inputClass} mt-1`} value={form.external_party_id} onChange={e => set('external_party_id', e.target.value)}><option value="">No aplica</option>{catalog.parties.map((x: any) => <option key={x.id} value={x.id}>{x.legal_name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Responsable del proceso<select className={`${inputClass} mt-1`} value={form.process_owner_contact_id} onChange={e => set('process_owner_contact_id', e.target.value)}><option value="">Pendiente</option>{catalog.contacts.map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Responsable técnico<select className={`${inputClass} mt-1`} value={form.technical_owner_contact_id} onChange={e => set('technical_owner_contact_id', e.target.value)}><option value="">Pendiente</option>{catalog.contacts.map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
      <label className="text-xs text-slate-300">Próxima revisión<input type="date" className={`${inputClass} mt-1`} value={form.next_review_date} onChange={e => set('next_review_date', e.target.value)} /></label>
      {[
        ['purpose','Finalidad específica'], ['legal_basis','Base de licitud'], ['legal_basis_rationale','Justificación de la base'],
        ['data_subject_categories','Titulares, separados por coma'], ['data_categories','Datos personales, separados por coma'], ['data_sources','Origen de los datos'],
        ['recipient_roles','Destinatarios'], ['destination_countries','Países de destino'], ['transfer_mechanism','Mecanismo de transferencia'],
        ['transfer_safeguards','Salvaguardas'], ['retention_period','Plazo de conservación'], ['retention_trigger','Evento que inicia el plazo'],
        ['deletion_method','Método de eliminación'], ['security_controls','Controles de seguridad']
      ].map(([key,label]) => <label key={key} className="text-xs text-slate-300">{label}<input className={`${inputClass} mt-1`} value={form[key]} onChange={e => set(key, e.target.value)} /></label>)}
    </div>
    <button className="btn-save" disabled={saving || !form.ropa_activity_id || !form.purpose || !form.legal_basis || !form.retention_period || !form.deletion_method} onClick={() => void saveFlow()}><Database size={15} /> Guardar flujo como borrador verificable</button>

    <div className="space-y-2">{flows.map(flow => <div key={flow.id} className="p-3 border border-slate-800 rounded-xl text-xs text-slate-300"><div className="font-bold text-white flex items-center gap-2">{flow.process_name}<ArrowRight size={13} />{flow.external_party_name || flow.destination_system_name || 'Uso interno'}</div><div className="mt-1">{flow.purpose} | {flow.legal_basis} | {flow.review_status} | evidencia {flow.evidence_status}</div></div>)}</div>
  </section>;
}
