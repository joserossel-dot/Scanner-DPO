import { useState, useEffect, FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DiagnosticQuestionnaire from './pages/dashboard/components/DiagnosticQuestionnaire';
import DiagnosticHubView from './pages/dashboard/components/DiagnosticHubView';
import ProgressStepper from './pages/dashboard/components/ProgressStepper';
import DiagnosisResultsView from './pages/dashboard/DiagnosisResultsView';
import ContractBuilderView from './pages/dashboard/components/ContractBuilderView';
import LoginView from './pages/auth/LoginView';
import RegisterView from './pages/auth/RegisterView';
import PolicyGeneratorView from './pages/dashboard/components/PolicyGeneratorView';
import DpoSuiteView from './pages/dashboard/components/DpoSuiteView';
import AuditDossierView from './pages/dashboard/components/AuditDossierView';
import PrivacyPolicyPublic from './pages/legal/PrivacyPolicyPublic';
import CookiesPolicyPublic from './pages/legal/CookiesPolicyPublic';
import TermsAndConditions from './pages/legal/TermsAndConditions';
import ArcoRequestPublic from './pages/legal/ArcoRequestPublic';
import RopaInventoryView from './pages/dashboard/components/RopaInventoryView';
import ComplianceOverviewView from './pages/dashboard/components/ComplianceOverviewView';
import LegalCopilot from './components/LegalCopilot';
import ForgotPasswordView from './pages/auth/ForgotPasswordView';
import ResetPasswordView from './pages/auth/ResetPasswordView';
import AdminDashboardView from './pages/admin/AdminDashboardView';
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
  ExternalLink,
  Plus,
  Trash,
  FileText,
  Check,
  Globe,
  AlertOctagon,
  ArrowRight,
  Lock,
  ChevronDown,
  ChevronUp,
  FolderLock,
  Info
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
  pagesSkipped?: string[];
  isSimulated?: boolean;
  created_at?: string;
}

interface ConsentStats {
  total: number;
  breakdown: {
    essential: number;
    analytical: number;
    marketing: number;
  };
}

interface ConsentLog {
  id: string;
  user_cookie_id: string;
  essential_accepted: boolean;
  analytical_accepted: boolean;
  marketing_accepted: boolean;
  ip_masked: string;
  user_agent: string;
  created_at: string;
}

interface ArcoTicket {
  id: string;
  requester_name: string;
  requester_email: string;
  request_type: string;
  request_details: string;
  verification_id_attached: boolean;
  status: 'Ingresado' | 'En Revisión' | 'Resuelto';
  created_at: string;
}

interface PolicyContent {
  representative: string;
  representative_email: string;
  purposes?: string;
  retention?: string;
  channels?: string;
}

interface ClientConfig {
  id?: string;
  domain: string;
  company_name: string;
  policy_version: string;
  policy_content: PolicyContent;
  banner_title: string;
  banner_description: string;
}

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
      const parts = hostname.split('.');
      const sub = parts[0];
      if (sub.endsWith('-dashboard')) {
        const baseSub = sub.replace('-dashboard', '-api');
        return `https://${baseSub}.onrender.com`;
      }
    }
  }
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

interface DashboardProps {
  token: string | null;
  user: any;
  onLogout: () => void;
  initialTab?: 'scanner' | 'diagnosis' | 'remediation' | 'dpo' | 'dossier' | 'ropa' | 'admin';
}

