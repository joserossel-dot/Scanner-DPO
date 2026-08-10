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

interface AuditResult {
  url: string;
  score: number;
  findings: AuditFinding[];
  severityCounts: {
    leve: number;
    grave: number;
    gravisima: number;
  };
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
      const res = await fetch('/api/scan/latest');
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
      const res = await fetch('/api/consents/stats');
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
      const res = await fetch('/api/consents/logs');
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
      const res = await fetch('/api/arco/tickets');
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
      const res = await fetch('/api/config/localhost:3000');
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

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!scanUrl) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/scan', {
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
      const res = await fetch('/api/config/localhost:3000', {
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
      const res = await fetch(`/api/arco/tickets/${id}/status`, {
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
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>Brechas de Cumplimiento Identificadas</h3>
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

      </main>
    </div>
  );
}
