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
  ArrowRight
} from 'lucide-react';

interface QuestionnaireState {
  // Area 1: RRHH
  rrhh_storage_type: string;
  rrhh_storage_details: string;
  rrhh_health_data: string[];
  rrhh_destruction_proc: string;
  rrhh_attendance_tech: string;
  rrhh_biometric_consent: string;
  rrhh_biometric_vendor: string;
  
  // Area 2: Comercial & Marketing
  commercial_db_type: string;
  commercial_tool_volume: string;
  commercial_server_country: string;
  commercial_record_meetings: string;
  commercial_record_notice: string;

  // Area 3: TI & Ciberseguridad
  ti_rbac_type: string;
  ti_sensitive_access_roles: string;
  ti_encryption_type: string;
  ti_backup_frequency: string;

  // Area 4: Finanzas & Cobranza
  finances_debt_deletion: string;
  finances_retention_rules: string;

  // Area 5: Proveedores & Terceros
  vendors_transfer_types: string[];
  vendors_main_names: string;
  vendors_dpa_contracts: string;
}

const initialFormState: QuestionnaireState = {
  rrhh_storage_type: '',
  rrhh_storage_details: '',
  rrhh_health_data: [],
  rrhh_destruction_proc: '',
  rrhh_attendance_tech: '',
  rrhh_biometric_consent: '',
  rrhh_biometric_vendor: '',
  
  commercial_db_type: '',
  commercial_tool_volume: '',
  commercial_server_country: '',
  commercial_record_meetings: '',
  commercial_record_notice: '',

  ti_rbac_type: '',
  ti_sensitive_access_roles: '',
  ti_encryption_type: '',
  ti_backup_frequency: '',

  finances_debt_deletion: '',
  finances_retention_rules: '',

  vendors_transfer_types: [],
  vendors_main_names: '',
  vendors_dpa_contracts: ''
};

interface DiagnosticQuestionnaireProps {
  onSubmit: (answers: any) => void;
}

