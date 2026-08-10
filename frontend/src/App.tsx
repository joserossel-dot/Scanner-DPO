import { useState, useEffect, FormEvent } from 'react';
import { 
  Shield, 
  Activity, 
  Settings, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Sliders, 
  Calendar, 
  ExternalLink 
} from 'lucide-react';

interface AuditFinding {
  id: string;
  category: string;
  severity: 'Leve' | 'Grave' | 'Gravísima';
  description: string;
  recommendation: string;
  details?: string;
}

interface ActionStep {
  step: number;
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  estimatedEffort: string;
  details: string;
}

interface AuditResult {
  url: string;
  score: number;
  findings: AuditFinding[];
  severityCounts: {
    leve: number;
    grave: number;
    gravisima: number;
  };
  actionPlan?: ActionStep[];
  pagesAnalyzed?: string[];
  created_at?: string;
}

interface ConsentStats {
  total: number;
  breakdown: {
    essential: number;
    analytical: number;
    marketing: number;
  };
  timeline: { date: string; count: number }[];
}

interface ConsentLog {
  id: number;
  domain: string;
  ip_hash: string;
  consent_types: {
    essential: boolean;
    analytical: boolean;
    marketing: boolean;
  };
  user_agent: string;
  policy_version: string;
  timestamp: string;
}

interface ArcoTicket {
  id: number;
  domain: string;
  requester_name: string;
  requester_email: string;
  request_type: string;
  details: string;
  status: 'Pendiente' | 'En Proceso' | 'Resuelto';
  due_date: string;
  created_at: string;
  resolved_at?: string | null;
}

interface PolicyContent {
  representative: string;
  representative_email: string;
  purposes: string;
  retention_time: string;
  exercise_channels: string;
}

interface ClientConfig {
  domain: string;
  company_name: string;
  policy_version: string;
  policy_content: PolicyContent;
  banner_title: string;
  banner_description: string;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'consents' | 'arco' | 'config'>('dashboard');
  
  // State variables
  const [latestScan, setLatestScan] = useState<AuditResult | null>(null);
  const [consentsStats, setConsentsStats] = useState<ConsentStats | null>(null);
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([]);
  const [arcoTickets, setArcoTickets] = useState<ArcoTicket[]>([]);
  const [config, setConfig] = useState<ClientConfig | null>(null);
  