export function Dashboard({ token, user, onLogout, initialTab }: DashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Lexically shadow the global fetch with an authenticated fetch wrapper
  const fetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    return window.fetch(url, { ...options, headers });
  };

  const [activeTab, setActiveTab] = useState<'scanner' | 'diagnosis' | 'remediation' | 'dpo' | 'dossier' | 'ropa' | 'admin'>(initialTab || 'scanner');
  const [remediationSubTab, setRemediationSubTab] = useState<'cmp' | 'arco' | 'transfers' | 'policies' | 'contracts'>('cmp');
  const [diagnosisViewMode, setDiagnosisViewMode] = useState<'overview' | 'questionnaire'>('overview');
  
  // Diagnosis State (Capa 2)
  const [diagnosisData, setDiagnosisData] = useState<any>(null);
  const [isFetchingDiagnosis, setIsFetchingDiagnosis] = useState(false);

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
  const [configBannerDesc, setConfigBannerDesc] = useState('Utilizamos cookies esenciales para el funcionamiento del sitio, y cookies analíticas/comerciales opcionales. Puede aceptar todas o rechazarlas. Consulte nuestra Política de Privacidad para más detalles conforme a la Ley N° 21.719.');
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

  // Shadow IT Hunter State
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [discoveryState, setDiscoveryState] = useState<Record<string, {
    used: boolean;
    vendorName: string;
    country: string;
    categories: string[];
  }>>({
    aws: { used: false, vendorName: 'Amazon Web Services', country: 'US', categories: ['Infraestructura/Nube'] },
    gcp: { used: false, vendorName: 'Google Cloud Platform', country: 'US', categories: ['Infraestructura/Nube'] },
    azure: { used: false, vendorName: 'Microsoft Azure', country: 'US', categories: ['Infraestructura/Nube'] },
    digitalocean: { used: false, vendorName: 'DigitalOcean', country: 'US', categories: ['Infraestructura/Nube'] },
    
    hubspot: { used: false, vendorName: 'HubSpot', country: 'US', categories: ['Datos de navegación (cookies/IP)', 'Nombres / Identidad'] },
    salesforce: { used: false, vendorName: 'Salesforce', country: 'US', categories: ['Nombres / Identidad', 'Correo electrónico'] },
    mailchimp: { used: false, vendorName: 'Mailchimp', country: 'US', categories: ['Correo electrónico', 'Nombres / Identidad'] },
    activecampaign: { used: false, vendorName: 'ActiveCampaign', country: 'US', categories: ['Correo electrónico', 'Nombres / Identidad'] },
    sendgrid: { used: false, vendorName: 'SendGrid', country: 'US', categories: ['Correo electrónico'] },

    google_workspace: { used: false, vendorName: 'Google Workspace', country: 'US', categories: ['Correo electrónico', 'Nombres / Identidad'] },
    office_365: { used: false, vendorName: 'Microsoft 365', country: 'US', categories: ['Correo electrónico', 'Nombres / Identidad'] },
    zoom: { used: false, vendorName: 'Zoom Video Communications', country: 'US', categories: ['Nombres / Identidad', 'Correo electrónico'] },
    workday: { used: false, vendorName: 'Workday', country: 'US', categories: ['Nombres / Identidad', 'Datos financieros/tarjetas'] },
    bamboohr: { used: false, vendorName: 'BambooHR', country: 'US', categories: ['Nombres / Identidad'] },

    google_analytics: { used: false, vendorName: 'Google Analytics', country: 'US', categories: ['Datos de navegación (cookies/IP)'] },
    meta_pixel: { used: false, vendorName: 'Meta Pixel', country: 'US', categories: ['Datos de navegación (cookies/IP)'] },
    hotjar: { used: false, vendorName: 'Hotjar', country: 'US', categories: ['Datos de navegación (cookies/IP)'] },
    zendesk: { used: false, vendorName: 'Zendesk', country: 'US', categories: ['Nombres / Identidad', 'Correo electrónico'] },
    intercom: { used: false, vendorName: 'Intercom', country: 'US', categories: ['Nombres / Identidad', 'Correo electrónico', 'Datos de navegación (cookies/IP)'] }
  });

  // Inline Editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  // Toast notifications state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'warning' | 'info' }>>([]);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  // Security Incidents Module State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isAddingIncident, setIsAddingIncident] = useState(false);
  const [wizardIncidentStep, setWizardIncidentStep] = useState(1);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [incidentType, setIncidentType] = useState('DATA_LEAK');
  const [affectedCategories, setAffectedCategories] = useState<string[]>([]);
  const [approxAffectedTitulars, setApproxAffectedTitulars] = useState<number>(0);
  const [descriptionAndEffects, setDescriptionAndEffects] = useState('');
  const [mitigationMeasures, setMitigationMeasures] = useState('');
  const [incidentStatus, setIncidentStatus] = useState('DETECTED');
  const [selectedIncidentForNotice, setSelectedIncidentForNotice] = useState<any>(null);
  const [agencyNoticeText, setAgencyNoticeText] = useState('');
  const [titularsNoticeText, setTitularsNoticeText] = useState('');
  const [isGeneratingNotice, setIsGeneratingNotice] = useState(false);

  // Proactive Vulnerability Scanner State
  const [isScanningVulnerabilities, setIsScanningVulnerabilities] = useState(false);
  const [scanVulnerabilitiesResult, setScanVulnerabilitiesResult] = useState<any>(null);
  const [weeklyCronEnabled, setWeeklyCronEnabled] = useState(() => {
    return localStorage.getItem('weekly_security_cron') === 'true';
  });

  const [evalResults, setEvalResults] = useState<any>(null);

  const handleEvaluateQuestionnaire = async (answers: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, domain: 'localhost:3000' })
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResults(data);
        showToast('Diagnóstico guardado con éxito en la base de datos.', 'success');
        handleFetchDiagnosis();
      } else {
        showToast('Error al evaluar el cuestionario.', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al enviar el diagnóstico.', 'warning');
    }
  };

  // Auto scan logic from landing page redirect
  useEffect(() => {
    if (location.state && (location.state as any).autoScanUrl) {
      const urlToScan = (location.state as any).autoScanUrl;
      setScanUrl(urlToScan);
      
      // Clear state so we don't scan on every refresh
      navigate(location.pathname, { replace: true, state: {} });
      
      // Trigger scan
      triggerAutoScan(urlToScan);
    }
  }, [location.state]);

  // Handle skipScan redirect to step 2 (diagnosis hub)
  useEffect(() => {
    if (location.state && (location.state as any).skipScan) {
      setActiveTab('diagnosis');
      // Clear state so we don't force diagnosis tab on refresh/navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const triggerAutoScan = async (url: string) => {
    setIsScanning(true);
    showToast('Iniciando escaneo automático de cortesía...', 'info');
    try {
      const res = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestScan(data);
        showToast(`Escaneo finalizado con éxito. Score de privacidad: ${data.score}%`, 'success');
        
        // Refresh diagnosis stats
        setIsFetchingDiagnosis(true);
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const diagRes = await fetch(`${API_BASE}/api/reports/diagnosis?domain=localhost:3000`, {
          headers
        });
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setDiagnosisData(diagData);
        }
        setIsFetchingDiagnosis(false);
      } else {
        showToast('Error al auditar el dominio solicitado.', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con la API de escaneo.', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFetchDiagnosis = async () => {
    setIsFetchingDiagnosis(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api/reports/diagnosis?domain=localhost:3000`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnosisData(data);
      } else {
        showToast('Error al cargar el diagnóstico consolidado.', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de comunicación con la API de diagnóstico.', 'warning');
    } finally {
      setIsFetchingDiagnosis(false);
    }
  };

  const handleResetTestData = async () => {
    if (!window.confirm("¿Está seguro de que desea resetear todos los datos de prueba? Esta acción eliminará permanentemente su inventario RoPA, diagnósticos, textos legales e incidentes.")) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/testing/reset-my-data`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast("Datos de prueba reseteados correctamente.", "success");
        setEvalResults(null);
        setLatestScan(null);
        setDiagnosisData(null);
        setConsentLogs([]);
        setArcoTickets([]);
        setTransfers([]);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const err = await res.json();
        showToast("Error al resetear datos: " + (err.error || res.statusText), "warning");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Error de red al conectar con el servidor.", "warning");
    }
  };

  // Load basic statistics on mount
  useEffect(() => {
    fetchLatestScan();
    fetchConsentsStats();
    fetchConsentLogs();
    fetchArcoTickets();
    fetchConfig();
    fetchIncidents();
    handleFetchDiagnosis();
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
        const data = await res.json();
        setConfig(data);
        setConfigRepresentative(data.policy_content?.representative || '');
        setConfigEmail(data.policy_content?.representative_email || '');
        setConfigPurposes(data.policy_content?.purposes || '');
        setConfigRetention(data.policy_content?.retention || '');
        setConfigChannels(data.policy_content?.channels || '');
        setConfigCompanyName(data.company_name || '');
        setConfigBannerTitle(data.banner_title || '');
        setConfigBannerDesc(data.banner_description || 'Utilizamos cookies esenciales para el funcionamiento del sitio, y cookies analíticas/comerciales opcionales. Puede aceptar todas o rechazarlas. Consulte nuestra Política de Privacidad para más detalles conforme a la Ley N° 21.719.');
        setConfigVersion(data.policy_version || 'v1.0.0');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers?domain=localhost:3000`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data);
      }
    } catch (e) {
      console.error(e);
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
      console.error(e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents?domain=localhost:3000`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action Triggers
  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    showToast('Iniciando escaneo de cookies, formularios y políticas...', 'info');
    try {
      const res = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestScan(data);
        showToast(`Escaneo finalizado con éxito. Score de cumplimiento: ${data.score}%`, 'success');
        handleFetchDiagnosis();
      } else {
        showToast('Error al auditar el sitio web.', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de red al conectar con el motor de escaneo.', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const payload = {
        company_name: configCompanyName,
        policy_version: configVersion,
        banner_title: configBannerTitle,
        banner_description: configBannerDesc,
        policy_content: {
          representative: configRepresentative,
          representative_email: configEmail,
          purposes: configPurposes,
          retention: configRetention,
          channels: configChannels
        }
      };
      const res = await fetch(`${API_BASE}/api/config/localhost:3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        showToast('Configuraciones guardadas y CMP actualizado.', 'success');
        handleFetchDiagnosis();
      } else {
        showToast('Error al guardar configuraciones.', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de red al guardar.', 'warning');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        domain: 'localhost:3000',
        provider_name: vendorName,
        country: destCountry,
        data_categories: selectedCategories,
        transfer_mechanism: mechanism,
        has_scc: signedScc,
        scc_url: sccUrl
      };
      const res = await fetch(`${API_BASE}/api/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Proveedor de transferencia internacional registrado.', 'success');
        setVendorName('');
        setSelectedCategories([]);
        setIsAddingTransfer(false);
        setWizardStep(1);
        fetchTransfers();
        handleFetchDiagnosis();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTransfer = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        showToast('Garantía contractual registrada con éxito.', 'success');
        fetchTransfers();
        handleFetchDiagnosis();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este proveedor?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Proveedor eliminado.', 'info');
        fetchTransfers();
        handleFetchDiagnosis();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateScc = (provider: any) => {
    setSccExporterName(config?.company_name || 'Mi Empresa Chile S.A.');
    setSccExporterRut('76.123.456-7');
    setSccExporterAddress('Av. Apoquindo 4500, Las Condes, Santiago, Chile');
    setSccImporterName(provider.provider_name);
    setSccImporterAddress(`HQ in ${provider.country}`);
    
    const docText = `CONTRATO DE TRANSFERENCIA INTERNACIONAL DE DATOS (ART. 28 LEY N° 21.719)

EXPORTADOR DE DATOS:
Razón Social: ${config?.company_name || 'Mi Empresa Chile S.A.'}
RUT: 76.123.456-7
Domicilio: Av. Apoquindo 4500, Las Condes, Santiago, Chile
Representante Legal / DPO: ${configRepresentative || 'DPO de la Compañía'}

IMPORTADOR DE DATOS:
Proveedor: ${provider.provider_name}
País Destinatario: ${provider.country}
Categoría de Datos transferidos: ${provider.data_categories?.join(', ') || 'Contacto general'}

CLÁUSULAS CONTRACTUALES TIPO (SCC):
1. OBJETO Y ALCANCE: El Importador se compromete a tratar los datos personales únicamente bajo las instrucciones del Exportador de acuerdo con la Ley N° 21.719 de Chile.
2. MEDIDAS DE SEGURIDAD: El Importador declara poseer medidas técnicas y organizativas óptimas para prevenir fugas, ransomware o accesos no autorizados.
3. EJERCICIO DE DERECHOS: El Importador cooperará con el Exportador para responder solicitudes ARCO+ en un plazo máximo de 48 horas hábiles.
4. AGENCIA DE DATOS: Ambas partes se someten a la fiscalización de la Agencia de Protección de Datos Personales de Chile.

Firmas autorizadas:
- Por el Exportador: ____________________________
- Por el Importador: ____________________________`;
    
    setGeneratedSccText(docText);
    setIsGeneratingScc(true);
  };

  const handleResolveArco = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/arco/tickets/${id}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Solicitud ARCO+ resuelta y archivada.', 'success');
        fetchArcoTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateIncident = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        domain: 'localhost:3000',
        incident_title: incidentTitle,
        incident_date: incidentDate,
        incident_type: incidentType,
        affected_data_categories: affectedCategories,
        approx_affected_titulars: Number(approxAffectedTitulars),
        description_and_effects: descriptionAndEffects,
        mitigation_measures: mitigationMeasures,
        status: incidentStatus
      };

      const res = await fetch(`${API_BASE}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Incidente registrado en la bitácora legal.', 'success');
        setIncidentTitle('');
        setAffectedCategories([]);
        setApproxAffectedTitulars(0);
        setDescriptionAndEffects('');
        setMitigationMeasures('');
        setIsAddingIncident(false);
        setWizardIncidentStep(1);
        fetchIncidents();
        handleFetchDiagnosis();
      } else {
        showToast('Error al registrar incidente.', 'warning');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateIncidentStatus = async (id: string, newStatus: string) => {
    try {
      const updateFields: any = { status: newStatus };
      if (newStatus === 'REPORTED_AND_CLOSED') {
        updateFields.agency_notified_at = new Date().toISOString();
        updateFields.titulars_notified_at = new Date().toISOString();
      }
      const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFields)
      });
      if (res.ok) {
        showToast('Estado del incidente actualizado.', 'success');
        fetchIncidents();
        handleFetchDiagnosis();
      } else {
        showToast('Error al actualizar estado.', 'warning');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateIncidentNotice = async (incident: any) => {
    setSelectedIncidentForNotice(incident);
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incident.id}/generate-notice`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAgencyNoticeText(data.agencyNotice);
        setTitularsNoticeText(data.titularsNotice);
        setIsGeneratingNotice(true);
      } else {
        showToast('Error al generar los borradores contractuales.', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al conectar con la API de generación.', 'warning');
    }
  };

  const handleScanVulnerabilities = async () => {
    setIsScanningVulnerabilities(true);
    try {
      const res = await fetch(`${API_BASE}/api/incidents/scan-vulnerabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'localhost:3000' })
      });
      if (res.ok) {
        const data = await res.json();
        setScanVulnerabilitiesResult(data.scanResult);
        showToast(`Escaneo de vulnerabilidades finalizado. Score: ${data.scanResult.score}%`, 'success');
        fetchIncidents();
        handleFetchDiagnosis();
      } else {
        showToast('Error al ejecutar el escaneo de vulnerabilidades.', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de comunicación con la API de escaneo.', 'warning');
    } finally {
      setIsScanningVulnerabilities(false);
    }
  };

  const handlePromoteVulnerability = (vul: any) => {
    setIncidentTitle(`Brecha Potencial: ${vul.title}`);
    setIncidentType('UNAUTHORIZED_ACCESS');
    setAffectedCategories(['Datos de Identidad (RUT, Claves de Acceso)']);
    setApproxAffectedTitulars(0);
    setDescriptionAndEffects(`Mitigación preventiva de vulnerabilidad detectada: ${vul.description}`);
    setMitigationMeasures(vul.recommendation);
    setIncidentStatus('DETECTED');
    setIsAddingIncident(true);
    setWizardIncidentStep(1);
    showToast('Wizard de incidente pre-llenado con los datos de la alerta.', 'info');
  };

  // Helper inside layout
  const getDeadlineBadge = (arco: ArcoTicket) => {
    const receivedDate = new Date(arco.created_at);
    const limitDate = new Date(receivedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diffTime = limitDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return <span className="badge badge-gravisima">Expirado (Multa)</span>;
    if (diffDays <= 5) return <span className="badge badge-grave">Urgente ({diffDays}d)</span>;
    return <span className="badge badge-success">A tiempo ({diffDays}d)</span>;
  };

  // Toggle Shadow IT Providers Checkboxes
  const handleCheckboxToggle = async (key: string) => {
    const prev = discoveryState[key];
    const updated = !prev.used;
    setDiscoveryState(d => ({
      ...d,
      [key]: { ...prev, used: updated }
    }));
    
    if (updated) {
      try {
        const payload = {
          domain: 'localhost:3000',
          provider_name: prev.vendorName,
          country: prev.country,
          data_categories: prev.categories,
          transfer_mechanism: 'STANDARD_CLAUSES',
          has_scc: false,
          scc_url: ''
        };
        const res = await fetch(`${API_BASE}/api/transfers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(`Proveedor ${prev.vendorName} importado a la matriz de regularización.`, 'success');
          fetchTransfers();
          handleFetchDiagnosis();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Render Sub-Views (Capa 1)
  const renderScanner = () => {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">🔍 Escáner & Auditoría de Privacidad</h1>
          <p className="page-subtitle">Rastreo automatizado del dominio para cookies no consentidas, formularios sin opt-in y vulnerabilidades técnicas de red.</p>
        </header>

        <div className="dashboard-grid">
          {/* Section A: Live Web Crawler */}
          <div className="card col-12">
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>1. Crawler Auditor de Sitio Web</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Simula un rastreo recursivo del HTML sobre enlaces locales (Límite seguro: 15 páginas).</p>
            
            <form onSubmit={handleScan} style={{ marginBottom: '15px' }}>
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
                      <span>Rastreando HTML...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>Iniciar Escaneo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            
            {latestScan && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Dominio Analizado: <code>{latestScan.url}</code></span>
                  <span className="badge badge-success">Crawler Score: {latestScan.score}%</span>
                </div>
                
                {/* Sitemap and Scope Coverage */}
                <h4 style={{ margin: '15px 0 8px 0', fontSize: '13px', fontWeight: 600 }}>Mapa del Sitio Analizado ({latestScan.pagesAnalyzed?.length || 1} / 15 URLs visitadas)</h4>
                <div style={{ background: '#0a0a14', padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
                  <div style={{ color: 'var(--color-success)', marginBottom: '5px' }}>🟢 Páginas Auditadas Exitosamente (Ingeridas para diagnóstico):</div>
                  {latestScan.pagesAnalyzed?.map((p, idx) => (
                    <div key={idx} style={{ paddingLeft: '15px' }}>├─ {p}</div>
                  ))}
                  
                  {latestScan.pagesSkipped && latestScan.pagesSkipped.length > 0 && (
                    <>
                      <div style={{ color: 'var(--color-warning)', marginTop: '10px', marginBottom: '5px' }}>🟡 Enlaces Encontrados No Auditados (Acciones Rápidas):</div>
                      {latestScan.pagesSkipped.map((p, idx) => (
                        <div key={idx} style={{ paddingLeft: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                          <span>├─ {p}</span>
                          <button 
                            className="btn-action" 
                            style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(99, 102, 241, 0.12)' }}
                            onClick={() => {
                              setScanUrl(p);
                              showToast('URL cargada en el buscador. Haz clic en Iniciar Escaneo para auditar este segmento.', 'info');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            Rastrear Enlace
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Proactive Network & SSL Scanner */}
          <div className="card col-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>2. Auditoría Técnica de Red y Certificados SSL</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Escaneo preventivo del puerto 443, cabeceras HTTP de protección y fugas de credenciales.</p>
              </div>
              <button 
                className="btn-action" 
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                onClick={handleScanVulnerabilities}
                disabled={isScanningVulnerabilities}
              >
                {isScanningVulnerabilities ? <RefreshCw className="loader" size={14} /> : <Shield size={14} />}
                <span style={{ marginLeft: '6px' }}>{isScanningVulnerabilities ? 'Analizando Puertos...' : 'Auditar Puertos & SSL'}</span>
              </button>
            </div>

            {/* Weekly Scheduler */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ fontSize: '13.5px' }}>⏰ Programador Automático de Escaneos</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Ejecuta auditorías periódicas automáticas de red todos los lunes a las 08:00 AM.</p>
              </div>
              <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={weeklyCronEnabled} 
                  onChange={e => {
                    const val = e.target.checked;
                    setWeeklyCronEnabled(val);
                    localStorage.setItem('weekly_security_cron', String(val));
                    showToast(val ? 'Auditoría automática semanal activada.' : 'Auditoría semanal inactiva.', 'info');
                  }}
                />
                <span className="slider round"></span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{weeklyCronEnabled ? 'Activo (Lunes 08:00)' : 'Inactivo'}</span>
              </label>
            </div>

            {scanVulnerabilitiesResult && (
              <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-danger)' }}>🚨 Amenazas y Fallos Detectados Proactivamente (Score: {scanVulnerabilitiesResult.score}%)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                  {scanVulnerabilitiesResult.vulnerabilities.map((v: any) => (
                    <div key={v.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'black', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{v.title}</span>
                          <span className={`badge ${v.severity === 'CRITICAL' ? 'badge-gravisima' : v.severity === 'HIGH' ? 'badge-grave' : 'badge-leve'}`}>{v.severity}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>{v.description}</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-primary)' }}><strong>Solución:</strong> {v.recommendation}</p>
                      </div>
                      <button 
                        className="btn-save" 
                        style={{ width: '100%', fontSize: '11px', padding: '6px 0', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--color-primary)' }}
                        onClick={() => handlePromoteVulnerability(v)}
                      >
                        🛡️ Promover a Bitácora Legal
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Sub-Views (Capa 2)
  const renderDiagnosis = () => {
    if (diagnosisViewMode === 'overview') {
      return (
        <ComplianceOverviewView 
          onStartDiagnosis={() => setDiagnosisViewMode('questionnaire')} 
        />
      );
    }
    return (
      <div>
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 className="page-title">📊 Diagnóstico & Plan de Acción Priorizado</h1>
            <p className="page-subtitle">Evaluación normativa consolidada frente a la Ley N° 21.719. Ponderación de la gobernanza de datos.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-action" onClick={() => setDiagnosisViewMode('overview')}>
              <span>Ver Pilares Ley N° 21.719</span>
            </button>
            <button className="btn-action" onClick={handleFetchDiagnosis} disabled={isFetchingDiagnosis}>
              {isFetchingDiagnosis ? <RefreshCw className="loader" size={14} /> : <RefreshCw size={14} />}
              <span style={{ marginLeft: '6px' }}>Actualizar Diagnóstico</span>
            </button>
          </div>
        </header>
        <div className="col-12" style={{ marginTop: '20px' }}>
          {evalResults ? (
            <DiagnosisResultsView 
              results={evalResults}
              onNavigateToRemediation={(subTab) => {
                if (subTab === 'ropa_hub') {
                  setActiveTab('diagnosis');
                  setEvalResults(null);
                } else {
                  setActiveTab('remediation');
                  setRemediationSubTab(subTab as any);
                }
              }}
              onReset={() => setEvalResults(null)}
              isLoading={isFetchingDiagnosis}
            />
          ) : (
            <DiagnosticHubView token={token} onEvaluationSuccess={(data) => setEvalResults(data)} />
          )}
        </div>
      </div>
    );
  };

  // Render Sub-Views (Capa 3)
  const renderRemediation = () => {
    return (
      <div>
        <header className="page-header text-left">
          <h1 className="page-title">🛠️ Herramientas de Cumplimiento & Gestión de Evidencia</h1>
          <p className="page-subtitle">Instale el CMP, procese solicitudes de usuarios, firme SCCs para proveedores internacionales y actualice su política de privacidad de forma automatizada.</p>
        </header>

        {/* Capa 3 Local Sub-tab Nav */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn-action" 
            style={{ 
              background: remediationSubTab === 'cmp' ? 'var(--color-primary)' : 'rgba(255,255,255,0.01)',
              color: remediationSubTab === 'cmp' ? 'white' : 'var(--text-secondary)',
              border: remediationSubTab === 'cmp' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
            }}
            onClick={() => setRemediationSubTab('cmp')}
          >
            🍪 CMP & Consentimientos
          </button>
          <button 
            className="btn-action" 
            style={{ 
              background: remediationSubTab === 'arco' ? 'var(--color-primary)' : 'rgba(255,255,255,0.01)',
              color: remediationSubTab === 'arco' ? 'white' : 'var(--text-secondary)',
              border: remediationSubTab === 'arco' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
            }}
            onClick={() => setRemediationSubTab('arco')}
          >
            📨 Solicitudes ARCO+
          </button>
          <button 
            className="btn-action" 
            style={{ 
              background: remediationSubTab === 'transfers' ? 'var(--color-primary)' : 'rgba(255,255,255,0.01)',
              color: remediationSubTab === 'transfers' ? 'white' : 'var(--text-secondary)',
              border: remediationSubTab === 'transfers' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
            }}
            onClick={() => setRemediationSubTab('transfers')}
          >
            ✈️ Regularización TID (Art. 28)
          </button>
          <button 
            className="btn-action" 
            style={{ 
              background: remediationSubTab === 'policies' ? 'var(--color-primary)' : 'rgba(255,255,255,0.01)',
              color: remediationSubTab === 'policies' ? 'white' : 'var(--text-secondary)',
              border: remediationSubTab === 'policies' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
            }}
            onClick={() => setRemediationSubTab('policies')}
          >
            📄 Políticas & Oficios
          </button>
          <button 
            className="btn-action" 
            style={{ 
              background: remediationSubTab === 'contracts' ? 'var(--color-primary)' : 'rgba(255,255,255,0.01)',
              color: remediationSubTab === 'contracts' ? 'white' : 'var(--text-secondary)',
              border: remediationSubTab === 'contracts' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
            }}
            onClick={() => setRemediationSubTab('contracts')}
          >
            📝 Contratos DPA/SCC
          </button>
        </div>

        {/* Sub-tab: CMP & Consent Logs */}
        {remediationSubTab === 'cmp' && (
          <div className="dashboard-grid text-left">
            <div className="card col-12 text-left">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600 }}>Configuración del Banner del CMP</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>Personaliza las alertas que visualiza el cliente al ingresar a tu portal.</p>
              
              <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Título del Banner</label>
                  <input type="text" className="input-text" style={{ width: '100%' }} value={configBannerTitle} onChange={e => setConfigBannerTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Mensaje Informativo (Consentimiento)</label>
                  <textarea className="input-text" style={{ width: '100%', resize: 'vertical' }} rows={4} value={configBannerDesc} onChange={e => setConfigBannerDesc(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="submit" className="btn-save" disabled={isSavingConfig}>
                    {isSavingConfig ? 'Guardando...' : 'Aplicar Cambios del CMP'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card col-12 text-left">
              <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: 600 }}>Instalación del SDK Widget (CMP)</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Copie este código y péguelo en su sitio web justo antes de cerrar la etiqueta <code>&lt;/head&gt;</code>. (Compatible con WordPress, Shopify o HTML nativo). Asegúrese de que la URL apunte a nuestro servidor de producción, no a localhost.
              </p>
              <div style={{ background: '#0a0a14', padding: '12px 16px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <code>{`<script src="https://pt-compliance-api.onrender.com/widget.js?tenant=${user?.id || 'default'}" async></script>`}</code>
                <button 
                  className="btn-action" 
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(`<script src="https://pt-compliance-api.onrender.com/widget.js?tenant=${user?.id || 'default'}" async></script>`);
                    showToast('Código copiado al portapapeles.', 'success');
                  }}
                >
                  Copiar Código
                </button>
              </div>
            </div>

            <div className="card col-12 text-left">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600 }}>Registro Histórico de Consentimientos</h3>
              
              <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
                <Info size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-[11.5px] text-slate-350 leading-relaxed">
                  <strong>Evidencia Legal (Art. 12):</strong> Nuestro widget captura automáticamente la hora y la IP anonimizada de quienes aceptan sus políticas. Esta bitácora es su prueba irrefutable ante una fiscalización de la Agencia de Datos. Todo funciona en piloto automático.
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>Logs auditables de consentimientos registrados por usuarios en el CMP.</p>
              {consentLogs.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="transfers-table">
                    <thead>
                      <tr>
                        <th>ID de Sesión</th>
                        <th>IP (Masked)</th>
                        <th>Esenciales</th>
                        <th>Analíticas</th>
                        <th>Marketing</th>
                        <th>Fecha de Aceptación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consentLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{log.user_cookie_id?.substring(0, 15)}...</td>
                          <td style={{ fontSize: '12px' }}>{log.ip_masked}</td>
                          <td><span className="badge badge-success">{log.essential_accepted ? 'Aceptado' : 'Rechazado'}</span></td>
                          <td><span className={log.analytical_accepted ? 'badge badge-success' : 'badge badge-leve'}>{log.analytical_accepted ? 'Aceptado' : 'Rechazado'}</span></td>
                          <td><span className={log.marketing_accepted ? 'badge badge-success' : 'badge badge-leve'}>{log.marketing_accepted ? 'Aceptado' : 'Rechazado'}</span></td>
                          <td style={{ fontSize: '11px' }}>{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Esperando logs de consentimientos...</p>
              )}
            </div>
          </div>
        )}

        {/* Sub-tab: ARCO+ Inbox */}
        {remediationSubTab === 'arco' && (
          <div className="dashboard-grid text-left">
            <div className="card col-12 text-left">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600 }}>Bandeja de Entrada ARCO+</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>Bandeja legal para responder requerimientos del titular de datos dentro de los plazos de la ley.</p>
              
              {arcoTickets.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="transfers-table">
                    <thead>
                      <tr>
                        <th>Solicitante</th>
                        <th>Derecho</th>
                        <th>Detalle de Solicitud</th>
                        <th>Fecha Ingreso</th>
                        <th>Plazo Legal</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arcoTickets.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{t.requester_name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.requester_email}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-success">{t.request_type}</span></td>
                          <td style={{ fontSize: '12px', maxWidth: '280px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{t.request_details}</td>
                          <td style={{ fontSize: '11.5px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                          <td>{getDeadlineBadge(t)}</td>
                          <td>
                            <span className={`badge ${t.status === 'Resuelto' ? 'badge-success' : t.status === 'En Revisión' ? 'badge-grave' : 'badge-leve'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            {t.status !== 'Resuelto' ? (
                              <button 
                                className="btn-save" 
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => handleResolveArco(t.id)}
                              >
                                Resolver
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>✓ Archivado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>No hay solicitudes de derechos ARCO+ registradas.</p>
              )}
            </div>

            <div className="card col-12 text-left">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600 }}>Pestaña Pública de Ejercicio ARCO+</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Pegue este enlace en su página web. Los reclamos de sus clientes llegarán aquí para que los gestione en el plazo legal de 30 días.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="text-xs font-semibold text-slate-400">Enlace para sus clientes:</span>
                <div style={{ background: '#0a0a14', padding: '12px 16px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code>{`https://pt-compliance-api.onrender.com/arco?tenant=${user?.id || 'default'}`}</code>
                  <button 
                    className="btn-action" 
                    style={{ padding: '2px 8px', fontSize: '10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(`https://pt-compliance-api.onrender.com/arco?tenant=${user?.id || 'default'}`);
                      showToast('Enlace copiado al portapapeles.', 'success');
                    }}
                  >
                    Copiar Enlace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab: TID & Foreign Providers */}
        {remediationSubTab === 'transfers' && (
          <div className="dashboard-grid text-left">
            <div className="card col-12 text-left">
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11.5px] text-amber-500 leading-relaxed">
                  <strong>⚠️ Conexión Legal:</strong> Los proveedores extranjeros que registre en esta matriz DEBEN ser declarados en su 'Política de Privacidad' y obligan a generar un anexo en la pestaña 'Contratos DPA/SCC'.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Matriz de Transferencias Internacionales (TID)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Auditoría y regularización de proveedores extranjeros bajo el Art. 28 de la Ley N° 21.719.</p>
                </div>
                <button className="btn-save" onClick={() => { setIsAddingTransfer(true); setWizardStep(1); }}>
                  <Plus size={14} />
                  <span style={{ marginLeft: '6px' }}>Agregar Proveedor</span>
                </button>
              </div>

              {isAddingTransfer ? (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600 }}>Formulario de Registro (Paso {wizardStep} de 2)</h4>
                  <form onSubmit={handleCreateTransfer}>
                    {wizardStep === 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label className="form-label">Nombre del Proveedor (ej: Salesforce, Stripe)</label>
                          <input type="text" className="input-text" style={{ width: '100%' }} value={vendorName} onChange={e => setVendorName(e.target.value)} required />
                        </div>
                        <div>
                          <label className="form-label">País de Destino (Destinatario)</label>
                          <select className="input-text" style={{ width: '100%', background: '#0a0a14' }} value={destCountry} onChange={e => setDestCountry(e.target.value)}>
                            {countries.map(c => (
                              <option key={c.code} value={c.code}>{c.name} ({c.adequacy})</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button type="button" className="btn-save" onClick={() => setWizardStep(2)}>Siguiente</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label className="form-label">Categorías de Datos Transferidas</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'black', padding: '10px', borderRadius: '4px' }}>
                            {['Datos de navegación (cookies/IP)', 'Nombres / Identidad', 'Correo electrónico', 'Datos financieros/tarjetas'].map(cat => {
                              const hasCat = selectedCategories.includes(cat);
                              return (
                                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={hasCat} 
                                    onChange={() => {
                                      if (hasCat) setSelectedCategories(prev => prev.filter(c => c !== cat));
                                      else setSelectedCategories(prev => [...prev, cat]);
                                    }}
                                  />
                                  <span>{cat}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input type="checkbox" checked={signedScc} onChange={e => setSignedScc(e.target.checked)} />
                            <span>¿Firmó Cláusulas Contractuales Tipo (SCC)?</span>
                          </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                          <button type="button" className="btn-action" onClick={() => setWizardStep(1)}>Atrás</button>
                          <button type="submit" className="btn-save">Registrar Proveedor</button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              ) : null}

              {transfers.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="transfers-table">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>País Destinatario</th>
                        <th>Categoría de Datos</th>
                        <th>Adecuación</th>
                        <th>Garantía Firmada (SCC)</th>
                        <th>Acuerdo (DPA)</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map(t => {
                        const isEditing = editingRowId === t.id;
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, fontSize: '13px' }}>{t.provider_name}</td>
                            <td style={{ fontSize: '13px' }}>{t.country}</td>
                            <td style={{ fontSize: '12px' }}>{t.data_categories?.join(', ')}</td>
                            <td>
                              <span className={`badge ${t.adequacy_status === 'Adecuado' ? 'badge-success' : 'badge-grave'}`}>
                                {t.adequacy_status}
                              </span>
                            </td>
                            <td>
                              {isEditing ? (
                                <input 
                                  type="checkbox" 
                                  checked={editFields.has_scc || false}
                                  onChange={e => setEditFields({ ...editFields, has_scc: e.target.checked })}
                                />
                              ) : (
                                <span style={{ color: t.has_scc ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                                  {t.has_scc ? '✓ Firmado' : '✗ Faltante'}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input 
                                  type="checkbox" 
                                  checked={editFields.has_dpa || false}
                                  onChange={e => setEditFields({ ...editFields, has_dpa: e.target.checked })}
                                />
                              ) : (
                                <span style={{ color: t.has_dpa ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                                  {t.has_dpa ? '✓ Firmado' : '✗ Faltante'}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {isEditing ? (
                                  <>
                                    <button 
                                      className="btn-save" 
                                      style={{ padding: '2px 8px', fontSize: '11px' }}
                                      onClick={() => {
                                        handleUpdateTransfer(t.id, editFields);
                                        setEditingRowId(null);
                                      }}
                                    >
                                      Guardar
                                    </button>
                                    <button className="btn-action" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setEditingRowId(null)}>
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      className="btn-action" 
                                      style={{ padding: '2px 8px', fontSize: '11.0px' }}
                                      onClick={() => {
                                        setEditingRowId(t.id);
                                        setEditFields({ has_scc: t.has_scc, has_dpa: t.has_dpa });
                                      }}
                                    >
                                      Editar
                                    </button>
                                    <button className="btn-action" style={{ padding: '2px 8px', fontSize: '11.0px', color: 'var(--color-danger)' }} onClick={() => handleDeleteTransfer(t.id)}>
                                      Eliminar
                                    </button>
                                    {!t.has_scc && (
                                      <button className="btn-save" style={{ padding: '2px 8px', fontSize: '10.5px' }} onClick={() => handleGenerateScc(t)}>
                                        Generar SCC
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>No hay transferencias registradas.</p>
              )}
            </div>
          </div>
        )}

        {/* Sub-tab: Policy & Documents Generator */}
        {remediationSubTab === 'policies' && (
          <PolicyGeneratorView token={token} />
        )}

        {/* Sub-tab: Contract Builder (DPA/SCC) */}
        {remediationSubTab === 'contracts' && (
          <ContractBuilderView token={token} />
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} style={{
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            background: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            <Shield size={16} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Shield size={20} />
          </div>
          <span>PrivacyTech</span>
        </div>

        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '15px' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Volver a la Web Comercial
          </Link>
        </div>
        
        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => { setActiveTab('scanner'); fetchLatestScan(); }}
          >
            <Search size={16} />
            <span>🔍 1. Escáner Automático</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'diagnosis' ? 'active' : ''}`}
            onClick={() => { setActiveTab('diagnosis'); handleFetchDiagnosis(); fetchIncidents(); }}
          >
            <Activity size={16} />
            <span>📊 2. Inventario y Diagnóstico</span>
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'remediation' ? 'active' : ''}`}
            onClick={() => { setActiveTab('remediation'); fetchConsentLogs(); fetchArcoTickets(); fetchTransfers(); fetchConfig(); }}
          >
            <Settings size={16} />
            <span>🛠️ 3. Herramientas de Cumplimiento</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'dpo' ? 'active' : ''}`}
            style={{ 
              borderLeft: activeTab === 'dpo' ? '3px solid #fbbf24' : 'none',
              background: activeTab === 'dpo' ? 'rgba(251, 191, 36, 0.05)' : 'none'
            }}
            onClick={() => setActiveTab('dpo')}
          >
            <Shield size={16} className="text-amber-400" />
            <span className="flex items-center gap-1">
              ⚖️ 4. DPO Suite (Recomendado)
            </span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'dossier' ? 'active' : ''}`}
            style={{ 
              borderLeft: activeTab === 'dossier' ? '3px solid #6366f1' : 'none',
              background: activeTab === 'dossier' ? 'rgba(99, 102, 241, 0.05)' : 'none'
            }}
            onClick={() => setActiveTab('dossier')}
          >
            <FileText size={16} />
            <span>📋 5. Dossier Imprimible</span>
          </div>
          {user?.role === 'superadmin' && (
            <div 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              style={{ 
                borderLeft: activeTab === 'admin' ? '3px solid #f59e0b' : 'none',
                background: activeTab === 'admin' ? 'rgba(245, 158, 11, 0.05)' : 'none'
              }}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={16} className="text-amber-500" />
              <span>👑 Panel Superadmin</span>
            </div>
          )}
        </nav>
        
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '15px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Empresa:</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {user?.company_name || 'Mi Empresa'}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '8px' }}>Usuario:</div>
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {user?.email}
          </div>
        </div>

        <div style={{ padding: '0 16px 15px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={handleResetTestData}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Resetear Datos de Prueba
          </button>

          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Cerrar Sesión
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          Cumplimiento Ley N° 21.719
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-workspace">
        <div style={{ marginBottom: '24px' }}>
          <ProgressStepper 
            activeTab={activeTab} 
            diagnosisData={diagnosisData} 
            draftsCount={diagnosisData?.draftRopaCount || 0} 
          />
        </div>
        {activeTab === 'scanner' && renderScanner()}
        {activeTab === 'diagnosis' && renderDiagnosis()}
        {activeTab === 'remediation' && renderRemediation()}
        {activeTab === 'dpo' && <DpoSuiteView token={token} />}
        {activeTab === 'dossier' && <AuditDossierView token={token} />}
        {activeTab === 'ropa' && <RopaInventoryView token={token} onRopaUpdated={handleFetchDiagnosis} />}
        {activeTab === 'admin' && <AdminDashboardView token={token} />}

        {/* Modal: SCC Agreement Generator Viewer */}
        {isGeneratingScc && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '750px', width: '100%', padding: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Borrador Cláusulas Contractuales Tipo (SCC - Art. 28)</h3>
              </div>
              <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '420px' }}>
                <textarea 
                  className="form-textarea" 
                  readOnly 
                  rows={15} 
                  value={generatedSccText}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', background: '#0a0a14', color: '#c0c0d0', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                />
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  className="btn-action" 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedSccText);
                    showToast('Contrato copiado al portapapeles.', 'success');
                  }}
                >
                  Copiar Contrato
                </button>
                <button className="btn-save" onClick={() => setIsGeneratingScc(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Incident Notice visors */}
        {isGeneratingNotice && selectedIncidentForNotice && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '850px', width: '100%', padding: '0', display: 'flex', flexDirection: 'column', height: '90vh' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Borrador de Oficios Legales (Incidente: {selectedIncidentForNotice.incident_title})</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Generados automáticamente bajo los Artículos 14 sexies de la Ley N° 21.719</span>
                </div>
                <button className="btn-action" onClick={() => { setIsGeneratingNotice(false); setSelectedIncidentForNotice(null); }}>Cerrar</button>
              </div>

              <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-danger)' }}>📄 OFICIO DE NOTIFICACIÓN A LA AGENCIA</span>
                    <button 
                      className="btn-action" style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(agencyNoticeText);
                        showToast('Oficio a la Agencia copiado.', 'success');
                      }}
                    >Copiar</button>
                  </div>
                  <textarea 
                    className="form-textarea" readOnly rows={16} value={agencyNoticeText}
                    style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '11.5px', background: '#0a0a14', color: '#c0c0d0', lineHeight: 1.4 }}
                  />
                </div>

                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)' }}>📧 COMUNICACIÓN PARA CLIENTES AFECTADOS</span>
                    <button 
                      className="btn-action" style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(titularsNoticeText);
                        showToast('Comunicado a clientes copiado.', 'success');
                      }}
                    >Copiar</button>
                  </div>
                  <textarea 
                    className="form-textarea" readOnly rows={16} value={titularsNoticeText}
                    style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '11.5px', background: '#0a0a14', color: '#c0c0d0', lineHeight: 1.4 }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)', borderRadius: '0 0 12px 12px' }}>
                <button className="btn-save" onClick={() => { setIsGeneratingNotice(false); setSelectedIncidentForNotice(null); }}>Entendido y Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <LegalCopilot token={token} />
    </div>
  );
}

function ProtectedRoute({ children, token }: { children: React.ReactNode; token: string | null }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dpo_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('dpo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('dpo_token', newToken);
    localStorage.setItem('dpo_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dpo_token');
    localStorage.removeItem('dpo_user');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={<LoginView onLoginSuccess={handleAuthSuccess} />} 
        />
        <Route 
          path="/register" 
          element={<RegisterView onRegisterSuccess={handleAuthSuccess} />} 
        />
        <Route 
          path="/forgot-password" 
          element={<ForgotPasswordView />} 
        />
        <Route 
          path="/reset-password/:token" 
          element={<ResetPasswordView />} 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute token={token}>
              <Dashboard token={token} user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute token={token}>
              {user?.role === 'superadmin' ? (
                <Dashboard token={token} user={user} onLogout={handleLogout} initialTab="admin" />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          } 
        />
        <Route path="/privacidad" element={<PrivacyPolicyPublic />} />
        <Route path="/cookies" element={<CookiesPolicyPublic />} />
        <Route path="/terminos" element={<TermsAndConditions />} />
        <Route path="/arco" element={<ArcoRequestPublic />} />
      </Routes>
    </BrowserRouter>
  );
}
