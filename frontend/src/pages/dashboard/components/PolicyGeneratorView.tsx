import { authFetch } from '../../../lib/authFetch';
import { API_BASE } from '../../../lib/api';
import React, { useState, useEffect } from 'react';
import { FileText, Copy, Shield, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface PolicyGeneratorViewProps {
  token: string | null;
}

export default function PolicyGeneratorView({ token }: PolicyGeneratorViewProps) {
  // Wizard States
  const [companyRut, setCompanyRut] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [retentionRules, setRetentionRules] = useState('');
  const [sourceSummary, setSourceSummary] = useState({ ropa: 0, flows: 0, pending: [] as string[] });
  
  // App states
  const [policyHtml, setPolicyHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Available options
  const categoryOptions = Array.from(new Set([
    'Datos Identificatorios (Nombre, RUT, Email, Teléfono)',
    'Datos de Navegación y Cookies (Dirección IP, comportamiento de clicks)',
    'Datos Financieros y Transaccionales (Información de tarjetas de crédito, historial de facturación)',
    'Datos Biométricos (Huella dactilar, reconocimiento facial)',
    'Datos Sensibles (Estado de salud, afiliación sindical, orientación política)',
    ...dataCategories
  ]));

  const purposeOptions = Array.from(new Set([
    'Operación de la Plataforma SaaS principal',
    'Soporte Técnico y Atención al Cliente',
    'Envío de boletines comerciales y Marketing Directo',
    'Análisis estadístico y optimización del sitio web',
    ...purposes
  ]));

  useEffect(() => {
    if (token) {
      loadIntegratedContext();
    }
  }, [token]);

  const parseList = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value !== 'string' || !value.trim()) return [];
    try { return parseList(JSON.parse(value)); } catch { return value.split(',').map(v => v.trim()).filter(Boolean); }
  };

  const loadIntegratedContext = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [savedRes, workspaceRes, ropaRes, flowsRes] = await Promise.all([
        authFetch(`${API_BASE}/api/remediation/policies`),
        authFetch(`${API_BASE}/api/service/workspace`),
        authFetch(`${API_BASE}/api/ropa`),
        authFetch(`${API_BASE}/api/data-inventory/flows`)
      ]);
      const saved = savedRes.ok ? await savedRes.json() : null;
      const workspace = workspaceRes.ok ? await workspaceRes.json() : null;
      const ropa = ropaRes.ok ? await ropaRes.json() : [];
      const flows = flowsRes.ok ? await flowsRes.json() : [];
      const confirmedRopa = ropa.filter((row: any) => row.status === 'confirmed');
      const reviewedFlows = flows.filter((row: any) => row.review_status === 'CONFIRMED');
      const inferredCategories = Array.from(new Set([
        ...confirmedRopa.flatMap((row: any) => parseList(row.data_categories)),
        ...reviewedFlows.flatMap((row: any) => parseList(row.data_categories))
      ])) as string[];
      const inferredPurposes = Array.from(new Set([
        ...confirmedRopa.map((row: any) => row.purpose),
        ...reviewedFlows.map((row: any) => row.purpose)
      ].filter(Boolean))) as string[];
      const inferredRetention = Array.from(new Set([
        ...confirmedRopa.map((row: any) => row.retention_period),
        ...reviewedFlows.map((row: any) => row.retention_period)
      ].filter(Boolean))).join('; ');
      const primaryContact = workspace?.contacts?.find((c: any) => c.is_primary) || workspace?.contacts?.[0];
      const savedCategories = parseList(saved?.data_categories);
      const savedPurposes = parseList(saved?.purposes);

      setCompanyRut(saved?.company_rut || workspace?.organization?.tax_identifier || '');
      setAddress(saved?.address || '');
      setContactEmail(saved?.contact_email || primaryContact?.email || '');
      setDataCategories(savedCategories.length ? savedCategories : inferredCategories);
      setPurposes(savedPurposes.length ? savedPurposes : inferredPurposes);
      setRetentionRules(saved?.retention_rules || inferredRetention);
      setPolicyHtml(saved?.policy_html || '');
      const pending: string[] = [];
      if (!saved?.address) pending.push('domicilio legal');
      if (!primaryContact?.email && !saved?.contact_email) pending.push('contacto responsable');
      if (!inferredCategories.length) pending.push('categorías confirmadas');
      if (!inferredPurposes.length) pending.push('finalidades confirmadas');
      if (!inferredRetention) pending.push('reglas de conservación confirmadas');
      setSourceSummary({ ropa: confirmedRopa.length, flows: reviewedFlows.length, pending });
    } catch (err) {
      console.error(err);
      setErrorMsg('No fue posible recuperar toda la información integrada. Revise los campos antes de generar.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedPolicy = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await authFetch(`${API_BASE}/api/remediation/policies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setCompanyRut(data.company_rut || '');
          setAddress(data.address || '');
          setContactEmail(data.contact_email || '');
          
          const cats = typeof data.data_categories === 'string' 
            ? JSON.parse(data.data_categories) 
            : data.data_categories;
          setDataCategories(cats || []);

          const purs = typeof data.purposes === 'string' 
            ? JSON.parse(data.purposes) 
            : data.purposes;
          setPurposes(purs || []);

          setRetentionRules(data.retention_rules || '');
          setPolicyHtml(data.policy_html || '');
        }
      } else {
        console.warn('No active policy found or error reading database.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al recuperar la política de privacidad guardada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyRut || !address || !contactEmail || !retentionRules) {
      setErrorMsg('Todos los campos de texto del Wizard son requeridos.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setToastMsg('');

    try {
      const response = await authFetch(`${API_BASE}/api/remediation/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyRut,
          address,
          contactEmail,
          dataCategories,
          purposes,
          retentionRules
        })
      });

      const data = await response.json();
      if (response.ok) {
        setPolicyHtml(data.policy_html);
        triggerToast('Política de privacidad generada y guardada exitosamente.');
      } else {
        setErrorMsg(data.error || 'Error al guardar la política de privacidad.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión al procesar el documento legal.');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 4000);
  };

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCopyCode = async () => {
    if (!policyHtml) return;
    navigator.clipboard.writeText(policyHtml);
    setIsCopied(true);
    triggerToast('Código HTML copiado al portapapeles.');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);

    try {
      const hash = await sha256(policyHtml);
      await authFetch(`${API_BASE}/api/remediation/log-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: 'privacy_policy',
          content_hash: hash,
          disclaimer_version: 'DISCLAIMER_V1'
        })
      });
    } catch (err) {
      console.error('Error logging policy download:', err);
    }
  };

  const toggleCategory = (cat: string) => {
    if (dataCategories.includes(cat)) {
      setDataCategories(dataCategories.filter(c => c !== cat));
    } else {
      setDataCategories([...dataCategories, cat]);
    }
  };

  const togglePurpose = (pur: string) => {
    if (purposes.includes(pur)) {
      setPurposes(purposes.filter(p => p !== pur));
    } else {
      setPurposes([...purposes, pur]);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Banner local */}
      {toastMsg && (
        <div className="fixed top-5 right-5 bg-indigo-650 border border-indigo-500 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Shield size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', borderRadius: '8px' }}>
            <FileText size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Borrador de Política de Privacidad</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Reutiliza información confirmada del expediente. El resultado requiere revisión y aprobación antes de publicarse.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '10px' }}>
          <RefreshCw className="loader w-8 h-8 text-indigo-500" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cargando configuración guardada...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column Left: Config Wizard */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card" style={{ padding: '20px' }}>
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
                Fuente integrada: {sourceSummary.ropa} actividades RoPA confirmadas y {sourceSummary.flows} flujos revisados.
                {sourceSummary.pending.length > 0 && (
                  <div className="mt-1 text-amber-400">Pendiente de confirmación: {sourceSummary.pending.join(', ')}.</div>
                )}
              </div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '13.5px', fontWeight: 700, textTransform: 'uppercase', color: 'white', letterSpacing: '0.5px' }}>
                Wizard de Configuración
              </h4>

              {errorMsg && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '11px', marginBottom: '15px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleGenerateAndSave} className="space-y-5 text-left">
                
                {/* 1. Datos Responsable */}
                <div className="space-y-3.5">
                  <span className="text-[11px] font-bold text-indigo-400 block border-b border-slate-800 pb-1 uppercase tracking-wide">1. Datos del Responsable</span>
                  
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>RUT de la Organización</label>
                    <input 
                      type="text" 
                      className="input-text" 
                      style={{ width: '100%', fontSize: '12px', padding: '8px' }} 
                      placeholder="ej. 76.123.456-7"
                      value={companyRut}
                      onChange={e => setCompanyRut(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Dirección Física / Domicilio Legal</label>
                    <input 
                      type="text" 
                      className="input-text" 
                      style={{ width: '100%', fontSize: '12px', padding: '8px' }} 
                      placeholder="ej. Av. Apoquindo 4500, Las Condes"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Correo de Contacto DPO</label>
                    <input 
                      type="email" 
                      className="input-text" 
                      style={{ width: '100%', fontSize: '12px', padding: '8px' }} 
                      placeholder="ej. dpo@miempresa.cl"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 2. Categorías de Datos */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 block border-b border-slate-800 pb-1 uppercase tracking-wide">2. Datos Recolectados</span>
                  <div className="space-y-2">
                    {categoryOptions.map((opt, idx) => (
                      <label key={idx} className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
                        <input 
                          type="checkbox"
                          checked={dataCategories.includes(opt)}
                          onChange={() => toggleCategory(opt)}
                          className="mt-1 flex-shrink-0 accent-indigo-600 rounded bg-slate-900 border-slate-800"
                        />
                        <span style={{ fontSize: '11.5px', lineHeight: 1.4 }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Finalidades */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 block border-b border-slate-800 pb-1 uppercase tracking-wide">3. Finalidades Declaradas</span>
                  <div className="space-y-2">
                    {purposeOptions.map((opt, idx) => (
                      <label key={idx} className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
                        <input 
                          type="checkbox"
                          checked={purposes.includes(opt)}
                          onChange={() => togglePurpose(opt)}
                          className="mt-1 flex-shrink-0 accent-indigo-600 rounded bg-slate-900 border-slate-800"
                        />
                        <span style={{ fontSize: '11.5px', lineHeight: 1.4 }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Conservación */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-indigo-400 block border-b border-slate-800 pb-1 uppercase tracking-wide">4. Criterios de Conservación</span>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Plazo de Retención</label>
                    <textarea 
                      className="input-text" 
                      style={{ width: '100%', fontSize: '12px', padding: '8px' }} 
                      rows={3}
                      placeholder="Explique las reglas temporales para retener los registros..."
                      value={retentionRules}
                      onChange={e => setRetentionRules(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition-all disabled:bg-slate-800"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="loader w-4 h-4" />
                      <span>Procesando Documento...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Generar y Guardar Política</span>
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Column Right: Document Preview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              
              {/* Document Header Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Vista Previa del Documento Legal
                </span>
                
                {policyHtml && (
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg text-slate-400 text-[11px] font-bold transition-all shadow-sm"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copiar Código HTML</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Document Content Display */}
              <div style={{ padding: '24px', background: '#09090b', display: 'flex', justifyContent: 'center' }}>
                {policyHtml ? (
                  <div 
                    className="shadow-xl"
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '30px 40px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                      maxHeight: '650px',
                      overflowY: 'auto',
                      border: '1px solid #e4e4e7'
                    }}
                    dangerouslySetInnerHTML={{ __html: policyHtml }}
                  />
                ) : (
                  <div style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                    <div style={{ padding: '16px', background: '#18181b', borderRadius: 'full', border: '1px dashed #27272a', marginBottom: '15px' }}>
                      <FileText size={40} className="text-slate-600" />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Sin Documento Generado</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '280px' }}>
                      Complete los campos del Wizard de la izquierda y presione el botón de generación para redactar las cláusulas.
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