  // Actions states
  const [scanUrl, setScanUrl] = useState('localhost:3000/mock-site/index.html');
  const [isScanning, setIsScanning] = useState(false);
  const [configRepresentative, setConfigRepresentative] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [configPurposes, setConfigPurposes] = useState('');
  const [configRetention, setConfigRetention] = useState('');
  const [configChannels, setConfigChannels] = useState('');
  const [configCompanyName, setConfigCompanyName] = useState('');
  const [configBannerTitle, setConfigBannerTitle] = useState('');
  const [configBannerDesc, setConfigBannerDesc] = useState('');
  const [configVersion, setConfigVersion] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Module 3 State Variables (International Transfers - TID)
  const [transfers, setTransfers] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [isGeneratingScc, setIsGeneratingScc] = useState(false);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [vendorName, setVendorName] = useState('');
  const [destCountry, setDestCountry] = useState('US');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mechanism, setMechanism] = useState('STANDARD_CLAUSES');
  const [signedScc, setSignedScc] = useState(false);
  const [sccUrl, setSccUrl] = useState('');

  // SCC Builder state
  const [sccExporterName, setSccExporterName] = useState('');
  const [sccExporterRut, setSccExporterRut] = useState('');
  const [sccExporterAddress, setSccExporterAddress] = useState('');
  const [sccImporterName, setSccImporterName] = useState('');
  const [sccImporterAddress, setSccImporterAddress] = useState('');
  const [generatedSccText, setGeneratedSccText] = useState('');

  // Load basic statistics on mount
  useEffect(() => {
    fetchLatestScan();
    fetchConsentsStats();
    fetchConsentLogs();
    fetchArcoTickets();
    fetchConfig();
  }, []);

  const fetchLatestScan = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scan/latest`);
      if (res.ok) {
        const data = await res.json();
        setLatestScan(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConsentsStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/consents/stats`);
      if (res.ok) {
        const data = await res.json();
        setConsentsStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConsentLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/consents/logs`);
      if (res.ok) {
        const data = await res.json();
        setConsentLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArcoTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/arco/tickets`);
      if (res.ok) {
        const data = await res.json();
        setArcoTickets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/localhost:3000`);
      if (res.ok) {
        const data: ClientConfig = await res.json();
        setConfig(data);
        setConfigCompanyName(data.company_name);
        setConfigVersion(data.policy_version);
        setConfigBannerTitle(data.banner_title);
        setConfigBannerDesc(data.banner_description);
        
        const content = data.policy_content;
        setConfigRepresentative(content.representative);
        setConfigEmail(content.representative_email);
        setConfigPurposes(content.purposes);
        setConfigRetention(content.retention_time);
        setConfigChannels(content.exercise_channels);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Módulo 3 API Operations (TID) ---
  const fetchTransfers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers?domain=localhost:3000`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data);
      }
    } catch (e) {
      console.error('Error fetching transfers:', e);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers/countries`);
      if (res.ok) {
        const data = await res.json();
        setCountries(data);
      }
    } catch (e) {
      console.error('Error fetching countries:', e);
    }
  };

  const handleCreateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'localhost:3000',
          vendor_name: vendorName,
          destination_country: destCountry,
          data_categories: selectedCategories,
          transfer_mechanism: mechanism,
          has_signed_scc: signedScc,
          scc_document_url: sccUrl
        })
      });
      if (res.ok) {
        alert('Flujo transfronterizo registrado con éxito.');
        fetchTransfers();
        setIsAddingTransfer(false);
        // Reset wizard
        setVendorName('');
        setDestCountry('US');
        setSelectedCategories([]);
        setMechanism('STANDARD_CLAUSES');
        setSignedScc(false);
        setSccUrl('');
        setWizardStep(1);
        setGeneratedSccText('');
      }
    } catch (error) {
      console.error(error);
      alert('Error al registrar flujo internacional.');
    }
  };

  const handleGenerateScc = async () => {
    setIsGeneratingScc(true);
    try {
      const res = await fetch(`${API_BASE}/api/transfers/generate-scc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exporterName: sccExporterName,
          exporterRut: sccExporterRut,
          exporterAddress: sccExporterAddress,
          importerName: sccImporterName,
          importerCountry: destCountry,
          importerAddress: sccImporterAddress,
          dataCategories: selectedCategories.length > 0 ? selectedCategories : ['emails', 'billing_details']
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSccText(data.sccContent);
      }
    } catch (error) {
      console.error(error);
      alert('Error al generar cláusulas tipo.');
    } finally {
      setIsGeneratingScc(false);
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de transferencia?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        fetchTransfers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getRiskStatus = (transfer: any, countriesList: any[]) => {
    const country = countriesList.find(c => c.country_name === transfer.destination_country || c.country_code === transfer.destination_country);
    const isAdequate = country ? country.is_adequate : false;
    
    if (isAdequate || transfer.transfer_mechanism === 'BCR' || (transfer.transfer_mechanism === 'STANDARD_CLAUSES' && transfer.has_signed_scc)) {
      return { status: 'Conforme', color: 'var(--color-success)', badgeClass: 'badge-leve', text: '🟢 Cumple' };
    }
    if (transfer.transfer_mechanism === 'CONSENT_EXCEPTIONAL' || transfer.transfer_mechanism === 'OTHER') {
      return { status: 'En Revisión', color: 'var(--color-warning)', badgeClass: 'badge-grave', text: '🟡 Excepción / En Revisión' };
    }
    return { status: 'No Conforme (Riesgo Alto)', color: 'var(--color-danger)', badgeClass: 'badge-gravisima', text: '🔴 Riesgo Crítico' };
  };

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!scanUrl) return;
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestScan(data);
        fetchConsentsStats(); // Refresh in case mock stats updated
      }
    } catch (err) {
      console.error(err);
      alert('Error al realizar escaneo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/config/localhost:3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: configCompanyName,
          policy_version: configVersion,
          banner_title: configBannerTitle,
          banner_description: configBannerDesc,
          policy_content: {
            representative: configRepresentative,
            representative_email: configEmail,
            purposes: configPurposes,
            retention_time: configRetention,
            exercise_channels: configChannels
          }
        })
      });
      if (res.ok) {
        alert('Configuración guardada y widget actualizado con éxito.');
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
      alert('Error guardando configuración.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpdateTicketStatus = async (id: number, status: 'Pendiente' | 'En Proceso' | 'Resuelto') => {
    try {
      const res = await fetch(`${API_BASE}/api/arco/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchArcoTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to compute deadline colors and remaining text
  const getDeadlineBadge = (ticket: ArcoTicket) => {
    if (ticket.status === 'Resuelto') {
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} /> Resuelto
        </span>
      );
    }

    const due = new Date(ticket.due_date);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isBloqueo = ticket.request_type === 'Bloqueo';

    if (diffDays <= 0) {
      return (
        <span className="badge badge-gravisima">
          <Clock size={12} /> Vencido ({Math.abs(diffDays)}d)
        </span>
      );
    }

    if (isBloqueo || diffDays <= 2) {
      return (
        <span className="badge badge-grave">
          <Clock size={12} /> Critico ({diffDays}d hábiles/corridos)
        </span>
      );
    }

    return (
      <span className="badge badge-leve">
        <Clock size={12} /> Quedan {diffDays} días
      </span>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Shield size={20} />
          </div>
          <span>PrivacyTech</span>
        </div>
        
        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); fetchConsentsStats(); fetchArcoTickets(); }}
          >
            <Activity size={16} />
            <span>Vista General</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => { setActiveTab('scanner'); fetchLatestScan(); }}
          >
            <Search size={16} />
            <span>Crawler Auditor</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'consents' ? 'active' : ''}`}
            onClick={() => { setActiveTab('consents'); fetchConsentLogs(); }}
          >
            <UserCheck size={16} />
            <span>Logs de Consentimiento</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'arco' ? 'active' : ''}`}
            onClick={() => { setActiveTab('arco'); fetchArcoTickets(); }}
          >
            <Clock size={16} />
            <span>Bandeja ARCO+</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('transfers'); fetchTransfers(); fetchCountries(); }}
          >
            <ExternalLink size={16} />
            <span>Transf. Internacionales</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => { setActiveTab('config'); fetchConfig(); }}
          >
            <Settings size={16} />
            <span>Configuración de Política</span>
          </div>
        </nav>
        
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          Cumplimiento Ley N° 21.719
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-workspace">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Panel de Control de Privacidad</h1>
              <p className="page-subtitle">Monitoreo de cumplimiento normativo y logs en tiempo real para {config?.company_name || 'localhost'}.</p>
            </header>

            <div className="dashboard-grid">
              
              {/* Compliance Score Widget */}
              <div className="card col-4">
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Nivel de Cumplimiento</h3>
                {latestScan ? (
                  <div>
                    <div className="score-container">
                      <svg className="score-svg">
                        <circle className="score-bg-circle" cx="70" cy="70" r="58" />
                        <circle 
                          className="score-fill-circle" 
                          cx="70" 
                          cy="70" 
                          r="58" 
                          strokeDasharray={364.4}
                          strokeDashoffset={364.4 - (364.4 * latestScan.score) / 100}
                          style={{
                            stroke: latestScan.score >= 80 ? 'var(--color-success)' : latestScan.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        />
                      </svg>
                      <div className="score-text">
                        <span className="score-num">{latestScan.score}%</span>
                        <span className="score-label">Score</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span className={`badge ${latestScan.score >= 80 ? 'badge-success' : latestScan.score >= 50 ? 'badge-leve' : 'badge-gravisima'}`}>
                        {latestScan.score >= 80 ? 'Cumplimiento Alto' : latestScan.score >= 50 ? 'Cumplimiento Medio' : 'Requiere Acción Crítica'}
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                        Última auditoría realizada al sitio:<br />
                        <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{latestScan.url}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Search size={32} />
                    <p>No hay escaneos registrados.</p>
                    <button className="btn-scan" style={{ margin: '10px auto 0 auto' }} onClick={() => setActiveTab('scanner')}>Escanear Ahora</button>
                  </div>
                )}
              </div>

              {/* Consent Stats */}
              <div className="card col-4">
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Volumen de Consentimientos</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Estadísticas de aceptación de cookies por categorías.</p>
                {consentsStats && consentsStats.total > 0 ? (
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: 700, margin: '10px 0' }}>
                      {consentsStats.total} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>usuarios registrados</span>
                    </div>
                    
                    <div className="bar-chart">
                      <div className="bar-row">
                        <span className="bar-label">Esenciales</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: '100%', background: 'var(--color-success)' }}></div>
                        </div>
                        <span className="bar-value">{consentsStats.total}</span>
                      </div>
                      
                      <div className="bar-row">
                        <span className="bar-label">Analíticas</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(consentsStats.breakdown.analytical / consentsStats.total) * 100}%` }}></div>
                        </div>
                        <span className="bar-value">{consentsStats.breakdown.analytical}</span>
                      </div>

                      <div className="bar-row">
                        <span className="bar-label">Marketing</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(consentsStats.breakdown.marketing / consentsStats.total) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}></div>
                        </div>
                        <span className="bar-value">{consentsStats.breakdown.marketing}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Sliders size={32} />
                    <p>Esperando registros de consentimientos...</p>
                  </div>
                )}
              </div>

              {/* ARCO+ Urgency Alert */}
              <div className="card col-4">
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Solicitudes ARCO+ Activas</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Tareas pendientes que requieren respuesta legal rápida.</p>
                
                {arcoTickets.filter(t => t.status !== 'Resuelto').length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '10px' }}>
                      <AlertTriangle color="var(--color-danger)" size={20} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {arcoTickets.filter(t => t.status !== 'Resuelto').length} solicitudes pendientes
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Atención inmediata obligatoria bajo multas de Ley N° 21.719.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                      {arcoTickets.filter(t => t.status !== 'Resuelto').map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span><strong>{t.request_type}</strong> - {t.requester_name}</span>
                          {getDeadlineBadge(t)}
                        </div>
                      ))}
                    </div>

                    <button className="btn-action btn-action-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setActiveTab('arco')}>
                      Ver Bandeja de Entrada
                    </button>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <CheckCircle color="var(--color-success)" size={32} />
                    <p style={{ margin: '10px 0 0 0' }}>Bandeja ARCO+ vacía. ¡Excelente gestión!</p>
                  </div>
                )}
              </div>

              {/* Demo Section details / Link to mock */}
              <div className="card col-12" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600 }}>Integración y Pruebas del Widget CMP</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Hemos habilitado un sitio de prueba simulando la web de su negocio donde se inyecta el widget. Cargue y simule interacciones para auditar cookies y ARCO+.
                    </p>
                  </div>
                  <a href="/mock-site/index.html" target="_blank" className="btn-scan" style={{ textDecoration: 'none' }}>
                    <span>Abrir Sitio de Prueba</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CRAWLER AUDITOR */}
        {activeTab === 'scanner' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Crawler Auditor Ley N° 21.719</h1>
              <p className="page-subtitle">Simule o audite en vivo cualquier URL para verificar brechas de cumplimiento, scripts de terceros invasivos y opt-ins ausentes.</p>
            </header>

            <div className="card" style={{ marginBottom: '24px' }}>
              <form onSubmit={handleScan}>
                <label className="form-label">Ingresa la URL del sitio web a Auditar</label>
                <div className="scan-input-group">
                  <input 
                    type="text" 
                    className="input-text" 
                    value={scanUrl} 
                    onChange={e => setScanUrl(e.target.value)} 
                    placeholder="ej. misitio.cl o localhost:3000/mock-site/index.html"
                    disabled={isScanning}
                  />
                  <button type="submit" className="btn-scan" disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <RefreshCw className="loader" size={16} />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        <span>Iniciar Auditoría</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Tip:</strong> Puedes ingresar la URL del sitio mock provisto <code>localhost:3000/mock-site/index.html</code> para simular el diagnóstico y ver cómo reacciona el escáner a los scripts de seguimiento activos.
              </div>
            </div>

            {latestScan && (
              <>
                <div className="dashboard-grid">
                
                {/* Score and stats */}
                <div className="card col-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="score-container">
                    <svg className="score-svg">
                      <circle className="score-bg-circle" cx="70" cy="70" r="58" />
                      <circle 
                        className="score-fill-circle" 
                        cx="70" 
                        cy="70" 
                        r="58" 
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * latestScan.score) / 100}
                        style={{
                          stroke: latestScan.score >= 80 ? 'var(--color-success)' : latestScan.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}
                      />
                    </svg>
                    <div className="score-text">
                      <span className="score-num">{latestScan.score}%</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <h3>Reporte de Auditoría</h3>
                    <p style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', margin: '4px 0 8px 0', wordBreak: 'break-all' }}>
                      {latestScan.url}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Hallazgos detectados:<br />
                      <span className="badge badge-gravisima" style={{ margin: '4px' }}>{latestScan.severityCounts.gravisima} Gravísimas</span>
                      <span className="badge badge-grave" style={{ margin: '4px' }}>{latestScan.severityCounts.grave} Graves</span>
                      <span className="badge badge-leve" style={{ margin: '4px' }}>{latestScan.severityCounts.leve} Leves</span>
                    </p>
                  </div>
                </div>

                {/* Findings list */}
                <div className="card col-8">
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
                    Brechas de Cumplimiento Identificadas para: <span style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>{latestScan.url}</span>
                  </h3>
                  {latestScan.findings.length > 0 ? (
                    <div className="findings-list">
                      {latestScan.findings.map(finding => (
                        <div key={finding.id} className="finding-item">
                          <div className="finding-severity">
                            <span className={`badge ${finding.severity === 'Gravísima' ? 'badge-gravisima' : finding.severity === 'Grave' ? 'badge-grave' : 'badge-leve'}`}>
                              {finding.severity}
                            </span>
                          </div>
                          <div className="finding-content">
                            <h4 className="finding-title">{finding.description}</h4>
                            <p className="finding-desc">{finding.details}</p>
                            <p className="finding-recom">
                              <strong>💡 Recomendación Ley N° 21.719:</strong> {finding.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <CheckCircle color="var(--color-success)" size={48} />
                      <p style={{ marginTop: '12px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>¡Felicitaciones! Cumplimiento del 100%.</p>
                      <p style={{ margin: 0 }}>No se encontraron brechas de consentimiento ni trackers desprotegidos.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Plan de Acción de Mitigación */}
              {latestScan.actionPlan && latestScan.actionPlan.length > 0 && (
                <div className="card" style={{ marginTop: '24px' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={20} color="var(--color-primary)" />
                    <span>Plan de Acción de Mitigación (Cumplimiento Ley N° 21.719)</span>
                  </h3>
                  
                  {/* Páginas analizadas */}
                  {latestScan.pagesAnalyzed && latestScan.pagesAnalyzed.length > 0 && (
                    <div style={{ 
                      marginBottom: '20px', 
                      padding: '12px 16px', 
                      background: 'rgba(99, 102, 241, 0.05)', 
                      borderRadius: '8px', 
                      borderLeft: '4px solid var(--color-primary)', 
                      fontSize: '13px' 
                    }}>
                      <strong>Rastreo Multi-página Completo — Enlaces analizados:</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        {latestScan.pagesAnalyzed.map((p, idx) => (
                          <li key={idx} style={{ wordBreak: 'break-all', marginTop: '2px' }}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="action-plan-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {latestScan.actionPlan.map((step) => (
                      <div key={step.step} className="action-step-item" style={{
                        display: 'flex',
                        borderLeft: `4px solid ${step.priority === 'Alta' ? 'var(--color-danger)' : step.priority === 'Media' ? 'var(--color-warning)' : 'var(--color-success)'}`,
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '20px',
                        borderRadius: '0 12px 12px 0',
                        gap: '16px'
                      }}>
                        <div style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {step.step}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{step.title}</h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span className={`badge ${step.priority === 'Alta' ? 'badge-gravisima' : step.priority === 'Media' ? 'badge-grave' : 'badge-leve'}`}>
                                Prioridad {step.priority}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--text-secondary)'
                              }}>
                                ⏱️ Esfuerzo: {step.estimatedEffort}
                              </span>
                            </div>
                          </div>
                          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{step.description}</p>
                          <div style={{
                            padding: '12px 16px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            <strong>Recomendación Técnica:</strong><br/>
                            {step.details}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: CONSENT LOGS */}
        {activeTab === 'consents' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Historial y Logs de Consentimiento</h1>
              <p className="page-subtitle">Registro de auditoría del consentimiento de cookies. La Ley exige mantener trazabilidad para el deber de prueba.</p>
            </header>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Registro Histórico (Consent Audit Trail)</h3>
                <button className="btn-action" onClick={fetchConsentLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={12} /> Refrescar
                </button>
              </div>

              {consentLogs.length > 0 ? (
                <div className="table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Dominio</th>
                        <th>Hash IP (Anonimizado)</th>
                        <th>Consentimientos Guardados</th>
                        <th>Versión Política</th>
                        <th>Timestamp (Fecha)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consentLogs.map(log => (
                        <tr key={log.id}>
                          <td><code>#{log.id}</code></td>
                          <td>{log.domain}</td>
                          <td><code>{log.ip_hash}</code></td>
                          <td>
                            <div className="consent-types-list">
                              <span className={`type-pill ${log.consent_types.essential ? 'type-pill-active' : 'type-pill-inactive'}`}>
                                Esenciales
                              </span>
                              <span className={`type-pill ${log.consent_types.analytical ? 'type-pill-active' : 'type-pill-inactive'}`}>
                                Analítica
                              </span>
                              <span className={`type-pill ${log.consent_types.marketing ? 'type-pill-active' : 'type-pill-inactive'}`}>
                                Marketing
                              </span>
                            </div>
                          </td>
                          <td><span className="badge badge-leve">{log.policy_version}</span></td>
                          <td>{new Date(log.timestamp).toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <UserCheck size={48} />
                  <p style={{ marginTop: '12px' }}>Aún no se registran interacciones en el widget del sitio de prueba.</p>
                  <p style={{ fontSize: '13px' }}>Abra el <a href="/mock-site/index.html" target="_blank" style={{ color: 'var(--color-accent)' }}>Sitio de Prueba</a> y haga clic en 'Aceptar Todo' en el banner para registrar consentimientos.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCO+ BANDERA INBOX */}
        {activeTab === 'arco' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Gestión de Solicitudes ARCO+</h1>
              <p className="page-subtitle">Canal para resolver derechos de Acceso, Rectificación, Supresión, Oposición, Portabilidad y Bloqueo Temporal (Art. 4, 10 y 11 de la Ley).</p>
            </header>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Tickets de Derechos de Titulares</h3>
                <button className="btn-action" onClick={fetchArcoTickets} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={12} /> Refrescar
                </button>
              </div>

              {arcoTickets.length > 0 ? (
                <div className="tickets-grid">
                  {arcoTickets.map(ticket => {
                    const isBloqueo = ticket.request_type === 'Bloqueo';
                    return (
                      <div key={ticket.id} className="ticket-card" style={{ borderLeft: isBloqueo && ticket.status !== 'Resuelto' ? '4px solid var(--color-danger)' : '1px solid var(--border-color)' }}>
                        <div className="ticket-header">
                          <div>
                            <h4 className="ticket-title">
                              Derecho de {ticket.request_type} - {ticket.requester_name}
                            </h4>
                            <div className="ticket-meta">
                              <span>📧 {ticket.requester_email}</span>
                              <span>🌐 {ticket.domain}</span>
                              <span>📅 Solicitado: {new Date(ticket.created_at).toLocaleDateString('es-CL')}</span>
                            </div>
                          </div>
                          <div>
                            {getDeadlineBadge(ticket)}
                          </div>
                        </div>

                        <div className="ticket-details">
                          <strong>Detalle de la solicitud:</strong><br />
                          {ticket.details}
                        </div>

                        <div className="ticket-footer">
                          <div className="ticket-time-limit">
                            {isBloqueo ? (
                              <span className="limit-urgent" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> <strong>Atención Plazo Legal Corto:</strong> 2 días hábiles máximo para Bloqueo Temporal.
                              </span>
                            ) : (
                              <span className="limit-safe" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                                <Calendar size={12} /> 30 días corridos para resolver otros derechos ARCO+.
                              </span>
                            )}
                          </div>

                          <div className="ticket-actions">
                            {ticket.status !== 'Pendiente' && ticket.status !== 'Resuelto' && (
                              <button 
                                className="btn-action" 
                                onClick={() => handleUpdateTicketStatus(ticket.id, 'Pendiente')}
                              >
                                Volver a Pendiente
                              </button>
                            )}
                            
                            {ticket.status === 'Pendiente' && (
                              <button 
                                className="btn-action" 
                                onClick={() => handleUpdateTicketStatus(ticket.id, 'En Proceso')}
                                style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                              >
                                Procesar Solicitud
                              </button>
                            )}

                            {ticket.status !== 'Resuelto' && (
                              <button 
                                className="btn-action btn-action-primary" 
                                onClick={() => handleUpdateTicketStatus(ticket.id, 'Resuelto')}
                              >
                                Resolver y Notificar
                              </button>
                            )}

                            {ticket.status === 'Resuelto' && (
                              <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={12} /> Resuelto el {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString('es-CL') : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Clock size={48} />
                  <p style={{ marginTop: '12px' }}>Aún no se reciben solicitudes de titulares (ARCO+).</p>
                  <p style={{ fontSize: '13px' }}>Abra el <a href="/mock-site/index.html" target="_blank" style={{ color: 'var(--color-accent)' }}>Sitio de Prueba</a>, abra el portal de privacidad haciendo clic en el escudo flotante y envíe un requerimiento.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: POLICY CONFIGURATION */}
        {activeTab === 'config' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Gestión de la Política de Privacidad Dinámica</h1>
              <p className="page-subtitle">Redacte y actualice el texto de su política. Los cambios se reflejarán instantáneamente en el widget de consentimiento del cliente.</p>
            </header>

            <div className="card">
              <form onSubmit={handleSaveConfig} className="form-grid">
                
                <h3 className="form-group-full" style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  Datos Corporativos (Obligaciones Art. 14 ter)
                </h3>

                <div>
                  <label className="form-label">Razón Social o Nombre del Responsable</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    value={configCompanyName} 
                    onChange={e => setConfigCompanyName(e.target.value)} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="form-label">Versión de la Política</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    value={configVersion} 
                    onChange={e => setConfigVersion(e.target.value)} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="form-label">Representante de Datos / Delegado (DPO)</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    value={configRepresentative} 
                    onChange={e => setConfigRepresentative(e.target.value)} 
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="form-label">Correo de contacto DPO</label>
                  <input 
                    type="email" 
                    className="input-text" 
                    value={configEmail} 
                    onChange={e => setConfigEmail(e.target.value)} 
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group-full">
                  <label className="form-label">Finalidades de Tratamiento</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3} 
                    value={configPurposes} 
                    onChange={e => setConfigPurposes(e.target.value)} 
                    required
                  ></textarea>
                </div>

                <div className="form-group-full">
                  <label className="form-label">Tiempo de Retención / Conservación</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    value={configRetention} 
                    onChange={e => setConfigRetention(e.target.value)} 
                    required
                  ></textarea>
                </div>

                <div className="form-group-full">
                  <label className="form-label">Canales para Ejercicio de Derechos (ARCO+)</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    value={configChannels} 
                    onChange={e => setConfigChannels(e.target.value)} 
                    required
                  ></textarea>
                </div>

                <h3 className="form-group-full" style={{ margin: '20px 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  Ajustes Visuales del Widget Banner
                </h3>

                <div>
                  <label className="form-label font-bold">Título del Banner</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    value={configBannerTitle} 
                    onChange={e => setConfigBannerTitle(e.target.value)} 
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group-full">
                  <label className="form-label">Descripción del Banner</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3} 
                    value={configBannerDesc} 
                    onChange={e => setConfigBannerDesc(e.target.value)} 
                    required
                  ></textarea>
                </div>

                <div className="form-group-full" style={{ marginTop: '10px' }}>
                  <button type="submit" className="btn-save" disabled={isSavingConfig}>
                    {isSavingConfig ? 'Guardando...' : 'Guardar y Publicar Política'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* TAB 6: INTERNATIONAL TRANSFERS (TID) */}
        {activeTab === 'transfers' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">Gestión de Transferencias Internacionales (TID)</h1>
              <p className="page-subtitle">Monitoreo de flujos transfronterizos y evaluación de riesgo legal bajo los Artículos 27 y 28 de la Ley N° 21.719.</p>
            </header>

            {/* CASE 1: ADDING TRANSFER WIZARD */}
            {isAddingTransfer ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Asistente: Registrar Flujo Internacional</h3>
                  <button className="btn-action" onClick={() => { setIsAddingTransfer(false); setWizardStep(1); }}>
                    Volver al Listado
                  </button>
                </div>

                {/* Steps Indicator */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--color-primary)', opacity: wizardStep >= 1 ? 1 : 0.2, borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '4px', background: 'var(--color-primary)', opacity: wizardStep >= 2 ? 1 : 0.2, borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '4px', background: 'var(--color-primary)', opacity: wizardStep >= 3 ? 1 : 0.2, borderRadius: '2px' }}></div>
                </div>

                <form onSubmit={handleCreateTransfer}>
                  {/* STEP 1: VENDOR & COUNTRY */}
                  {wizardStep === 1 && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Paso 1: Proveedor y Destino</h4>
                      <div className="form-group-full">
                        <label className="form-label">Nombre del Proveedor (ej: Google Cloud, AWS, Mailchimp)</label>
                        <input 
                          type="text" 
                          className="input-text" 
                          value={vendorName} 
                          onChange={e => setVendorName(e.target.value)} 
                          required 
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      
                      <div className="form-group-full" style={{ marginTop: '16px' }}>
                        <label className="form-label">País de Destino (Servidores)</label>
                        <select 
                          className="input-text" 
                          value={destCountry} 
                          onChange={e => setDestCountry(e.target.value)}
                        >
                          {countries.map(c => (
                            <option key={c.country_code} value={c.country_code}>
                              {c.country_name} ({c.is_adequate ? 'Adecuado 🟢' : 'No Adecuado 🔴'})
                            </option>
                          ))}
                        </select>
                        {/* live helper note */}
                        {(() => {
                          const selected = countries.find(c => c.country_code === destCountry);
                          if (!selected) return null;
                          return (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '10px 12px', 
                              background: selected.is_adequate ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                              borderLeft: `3px solid ${selected.is_adequate ? 'var(--color-success)' : 'var(--color-danger)'}`,
                              borderRadius: '4px',
                              fontSize: '12.5px'
                            }}>
                              <strong>Evaluación Normativa:</strong> {selected.notes}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ marginTop: '24px', textAlign: 'right' }}>
                        <button 
                          type="button" 
                          className="btn-action" 
                          disabled={!vendorName}
                          onClick={() => setWizardStep(2)}
                        >
                          Siguiente Paso
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: DATA CATEGORIES */}
                  {wizardStep === 2 && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Paso 2: Categorías de Datos Personales Transferidos</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Selecciona todos los tipos de datos que este proveedor recopila o almacena fuera de Chile.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {['Nombres / Identidad', 'Correo electrónico', 'Dirección física', 'Teléfono', 'Datos de navegación (cookies/IP)', 'Datos financieros/tarjetas', 'Historial de compras'].map(cat => {
                          const isSelected = selectedCategories.includes(cat);
                          return (
                            <label key={cat} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              padding: '12px', 
                              background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                  } else {
                                    setSelectedCategories([...selectedCategories, cat]);
                                  }
                                }}
                              />
                              <span>{cat}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" className="btn-action" onClick={() => setWizardStep(1)}>Atrás</button>
                        <button 
                          type="button" 
                          className="btn-action" 
                          disabled={selectedCategories.length === 0}
                          onClick={() => {
                            // Autodetect mechanism recommendation
                            const selected = countries.find(c => c.country_code === destCountry);
                            if (selected && selected.is_adequate) {
                              setMechanism('ADEQUATE_COUNTRY');
                            } else {
                              setMechanism('STANDARD_CLAUSES');
                            }
                            setWizardStep(3);
                          }}
                        >
                          Siguiente Paso
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: MECHANISMS & CONFIRMATION */}
                  {wizardStep === 3 && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Paso 3: Mecanismo de Transferencia Legítimo</h4>
                      <div className="form-group-full">
                        <label className="form-label">Mecanismo Utilizado (Licitud de Transferencia)</label>
                        <select 
                          className="input-text" 
                          value={mechanism} 
                          onChange={e => setMechanism(e.target.value)}
                        >
                          <option value="STANDARD_CLAUSES">Cláusulas Contractuales Tipo (SCC)</option>
                          <option value="ADEQUATE_COUNTRY">Nivel de Adecuación del País Destino</option>
                          <option value="BCR">Normas Corporativas Vinculantes (BCR)</option>
                          <option value="CONSENT_EXCEPTIONAL">Consentimiento Excepcional del Titular</option>
                          <option value="OTHER">Otro Mecanismo Autorizado</option>
                        </select>
                      </div>

                      {mechanism === 'STANDARD_CLAUSES' && (
                        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input 
                              type="checkbox" 
                              checked={signedScc} 
                              onChange={e => setSignedScc(e.target.checked)}
                            />
                            <strong>He firmado las Cláusulas Contractuales Tipo (SCC) con este proveedor</strong>
                          </label>
                          <p style={{ margin: '4px 0 12px 22px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            La firma del anexo de cláusulas es obligatoria para transferir datos de forma lícita a países no adecuados.
                          </p>

                          {signedScc && (
                            <div className="form-group-full" style={{ marginLeft: '22px' }}>
                              <label className="form-label">URL del Documento de Cláusulas Firmado (Opcional)</label>
                              <input 
                                type="text" 
                                className="input-text" 
                                value={sccUrl} 
                                onChange={e => setSccUrl(e.target.value)} 
                                placeholder="ej. https://dropbox.com/s/scc-signed-aws.pdf"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" className="btn-action" onClick={() => setWizardStep(2)}>Atrás</button>
                        <button type="submit" className="btn-save">Registrar y Validar Flujo</button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            ) : generatedSccText ? (
              /* CASE 2: SCC CONTRACT DISPLAY */
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Cláusulas Contractuales Tipo (SCC) Generadas</h3>
                  <button className="btn-action" onClick={() => setGeneratedSccText('')}>Volver</button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Copia o descarga este anexo contractual para su firma y posterior adjunto en la plataforma.
                </p>
                <div style={{ marginBottom: '20px' }}>
                  <textarea 
                    className="form-textarea" 
                    rows={15} 
                    readOnly 
                    value={generatedSccText}
                    style={{ fontFamily: 'monospace', fontSize: '12px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn-save" 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedSccText);
                      alert('Contrato copiado al portapapeles.');
                    }}
                  >
                    Copiar Contrato
                  </button>
                  <button 
                    className="btn-action" 
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([generatedSccText], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = "scc-clausulas-tipo-ley21719.md";
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                  >
                    Descargar en Markdown
                  </button>
                </div>
              </div>
            ) : isGeneratingScc ? (
              /* CASE 3: SCC BUILDER FORM */
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>SCC Builder: Generador de Cláusulas Contractuales Tipo</h3>
                  <button className="btn-action" onClick={() => setIsGeneratingScc(false)}>Volver</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Exportador */}
                  <div style={{ paddingRight: '15px', borderRight: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-primary)' }}>Exportador (Tú / Chile)</h4>
                    <div className="form-group-full">
                      <label className="form-label">Razón Social</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={sccExporterName} 
                        onChange={e => setSccExporterName(e.target.value)} 
                        placeholder="ej: Mi Empresa SpA"
                      />
                    </div>
                    <div className="form-group-full" style={{ marginTop: '12px' }}>
                      <label className="form-label">RUT</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={sccExporterRut} 
                        onChange={e => setSccExporterRut(e.target.value)} 
                        placeholder="ej: 76.123.456-7"
                      />
                    </div>
                    <div className="form-group-full" style={{ marginTop: '12px' }}>
                      <label className="form-label">Dirección Legal</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={sccExporterAddress} 
                        onChange={e => setSccExporterAddress(e.target.value)} 
                        placeholder="Santiago, Chile"
                      />
                    </div>
                  </div>

                  {/* Importador */}
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-primary)' }}>Importador (Proveedor Extranjero)</h4>
                    <div className="form-group-full">
                      <label className="form-label">Razón Social del Proveedor</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={sccImporterName} 
                        onChange={e => setSccImporterName(e.target.value)} 
                        placeholder="ej: Amazon Web Services Inc."
                      />
                    </div>
                    <div className="form-group-full" style={{ marginTop: '12px' }}>
                      <label className="form-label">País Destinatario</label>
                      <select 
                        className="input-text" 
                        value={destCountry} 
                        onChange={e => setDestCountry(e.target.value)}
                      >
                        {countries.map(c => (
                          <option key={c.country_code} value={c.country_name}>{c.country_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-full" style={{ marginTop: '12px' }}>
                      <label className="form-label">Dirección / Sede Principal</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={sccImporterAddress} 
                        onChange={e => setSccImporterAddress(e.target.value)} 
                        placeholder="Seattle, USA"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button 
                    className="btn-save"
                    disabled={!sccExporterName || !sccExporterRut || !sccExporterAddress || !sccImporterName || !sccImporterAddress}
                    onClick={handleGenerateScc}
                  >
                    Redactar y Crear Contrato
                  </button>
                </div>
              </div>
            ) : (
              /* CASE 4: DASHBOARD / TRANSFERS TABLE LIST */
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Mapa de Flujos Transfronterizos y Proveedores</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-action" onClick={() => { 
                      setIsGeneratingScc(true);
                      setSccExporterName(config?.company_name || '');
                      setSccExporterRut('');
                      setSccExporterAddress(config?.policy_content.representative || '');
                    }}>
                      Generador de Cláusulas (SCC)
                    </button>
                    <button className="btn-save" onClick={() => { setIsAddingTransfer(true); setWizardStep(1); }}>
                      Registrar Flujo Internacional
                    </button>
                  </div>
                </div>

                {transfers.length > 0 ? (
                  <div className="table-container">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Proveedor</th>
                          <th>País Destino</th>
                          <th>Categorías de Datos</th>
                          <th>Base Legal / Mecanismo</th>
                          <th>SCC Firmado</th>
                          <th>Riesgo Legal</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((t) => {
                          const categories = Array.isArray(t.data_categories) 
                            ? t.data_categories 
                            : typeof t.data_categories === 'string'
                              ? JSON.parse(t.data_categories)
                              : [];
                          const risk = getRiskStatus(t, countries);
                          return (
                            <tr key={t.id}>
                              <td><strong>{t.vendor_name}</strong></td>
                              <td>{t.destination_country}</td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {categories.map((cat: string) => (
                                    <span key={cat} className="badge badge-leve" style={{ fontSize: '10px' }}>{cat}</span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <code style={{ fontSize: '11px' }}>{t.transfer_mechanism}</code>
                              </td>
                              <td>
                                {t.transfer_mechanism === 'STANDARD_CLAUSES' ? (
                                  t.has_signed_scc ? (
                                    t.scc_document_url ? (
                                      <a href={t.scc_document_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
                                        Sí 🔗
                                      </a>
                                    ) : (
                                      <span style={{ color: 'var(--color-success)' }}>Sí</span>
                                    )
                                  ) : (
                                    <span style={{ color: 'var(--color-danger)' }}>No</span>
                                  )
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${risk.badgeClass}`} style={{ fontSize: '11px' }}>
                                  {risk.text}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn-action" 
                                  onClick={() => handleDeleteTransfer(t.id)}
                                  style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none' }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <ExternalLink size={48} color="var(--text-secondary)" />
                    <p style={{ marginTop: '12px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      No se han registrado flujos transfronterizos.
                    </p>
                    <p style={{ margin: 0 }}>
                      Registra los servicios extranjeros (ej. hosting, CRM, analítica) para evaluar su adecuación con la ley.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