export default function DiagnosticQuestionnaire({ onSubmit }: DiagnosticQuestionnaireProps) {
  const [formData, setFormData] = useState<QuestionnaireState>(initialFormState);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleInputChange = (field: keyof QuestionnaireState, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field: 'rrhh_health_data' | 'vendors_transfer_types', value: string) => {
    const currentList = formData[field] as string[];
    const updatedList = currentList.includes(value)
      ? currentList.filter(item => item !== value)
      : [...currentList, value];
    
    handleInputChange(field, updatedList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📊 [Diagnóstico Legal] Cuestionario Operativo Interno Enviado:', formData);
    setFormSubmitted(true);
    onSubmit(formData);
    
    // Smooth scroll to top of the questionnaire
    const element = document.getElementById('diagnostic-questionnaire-root');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setFormSubmitted(false);
    setActiveAccordion(0);
  };

  return (
    <div id="diagnostic-questionnaire-root" className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
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
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Dónde se almacenan los CVs y fichas de empleados?</label>
                  <select 
                    value={formData.rrhh_storage_type} 
                    onChange={e => handleInputChange('rrhh_storage_type', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Físico">Archiveros Físicos</option>
                    <option value="Nube">Almacenamiento en la Nube (Drive, Dropbox)</option>
                    <option value="Software RRHH">Software especializado de RRHH (ej. Buk, Talana)</option>
                    <option value="Correo">Casillas de Correo Electrónico</option>
                    <option value="Híbrido">Esquema Híbrido (Papel y Digital)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Detalle de ubicación / nombre de software</label>
                  <input 
                    type="text"
                    value={formData.rrhh_storage_details}
                    onChange={e => handleInputChange('rrhh_storage_details', e.target.value)}
                    placeholder="ej. Bóveda oficina central / Buk Chile"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Qué datos de salud maneja el departamento de personas? (Art. 16 bis)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { key: 'licencias', label: 'Licencias médicas recibidas' },
                      { key: 'examenes_ocup', label: 'Exámenes ocupacionales' },
                      { key: 'afp_isapre', label: 'Certificados Isapre / Fonasa / AFP' },
                      { key: 'drogas', label: 'Controles de drogas / alcohol' },
                      { key: 'ninguno', label: 'Ninguno' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={formData.rrhh_health_data.includes(item.key)}
                          onChange={() => handleCheckboxChange('rrhh_health_data', item.key)}
                          className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                        />
                        <span>{item.label}</span>
                      </label>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Qué tecnología utiliza para control de asistencia? (Art. 16 ter)</label>
                  <select 
                    value={formData.rrhh_attendance_tech} 
                    onChange={e => handleInputChange('rrhh_attendance_tech', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Huella">Biometría Dactilar (Huella)</option>
                    <option value="Rostro/Iris">Biometría Facial / Iris</option>
                    <option value="Papel">Libro de Asistencia Físico (Papel)</option>
                    <option value="Tarjeta">Tarjeta de Proximidad RFID</option>
                    <option value="App sin biometría">Aplicación móvil (Marcaje sin biométricos)</option>
                  </select>
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
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Proveedor del sistema biométrico / de asistencia</label>
                  <input 
                    type="text"
                    value={formData.rrhh_biometric_vendor}
                    onChange={e => handleInputChange('rrhh_biometric_vendor', e.target.value)}
                    placeholder="ej. GeoVictoria, ZKTeco, Relojcontrol"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
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
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Dónde reside la base de datos principal de clientes?</label>
                  <select 
                    value={formData.commercial_db_type} 
                    onChange={e => handleInputChange('commercial_db_type', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="CRM Cloud">CRM en la Nube (Salesforce, HubSpot)</option>
                    <option value="Excel locales">Hojas de cálculo locales (Excel, CSV)</option>
                    <option value="ERP">Base integrada del ERP de la empresa (SAP, Defontana)</option>
                    <option value="Bases desorganizadas">Correos y carpetas compartidas desorganizadas</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nombre de la herramienta y volumen estimado de contactos</label>
                  <input 
                    type="text"
                    value={formData.commercial_tool_volume}
                    onChange={e => handleInputChange('commercial_tool_volume', e.target.value)}
                    placeholder="ej. HubSpot - 12,500 leads"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿País donde residen los servidores de la herramienta comercial? (TID)</label>
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
                    <option value="Otro">Otro país / Región múltiple</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Se graban las llamadas o reuniones virtuales?</label>
                  <select 
                    value={formData.commercial_record_meetings} 
                    onChange={e => handleInputChange('commercial_record_meetings', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Sí en teléfono">Sí, llamadas de soporte/venta telefónica</option>
                    <option value="Sí en reuniones virtuales">Sí, reuniones virtuales (ej. Zoom, Teams, Meet)</option>
                    <option value="No">No, no se graba ningún tipo de comunicación</option>
                  </select>
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
                  </select>
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
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Cómo se gestiona el acceso a las bases de datos? (RBAC)</label>
                  <select 
                    value={formData.ti_rbac_type} 
                    onChange={e => handleInputChange('ti_rbac_type', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Control estricto por Roles">Control estricto basado en roles (RBAC) con accesos mínimos</option>
                    <option value="Mismo usuario compartido">Credencial única o mismo usuario administrador compartido</option>
                    <option value="Todos tienen acceso">Toda la organización tiene acceso de manera predeterminada</option>
                    <option value="Sin política">No se cuenta con una política formal de accesos</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Cargos con permisos de acceso a datos sensibles o masivos</label>
                  <input 
                    type="text"
                    value={formData.ti_sensitive_access_roles}
                    onChange={e => handleInputChange('ti_sensitive_access_roles', e.target.value)}
                    placeholder="ej. Administrador TI, Jefes de Operaciones, DPO"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Las bases de datos e integraciones cuentan con cifrado? (Art. 14 quinquies)</label>
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
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Frecuencia y almacenamiento físico/lógico de backups (Copias)</label>
                  <input 
                    type="text"
                    value={formData.ti_backup_frequency}
                    onChange={e => handleInputChange('ti_backup_frequency', e.target.value)}
                    placeholder="ej. Diario automatizado en AWS S3 región Virginia con cifrado"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Existe un procedimiento para eliminar datos de deudas prescriptas? (Art. 17)</label>
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
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Criterio de retención histórico contable / tributario (años)</label>
                  <input 
                    type="text"
                    value={formData.finances_retention_rules}
                    onChange={e => handleInputChange('finances_retention_rules', e.target.value)}
                    placeholder="ej. Conservación por 6 años por regulaciones del SII"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
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
                  <label className="text-xs font-semibold text-slate-300 block mb-2">¿Se transfieren bases de datos a proveedores de servicios? (Art. 15 bis)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    {[
                      { key: 'mkt', label: 'Agencias de Marketing Digital' },
                      { key: 'accounting', label: 'Contadores y Asesores Externos' },
                      { key: 'cctv', label: 'Empresas de Seguridad / Cámaras' },
                      { key: 'saas', label: 'Proveedores SaaS / Nube' },
                      { key: 'none', label: 'No se comparte con ningún tercero' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={formData.vendors_transfer_types.includes(item.key)}
                          onChange={() => handleCheckboxChange('vendors_transfer_types', item.key)}
                          className="rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                        />
                        <span>{item.label}</span>
                      </label>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-655 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">¿Los contratos vigentes con estos terceros incluyen cláusulas DPA?</label>
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
                  </select>
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
