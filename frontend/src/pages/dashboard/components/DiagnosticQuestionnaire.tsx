import React, { useState } from 'react';
import { 
  Users, 
  ShoppingBag, 
  ShieldAlert, 
  DollarSign, 
  FileSignature, 
  ChevronDown, 
  ChevronUp, 
  ClipboardList,
  CheckCircle,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

interface QuestionnaireState {
  // Area 1: RRHH
  rrhh_storage_type: string[];
  rrhh_storage_type_other: string;
  rrhh_storage_details: string;
  rrhh_health_data: string[];
  rrhh_health_data_other: string;
  rrhh_destruction_proc: string;
  rrhh_attendance_tech: string[];
  rrhh_attendance_tech_other: string;
  rrhh_biometric_consent: string;
  rrhh_biometric_consent_other: string;
  rrhh_biometric_vendor: string;
  
  // Area 2: Comercial & Marketing
  commercial_db_type: string[];
  commercial_db_type_other: string;
  commercial_tool_volume: string;
  commercial_server_country: string;
  commercial_server_country_other: string;
  commercial_record_meetings: string[];
  commercial_record_meetings_other: string;
  commercial_record_notice: string;
  commercial_record_notice_other: string;

  // Area 3: TI & Ciberseguridad
  ti_rbac_type: string[];
  ti_rbac_type_other: string;
  ti_sensitive_access_roles: string;
  ti_encryption_type: string;
  ti_encryption_type_other: string;
  ti_backup_frequency: string;

  // Area 4: Finanzas & Cobranza
  finances_debt_deletion: string;
  finances_debt_deletion_other: string;
  finances_retention_rules: string;

  // Area 5: Proveedores & Terceros
  vendors_transfer_types: string[];
  vendors_transfer_types_other: string;
  vendors_main_names: string;
  vendors_dpa_contracts: string;
  vendors_dpa_contracts_other: string;

  // Shadow IT List
  shadow_it_providers: string[];

  // Behavior tracking question (auto-filled by scanner)
  commercial_track_behavior: string;
}

const initialFormState: QuestionnaireState = {
  rrhh_storage_type: [],
  rrhh_storage_type_other: '',
  rrhh_storage_details: '',
  rrhh_health_data: [],
  rrhh_health_data_other: '',
  rrhh_destruction_proc: '',
  rrhh_attendance_tech: [],
  rrhh_attendance_tech_other: '',
  rrhh_biometric_consent: '',
  rrhh_biometric_consent_other: '',
  rrhh_biometric_vendor: '',
  
  commercial_db_type: [],
  commercial_db_type_other: '',
  commercial_tool_volume: '',
  commercial_server_country: '',
  commercial_server_country_other: '',
  commercial_record_meetings: [],
  commercial_record_meetings_other: '',
  commercial_record_notice: '',
  commercial_record_notice_other: '',

  ti_rbac_type: [],
  ti_rbac_type_other: '',
  ti_sensitive_access_roles: '',
  ti_encryption_type: '',
  ti_encryption_type_other: '',
  ti_backup_frequency: '',

  finances_debt_deletion: '',
  finances_debt_deletion_other: '',
  finances_retention_rules: '',

  vendors_transfer_types: [],
  vendors_transfer_types_other: '',
  vendors_main_names: '',
  vendors_dpa_contracts: '',
  vendors_dpa_contracts_other: '',

  shadow_it_providers: [],
  commercial_track_behavior: ''
};

interface DiagnosticQuestionnaireProps {
  onSubmit: (answers: any) => void;
  token?: string | null;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function DiagnosticQuestionnaire({ onSubmit, token }: DiagnosticQuestionnaireProps) {
  const [formData, setFormData] = useState<QuestionnaireState>(initialFormState);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [detectedByScanner, setDetectedByScanner] = useState(false);

  // Load latest scan report to auto-complete tracking question
  React.useEffect(() => {
    if (!token) return;
    
    const fetchScanData = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/scan/latest`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const scanReport = await response.json();
          if (scanReport && scanReport.findings) {
            // Check if findings contain unconsented_scripts
            const hasAnalytics = scanReport.findings.some(
              (f: any) => f.id === 'unconsented_scripts'
            );
            if (hasAnalytics) {
              setDetectedByScanner(true);
              setFormData(prev => ({
                ...prev,
                commercial_track_behavior: 'Sí',
                // Also pre-mark Google Analytics and Meta Pixel in shadow IT list
                shadow_it_providers: Array.from(new Set([
                  ...prev.shadow_it_providers,
                  'google_analytics',
                  'meta_pixel'
                ]))
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching latest scan for questionnaire:', err);
      }
    };
    
    fetchScanData();
  }, [token]);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleInputChange = (field: keyof QuestionnaireState, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelectToggle = (field: keyof QuestionnaireState, value: string) => {
    const currentList = (formData[field] as string[]) || [];
    const updatedList = currentList.includes(value)
      ? currentList.filter(item => item !== value)
      : [...currentList, value];
    
    handleInputChange(field, updatedList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Custom validations for multi-select groups (ensuring at least one selection)
    if (formData.rrhh_storage_type.length === 0) {
      setValidationError('Por favor seleccione al menos una opción en: ¿Dónde se almacenan los CVs? (Área 1)');
      setActiveAccordion(0);
      return;
    }
    if (formData.rrhh_attendance_tech.length === 0) {
      setValidationError('Por favor seleccione al menos una opción en: ¿Qué tecnología utiliza para control de asistencia? (Área 1)');
      setActiveAccordion(0);
      return;
    }
    if (formData.commercial_db_type.length === 0) {
      setValidationError('Por favor seleccione al menos una opción en: ¿Dónde reside la base de datos principal? (Área 2)');
      setActiveAccordion(1);
      return;
    }
    if (!formData.commercial_track_behavior) {
      setValidationError('Por favor seleccione una opción en: ¿Rastreas el comportamiento de los usuarios en tu web? (Área 2)');
      setActiveAccordion(1);
      return;
    }
    if (formData.commercial_record_meetings.length === 0) {
      setValidationError('Por favor seleccione al menos una opción en: ¿Se graban las llamadas o reuniones? (Área 2)');
      setActiveAccordion(1);
      return;
    }
    if (formData.ti_rbac_type.length === 0) {
      setValidationError('Por favor seleccione al menos una opción en: ¿Cómo se gestiona el acceso a las bases de datos? (Área 3)');
      setActiveAccordion(2);
      return;
    }

    console.log('📊 [Diagnóstico Legal] Cuestionario Operativo Interno Enviado:', formData);
    setFormSubmitted(true);
    onSubmit(formData);
    
    // Smooth scroll to top
    const element = document.getElementById('diagnostic-questionnaire-root');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setFormSubmitted(false);
    setActiveAccordion(0);
    setValidationError('');
  };

  // Shadow IT definition list matching backend discovery tools
  const shadowItGroups = [
    { id: 'infra', title: 'A. Infraestructura y Nube', options: [
      { key: 'aws', label: 'Amazon Web Services (AWS) [EE.UU.]' },
      { key: 'gcp', label: 'Google Cloud Platform (GCP) [EE.UU.]' },
      { key: 'azure', label: 'Microsoft Azure [EE.UU.]' },
      { key: 'digitalocean', label: 'DigitalOcean [EE.UU.]' }
    ] },
    { id: 'marketing', title: 'B. CRM, Marketing y Automatización', options: [
      { key: 'hubspot', label: 'HubSpot [EE.UU.]' },
      { key: 'salesforce', label: 'Salesforce [EE.UU.]' },
      { key: 'mailchimp', label: 'Mailchimp [EE.UU.]' },
      { key: 'activecampaign', label: 'ActiveCampaign [EE.UU.]' },
      { key: 'sendgrid', label: 'SendGrid [EE.UU.]' }
    ] },
    { id: 'operations', title: 'C. Operaciones y Recursos Humanos', options: [
      { key: 'google_workspace', label: 'Google Workspace [EE.UU.]' },
      { key: 'office_365', label: 'Microsoft 365 [EE.UU.]' },
      { key: 'zoom', label: 'Zoom [EE.UU.]' },
      { key: 'workday', label: 'Workday [EE.UU.]' },
      { key: 'bamboohr', label: 'BambooHR [EE.UU.]' }
    ] },
    { id: 'analytics', title: 'D. TI, Analytics y Soporte', options: [
      { key: 'google_analytics', label: 'Google Analytics [EE.UU.]' },
      { key: 'meta_pixel', label: 'Meta Pixel [EE.UU.]' },
      { key: 'hotjar', label: 'Hotjar [EE.UU.]' },
      { key: 'zendesk', label: 'Zendesk [EE.UU.]' },
      { key: 'intercom', label: 'Intercom [EE.UU.]' }
    ] }
  ];

  return (
    <div id="diagnostic-questionnaire-root" className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl text-left">
      <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-850">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Cuestionario Operativo Interno (Ley N° 21.719)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Evalúa brechas operacionales internas en procesos de personas, marketing, TI y finanzas.</p>
          </div>
        </div>
        {formSubmitted && (
          <button 
            type="button" 
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all"
          >
            Reiniciar Respuestas
          </button>
        )}
      </div>

      {validationError && (
        <div className="p-4 bg-rose-950/30 border-b border-rose-900/40 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{validationError}</span>
        </div>
      )}

      {formSubmitted ? (
        <div className="p-8 text-center max-w-xl mx-auto my-4">
          <div className="w-16 h-16 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle size={32} />
          </div>
          <h4 className="text-lg font-bold text-white">¡Cuestionario Procesado Exitosamente!</h4>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Las respuestas operativas internas han sido consolidadas de forma exitosa. El diagnóstico legal se ha guardado en la consola técnica del navegador para su posterior análisis.
          </p>
          <div className="mt-6 p-4 bg-slate-950 rounded-lg text-left text-xs font-mono border border-slate-800 text-indigo-400 max-h-48 overflow-y-auto">
            {JSON.stringify(formData, null, 2)}
          </div>
          <button
            type="button"
            onClick={() => setFormSubmitted(false)}
            className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all"
          >
            Modificar Respuestas
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="divide-y divide-slate-800">
          
          {/* ACORDEÓN 1: Recursos Humanos y Gestión de Personas */}
          <div className="transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion(0)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${activeAccordion === 0 ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm text-white">Área 1: Recursos Humanos y Gestión de Personas</span>
              </div>
              {activeAccordion === 0 ? <ChevronUp className="text-slate-500 w-4 h-4" /> : <ChevronDown className="text-slate-500 w-4 h-4" />}
            </button>
            
            {activeAccordion === 0 && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/5">
                
                {/* PREGUNTA 1 (CHECKBOXES MULTIPLE) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Dónde se almacenan los CVs y fichas de empleados?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'Físico', label: 'Archiveros Físicos' },
                      { value: 'Nube', label: 'Almacenamiento en la Nube (Drive, Dropbox)' },
                      { value: 'Software RRHH', label: 'Software especializado de RRHH (ej. Buk, Talana)' },
                      { value: 'Correo', label: 'Casillas de Correo Electrónico' },
                      { value: 'Híbrido', label: 'Esquema Híbrido (Papel y Digital)' },
                      { value: 'Otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.value} className="space-y-1.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                          <input 
                            type="checkbox"
                            checked={formData.rrhh_storage_type.includes(item.value)}
                            onChange={() => handleMultiSelectToggle('rrhh_storage_type', item.value)}
                            className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.value === 'Otro' && formData.rrhh_storage_type.includes('Otro') && (
                          <div className="pl-6 pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.rrhh_storage_type_other}
                              onChange={e => handleInputChange('rrhh_storage_type_other', e.target.value)}
                              placeholder="Especifique otro método/sistema..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Detalle de ubicación / nombre de software</label>
                  <input 
                    type="text"
                    value={formData.rrhh_storage_details}
                    onChange={e => handleInputChange('rrhh_storage_details', e.target.value)}
                    placeholder="ej. Bóveda oficina central / Buk Chile"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Tu empresa maneja datos de salud, huellas dactilares o datos de menores de edad?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { key: 'licencias', label: 'Licencias médicas recibidas' },
                      { key: 'examenes_ocup', label: 'Exámenes ocupacionales' },
                      { key: 'afp_isapre', label: 'Certificados Isapre / Fonasa / AFP' },
                      { key: 'drogas', label: 'Controles de drogas / alcohol' },
                      { key: 'ninguno', label: 'Ninguno' },
                      { key: 'otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.key} className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={formData.rrhh_health_data.includes(item.key)}
                            onChange={() => handleMultiSelectToggle('rrhh_health_data', item.key)}
                            className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.key === 'otro' && formData.rrhh_health_data.includes('otro') && (
                          <div className="pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.rrhh_health_data_other}
                              onChange={e => handleInputChange('rrhh_health_data_other', e.target.value)}
                              placeholder="Especifique otros datos..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Procedimiento de destrucción de datos de salud una vez finalizado el fin legal</label>
                  <input 
                    type="text"
                    value={formData.rrhh_destruction_proc}
                    onChange={e => handleInputChange('rrhh_destruction_proc', e.target.value)}
                    placeholder="Describa el protocolo de eliminación de licencias u otros antecedentes de salud..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* PREGUNTA 2 (CHECKBOXES MULTIPLE) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Cómo registras la hora de entrada y salida de tus trabajadores? (Biometría, firma, etc.)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'Huella', label: 'Biometría Dactilar (Huella)' },
                      { value: 'Rostro/Iris', label: 'Biometría Facial / Iris' },
                      { value: 'Papel', label: 'Libro de Asistencia Físico (Papel)' },
                      { value: 'Tarjeta', label: 'Tarjeta de Proximidad RFID' },
                      { value: 'App sin biometría', label: 'Aplicación móvil (Marcaje sin biométricos)' },
                      { value: 'Otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.value} className="space-y-1.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                          <input 
                            type="checkbox"
                            checked={formData.rrhh_attendance_tech.includes(item.value)}
                            onChange={() => handleMultiSelectToggle('rrhh_attendance_tech', item.value)}
                            className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.value === 'Otro' && formData.rrhh_attendance_tech.includes('Otro') && (
                          <div className="pl-6 pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.rrhh_attendance_tech_other}
                              onChange={e => handleInputChange('rrhh_attendance_tech_other', e.target.value)}
                              placeholder="Especifique otra tecnología..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Se entrega aviso previo informado sobre biometría?</label>
                  <select 
                    value={formData.rrhh_biometric_consent} 
                    onChange={e => handleInputChange('rrhh_biometric_consent', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Sí">Sí, firmado previo a enrolar</option>
                    <option value="No">No se entrega aviso formal</option>
                    <option value="En proceso">En proceso de redactar/implementar</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.rrhh_biometric_consent === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.rrhh_biometric_consent_other}
                        onChange={e => handleInputChange('rrhh_biometric_consent_other', e.target.value)}
                        placeholder="Especifique otro método..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Proveedor del sistema biométrico / de asistencia</label>
                  <input 
                    type="text"
                    value={formData.rrhh_biometric_vendor}
                    onChange={e => handleInputChange('rrhh_biometric_vendor', e.target.value)}
                    placeholder="ej. GeoVictoria, ZKTeco, Relojcontrol"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 2: Comercial, Marketing y Atención a Clientes */}
          <div className="transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion(1)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className={`w-5 h-5 ${activeAccordion === 1 ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm text-white">Área 2: Comercial, Marketing y Atención a Clientes</span>
              </div>
              {activeAccordion === 1 ? <ChevronUp className="text-slate-500 w-4 h-4" /> : <ChevronDown className="text-slate-500 w-4 h-4" />}
            </button>
            
            {activeAccordion === 1 && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/5">
                
                {/* PREGUNTA 3 (CHECKBOXES MULTIPLE) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Dónde guardas la información y datos de contacto de tus clientes?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'CRM Cloud', label: 'CRM en la Nube (Salesforce, HubSpot)' },
                      { value: 'Excel locales', label: 'Hojas de cálculo locales (Excel, CSV)' },
                      { value: 'ERP', label: 'Base integrada del ERP de la empresa (SAP, Defontana)' },
                      { value: 'Bases desorganizadas', label: 'Correos y carpetas compartidas desorganizadas' },
                      { value: 'Otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.value} className="space-y-1.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                          <input 
                            type="checkbox"
                            checked={formData.commercial_db_type.includes(item.value)}
                            onChange={() => handleMultiSelectToggle('commercial_db_type', item.value)}
                            className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.value === 'Otro' && formData.commercial_db_type.includes('Otro') && (
                          <div className="pl-6 pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.commercial_db_type_other}
                              onChange={e => handleInputChange('commercial_db_type_other', e.target.value)}
                              placeholder="Especifique otro lugar..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nombre de la herramienta y volumen estimado de contactos</label>
                  <input 
                    type="text"
                    value={formData.commercial_tool_volume}
                    onChange={e => handleInputChange('commercial_tool_volume', e.target.value)}
                    placeholder="ej. HubSpot - 12,500 leads"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Utilizas proveedores extranjeros (como servidores en la nube fuera de Chile) para guardar esta información?</label>
                  <select 
                    value={formData.commercial_server_country} 
                    onChange={e => handleInputChange('commercial_server_country', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Chile">Chile (Local)</option>
                    <option value="EE.UU.">Estados Unidos (US)</option>
                    <option value="Unión Europea">Unión Europea (Adecuado por RGPD)</option>
                    <option value="Desconocido">Desconocido</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.commercial_server_country === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.commercial_server_country_other}
                        onChange={e => handleInputChange('commercial_server_country_other', e.target.value)}
                        placeholder="Especifique el país/región..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                {/* PREGUNTA 4 (CHECKBOXES MULTIPLE) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Se graban las llamadas o reuniones virtuales?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'Sí en teléfono', label: 'Sí, llamadas de soporte/venta telefónica' },
                      { value: 'Sí en reuniones virtuales', label: 'Sí, reuniones virtuales (ej. Zoom, Teams, Meet)' },
                      { value: 'No', label: 'No, no se graba ningún tipo de comunicación' },
                      { value: 'Otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.value} className="space-y-1.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                          <input 
                            type="checkbox"
                            checked={formData.commercial_record_meetings.includes(item.value)}
                            onChange={() => handleMultiSelectToggle('commercial_record_meetings', item.value)}
                            className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.value === 'Otro' && formData.commercial_record_meetings.includes('Otro') && (
                          <div className="pl-6 pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.commercial_record_meetings_other}
                              onChange={e => handleInputChange('commercial_record_meetings_other', e.target.value)}
                              placeholder="Especifique otro escenario..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Se entrega aviso informativo previo sobre la grabación?</label>
                  <select 
                    value={formData.commercial_record_notice} 
                    onChange={e => handleInputChange('commercial_record_notice', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Sí automático">Sí, aviso de audio automático o banner emergente en la app</option>
                    <option value="No">No se advierte al usuario final en ningún momento</option>
                    <option value="Solo si preguntan">El agente lo menciona únicamente si el cliente lo pregunta</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.commercial_record_notice === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.commercial_record_notice_other}
                        onChange={e => handleInputChange('commercial_record_notice_other', e.target.value)}
                        placeholder="Especifique otra forma de dar aviso..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                {/* PREGUNTA: Rastreo de comportamiento (Pre-marcada si se detecta escáner) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      ¿Rastreas el comportamiento o las visitas de los usuarios en tu sitio web?
                    </label>
                    {detectedByScanner && (
                      <span className="text-[10px] text-amber-500 font-extrabold animate-pulse">
                        ⚠️ (Detectado automáticamente por el Escáner)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'Sí', label: 'Sí, usamos cookies de analítica o píxeles (ej. Google Analytics, Meta Pixel)' },
                      { value: 'No', label: 'No, no realizamos ningún tipo de seguimiento web' }
                    ].map(item => (
                      <label key={item.value} className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                        <input 
                          type="radio"
                          name="commercial_track_behavior"
                          value={item.value}
                          checked={formData.commercial_track_behavior === item.value}
                          onChange={() => handleInputChange('commercial_track_behavior', item.value)}
                          className="accent-indigo-600 focus:ring-0 bg-slate-950 w-4 h-4"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ACORDEÓN 3: TI, Ciberseguridad y Operaciones */}
          <div className="transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion(2)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className={`w-5 h-5 ${activeAccordion === 2 ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm text-white">Área 3: TI, Ciberseguridad y Operaciones</span>
              </div>
              {activeAccordion === 2 ? <ChevronUp className="text-slate-500 w-4 h-4" /> : <ChevronDown className="text-slate-500 w-4 h-4" />}
            </button>
            
            {activeAccordion === 2 && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/5">
                
                {/* PREGUNTA 5 (CHECKBOXES MULTIPLE) */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Quién tiene permiso para entrar y ver las bases de datos de tu empresa?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { value: 'Control estricto por Roles', label: 'Control estricto basado en roles (RBAC) con accesos mínimos' },
                      { value: 'Mismo usuario compartido', label: 'Credencial única o mismo usuario administrador compartido' },
                      { value: 'Todos tienen acceso', label: 'Toda la organización tiene acceso de manera predeterminada' },
                      { value: 'Sin política', label: 'No se cuenta con una política formal de accesos' },
                      { value: 'Otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.value} className="space-y-1.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
                          <input 
                            type="checkbox"
                            checked={formData.ti_rbac_type.includes(item.value)}
                            onChange={() => handleMultiSelectToggle('ti_rbac_type', item.value)}
                            className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.value === 'Otro' && formData.ti_rbac_type.includes('Otro') && (
                          <div className="pl-6 pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.ti_rbac_type_other}
                              onChange={e => handleInputChange('ti_rbac_type_other', e.target.value)}
                              placeholder="Especifique otro método..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Cargos con permisos de acceso a datos sensibles o masivos</label>
                  <input 
                    type="text"
                    value={formData.ti_sensitive_access_roles}
                    onChange={e => handleInputChange('ti_sensitive_access_roles', e.target.value)}
                    placeholder="ej. Administrador TI, Jefes de Operaciones, DPO"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿La información de tus bases de datos está cifrada (protegida con clave de seguridad)?</label>
                  <select 
                    value={formData.ti_encryption_type} 
                    onChange={e => handleInputChange('ti_encryption_type', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Cifradas en reposo y tránsito">Cifradas tanto en reposo (disco) como en tránsito (SSL/HTTPS)</option>
                    <option value="Solo en tránsito">Solo cifrado en tránsito (conexión SSL), disco sin cifrar</option>
                    <option value="Sin cifrar">Almacenadas en formato plano y sin cifrado activo</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.ti_encryption_type === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.ti_encryption_type_other}
                        onChange={e => handleInputChange('ti_encryption_type_other', e.target.value)}
                        placeholder="Especifique otro esquema..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Frecuencia y almacenamiento físico/lógico de backups (Copias)</label>
                  <input 
                    type="text"
                    value={formData.ti_backup_frequency}
                    onChange={e => handleInputChange('ti_backup_frequency', e.target.value)}
                    placeholder="ej. Diario automatizado en AWS S3 región Virginia con cifrado"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 4: Finanzas, Cobranza y Gestión Comercial */}
          <div className="transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion(3)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <DollarSign className={`w-5 h-5 ${activeAccordion === 3 ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm text-white">Área 4: Finanzas, Cobranza y Gestión Comercial</span>
              </div>
              {activeAccordion === 3 ? <ChevronUp className="text-slate-500 w-4 h-4" /> : <ChevronDown className="text-slate-500 w-4 h-4" />}
            </button>
            
            {activeAccordion === 3 && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Tienes una regla para borrar automáticamente las deudas que ya vencieron/prescribieron?</label>
                  <select 
                    value={formData.finances_debt_deletion} 
                    onChange={e => handleInputChange('finances_debt_deletion', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Sí automático">Sí, se purgan de forma automática al cumplir el plazo legal</option>
                    <option value="Solo a pedido">Se eliminan únicamente tras la solicitud formal del deudor</option>
                    <option value="No se eliminan">Se mantienen registrados indefinidamente para análisis interno</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.finances_debt_deletion === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.finances_debt_deletion_other}
                        onChange={e => handleInputChange('finances_debt_deletion_other', e.target.value)}
                        placeholder="Especifique otro procedimiento..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Criterio de retención histórico contable / tributario (años)</label>
                  <input 
                    type="text"
                    value={formData.finances_retention_rules}
                    onChange={e => handleInputChange('finances_retention_rules', e.target.value)}
                    placeholder="ej. Conservación por 6 años por regulaciones del SII"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 5: Proveedores y Terceros (Encargados) */}
          <div className="transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion(4)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileSignature className={`w-5 h-5 ${activeAccordion === 4 ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm text-white">Área 5: Proveedores y Terceros (Encargados)</span>
              </div>
              {activeAccordion === 4 ? <ChevronUp className="text-slate-500 w-4 h-4" /> : <ChevronDown className="text-slate-500 w-4 h-4" />}
            </button>
            
            {activeAccordion === 4 && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/5">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Compartes información de tus clientes con proveedores externos de servicios (ej. agencias, contadores, hosting)?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { key: 'mkt', label: 'Agencias de Marketing Digital' },
                      { key: 'accounting', label: 'Contadores y Asesores Externos' },
                      { key: 'cctv', label: 'Empresas de Seguridad / Cámaras' },
                      { key: 'saas', label: 'Proveedores SaaS / Nube' },
                      { key: 'none', label: 'No se comparte con ningún tercero' },
                      { key: 'otro', label: 'Otro (especificar)' }
                    ].map(item => (
                      <div key={item.key} className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={formData.vendors_transfer_types.includes(item.key)}
                            onChange={() => handleMultiSelectToggle('vendors_transfer_types', item.key)}
                            className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                          />
                          <span>{item.label}</span>
                        </label>
                        {item.key === 'otro' && formData.vendors_transfer_types.includes('otro') && (
                          <div className="pt-1">
                            <input 
                              type="text"
                              required
                              value={formData.vendors_transfer_types_other}
                              onChange={e => handleInputChange('vendors_transfer_types_other', e.target.value)}
                              placeholder="Especifique otros destinatarios..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nombre / Razón Social de los proveedores principales</label>
                  <input 
                    type="text"
                    value={formData.vendors_main_names}
                    onChange={e => handleInputChange('vendors_main_names', e.target.value)}
                    placeholder="ej. Amazon Web Services, Mailchimp Inc, Deloitte"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Tus contratos con estos proveedores incluyen un acuerdo de protección de datos (DPA)?</label>
                  <select 
                    value={formData.vendors_dpa_contracts} 
                    onChange={e => handleInputChange('vendors_dpa_contracts', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Sí todos">Sí, todos los contratos cuentan con anexo DPA vigente</option>
                    <option value="Solo algunos">Únicamente con proveedores multinacionales (ej. Google)</option>
                    <option value="Ninguno">No se cuenta con contratos que incluyan cláusulas de privacidad</option>
                    <option value="Otro">Otro (especificar)</option>
                  </select>
                  {formData.vendors_dpa_contracts === 'Otro' && (
                    <div className="mt-2">
                      <input 
                        type="text"
                        required
                        value={formData.vendors_dpa_contracts_other}
                        onChange={e => handleInputChange('vendors_dpa_contracts_other', e.target.value)}
                        placeholder="Especifique otro estado de DPA..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                {/* SHADOW IT HUNTER CHECKLIST INTEGRATED */}
                <div className="md:col-span-2 mt-4 border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="text-indigo-400 w-4 h-4" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Inventario de Herramientas SaaS y Nube (Shadow IT)</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Declare las herramientas externas que utiliza su organización en el día a día. Esto generará la bitácora de proveedores y auditará de forma preventiva las transferencias internacionales.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {shadowItGroups.map(group => (
                      <div key={group.id} className="bg-slate-950/40 p-4 rounded-lg border border-slate-850">
                        <span className="text-xs font-bold text-indigo-400 block mb-3">{group.title}</span>
                        <div className="space-y-2">
                          {group.options.map(opt => {
                            const isChecked = formData.shadow_it_providers.includes(opt.key);
                            return (
                              <label key={opt.key} className="flex items-start gap-2.5 text-xs text-slate-450 cursor-pointer select-none hover:text-slate-200 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextList = isChecked
                                      ? formData.shadow_it_providers.filter(k => k !== opt.key)
                                      : [...formData.shadow_it_providers, opt.key];
                                    handleInputChange('shadow_it_providers', nextList);
                                  }}
                                  className="rounded border-slate-850 text-indigo-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5 mt-0.5"
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
          
          {/* Action Row */}
          <div className="p-6 bg-slate-900/30 flex justify-end gap-3 rounded-b-xl border-t border-slate-850">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Procesar Diagnóstico Legal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
