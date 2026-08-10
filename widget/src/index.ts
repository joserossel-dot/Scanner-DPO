import { WIDGET_STYLES } from './styles.js';

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

interface ConsentTypes {
  essential: boolean;
  analytical: boolean;
  marketing: boolean;
}

class PrivacyTechWidget {
  private apiHost: string;
  private domain: string;
  private config: ClientConfig | null = null;
  private consent: ConsentTypes | null = null;
  private blockedScripts: { element: HTMLScriptElement; src: string; category: string }[] = [];

  constructor() {
    // Allow compile-time override via VITE_API_URL or auto-detect from script src
    const compileTimeUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.RENDER_EXTERNAL_URL;
    if (compileTimeUrl) {
      this.apiHost = compileTimeUrl;
    } else {
      const currentScript = document.currentScript as HTMLScriptElement;
      this.apiHost = currentScript ? new URL(currentScript.src).origin : 'http://localhost:3000';
    }
    this.domain = window.location.host;
    
    this.setupInterceptors();
    this.init();
  }

  // --- 1. SCRIPT INTERCEPTION & BLOCKING ---
  private setupInterceptors() {
    const self = this;
    
    // Intercept document.createElement('script')
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName: string, options?: ElementCreationOptions): HTMLElement {
      const el = originalCreateElement.call(document, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        const scriptEl = el as HTMLScriptElement;
        
        // Define interceptor for 'src' property
        Object.defineProperty(scriptEl, 'src', {
          set(val: string) {
            const category = self.getScriptCategory(val);
            if (category && !self.hasConsent(category)) {
              scriptEl.setAttribute('data-pt-blocked', val);
              scriptEl.setAttribute('data-pt-category', category);
              scriptEl.removeAttribute('src'); // Prevent immediate execution
              self.blockedScripts.push({ element: scriptEl, src: val, category });
              console.log(`[PrivacyTech] Script bloqueado de forma preventiva: ${val} (${category})`);
            } else {
              scriptEl.setAttribute('src', val);
            }
          },
          get() {
            return scriptEl.getAttribute('src') || scriptEl.getAttribute('data-pt-blocked') || '';
          },
          configurable: true
        });
      }
      return el;
    };

    // Override inline methods for analytics mock
    (window as any).ga = (window as any).ga || function() {
      if (self.hasConsent('analytical')) {
        ((window as any).ga.q = (window as any).ga.q || []).push(arguments);
      } else {
        console.log('[PrivacyTech] Google Analytics llamada ignorada (Falta Consentimiento)');
      }
    };
    
    (window as any).fbq = (window as any).fbq || function() {
      if (self.hasConsent('marketing')) {
        // Forward calls
        console.log('[PrivacyTech] Meta Pixel llamada permitida.');
      } else {
        console.log('[PrivacyTech] Meta Pixel llamada ignorada (Falta Consentimiento)');
      }
    };
  }

  private getScriptCategory(src: string): 'analytical' | 'marketing' | null {
    if (/google-analytics\.com|analytics\.js|gtag/i.test(src)) {
      return 'analytical';
    }
    if (/connect\.facebook\.net|fbevents\.js/i.test(src)) {
      return 'marketing';
    }
    if (/hotjar\.com/i.test(src)) {
      return 'analytical';
    }
    return null;
  }

  private hasConsent(category: 'essential' | 'analytical' | 'marketing'): boolean {
    if (category === 'essential') return true;
    if (!this.consent) return false;
    return this.consent[category] || false;
  }

  private unblockScripts() {
    this.blockedScripts.forEach(script => {
      if (this.hasConsent(script.category as any)) {
        const parent = script.element.parentNode || document.head;
        const newScript = document.createElement('script');
        newScript.src = script.src;
        // Copy other attributes
        Array.from(script.element.attributes).forEach(attr => {
          if (attr.name !== 'src' && attr.name !== 'data-pt-blocked' && attr.name !== 'data-pt-category') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        parent.removeChild(script.element);
        parent.appendChild(newScript);
        console.log(`[PrivacyTech] Script desbloqueado y ejecutado: ${script.src}`);
      }
    });
    // Remove unblocked from array
    this.blockedScripts = this.blockedScripts.filter(s => !this.hasConsent(s.category as any));
  }

  // --- 2. INITIALIZATION ---
  private async init() {
    // Inject Styles
    const styleEl = document.createElement('style');
    styleEl.textContent = WIDGET_STYLES;
    document.head.appendChild(styleEl);

    // Fetch Config from backend
    try {
      const res = await fetch(`${this.apiHost}/api/config/${this.domain}`);
      if (res.ok) {
        this.config = await res.json();
      }
    } catch (e) {
      console.warn('[PrivacyTech] Error cargando configuración del backend, usando defaults locales.');
    }

    // Default configuration if API fails
    if (!this.config) {
      this.config = {
        domain: this.domain,
        company_name: 'Organización Local',
        policy_version: 'v1.0.0',
        policy_content: {
          representative: 'Representante General',
          representative_email: 'privacidad@dominio.cl',
          purposes: 'Prestación de servicios web y analítica básica.',
          retention_time: '24 meses.',
          exercise_channels: 'Formulario ARCO+ integrado.'
        },
        banner_title: 'Tu Privacidad es Prioridad',
        banner_description: 'Utilizamos cookies propias y de terceros para optimizar la experiencia y analizar estadísticas conforme a la Ley N° 21.719.'
      };
    }

    // Check existing consent in localStorage
    const savedConsent = localStorage.getItem('pt_consent_preferences');
    if (savedConsent) {
      this.consent = JSON.parse(savedConsent);
      this.unblockScripts();
      this.renderFloatingBadge();
    } else {
      this.renderBanner();
    }
  }

  // --- 3. UI RENDERING ---
  private getRootElement(): HTMLElement {
    let root = document.getElementById('pt-widget-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'pt-widget-root';
      document.body.appendChild(root);
    }
    return root;
  }

  private renderFloatingBadge() {
    const root = this.getRootElement();
    // Clear old elements if any
    root.innerHTML = '';

    const badge = document.createElement('div');
    badge.className = 'pt-floating-badge';
    badge.title = 'Derechos de Privacidad (ARCO+) y Cookies';
    badge.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v6.8z"/>
      </svg>
    `;
    badge.addEventListener('click', () => this.showArcoMenu());
    root.appendChild(badge);
  }

  private renderBanner() {
    const root = this.getRootElement();
    root.innerHTML = '';

    const banner = document.createElement('div');
    banner.className = 'pt-banner';
    banner.innerHTML = `
      <div class="pt-banner-content">
        <p class="pt-banner-title">${this.config?.banner_title}</p>
        <p class="pt-banner-desc">
          ${this.config?.banner_description}
          Lee nuestra <a id="pt-link-policy">Política de Privacidad</a> para saber más.
        </p>
      </div>
      <div class="pt-banner-actions">
        <button class="pt-btn pt-btn-secondary" id="pt-btn-pref">Configurar</button>
        <button class="pt-btn pt-btn-secondary" id="pt-btn-reject">Solo Esenciales</button>
        <button class="pt-btn pt-btn-primary" id="pt-btn-accept">Aceptar Todo</button>
      </div>
    `;

    root.appendChild(banner);

    // Event listeners
    document.getElementById('pt-link-policy')?.addEventListener('click', () => this.showPrivacyPolicy());
    document.getElementById('pt-btn-pref')?.addEventListener('click', () => this.showPreferencesModal());
    document.getElementById('pt-btn-reject')?.addEventListener('click', () => this.saveConsent({
      essential: true,
      analytical: false,
      marketing: false
    }));
    document.getElementById('pt-btn-accept')?.addEventListener('click', () => this.saveConsent({
      essential: true,
      analytical: true,
      marketing: true
    }));
  }

  // --- 4. CONSENT MANAGEMENT ---
  private async saveConsent(preferences: ConsentTypes) {
    this.consent = preferences;
    localStorage.setItem('pt_consent_preferences', JSON.stringify(preferences));

    // Log to API
    try {
      await fetch(`${this.apiHost}/api/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: this.domain,
          consentTypes: preferences,
          policyVersion: this.config?.policy_version || 'v1.0.0',
          userAgent: navigator.userAgent
        })
      });
    } catch (e) {
      console.warn('[PrivacyTech] Error registrando log de consentimiento en servidor.');
    }

    this.unblockScripts();
    this.renderFloatingBadge();
  }

  // --- 5. MODALES (Capa 2, ARCO+, Política) ---
  private createModal(title: string, contentHtml: string): { overlay: HTMLElement; close: () => void } {
    const root = this.getRootElement();
    
    const overlay = document.createElement('div');
    overlay.className = 'pt-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'pt-modal';
    
    modal.innerHTML = `
      <div class="pt-modal-header">
        <h3>${title}</h3>
        <button class="pt-modal-close">&times;</button>
      </div>
      <div class="pt-modal-body">
        ${contentHtml}
      </div>
    `;

    overlay.appendChild(modal);
    root.appendChild(overlay);

    const close = () => {
      if (root.contains(overlay)) {
        root.removeChild(overlay);
      }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    modal.querySelector('.pt-modal-close')?.addEventListener('click', close);

    return { overlay, close };
  }

  private showPreferencesModal() {
    const content = `
      <p style="font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px;">
        Personaliza tus opciones de consentimiento de acuerdo a la Ley de Protección de Datos Personales.
      </p>
      
      <div class="pt-pref-card">
        <input type="checkbox" class="pt-pref-checkbox" checked disabled>
        <div class="pt-pref-info">
          <p class="pt-pref-title">Cookies Esenciales <span class="pt-pref-badge">Requerido</span></p>
          <p class="pt-pref-desc">Necesarias para el funcionamiento técnico básico del sitio web y almacenamiento de preferencias.</p>
        </div>
      </div>

      <div class="pt-pref-card">
        <input type="checkbox" class="pt-pref-checkbox" id="pt-chk-analytical" ${this.hasConsent('analytical') ? 'checked' : ''}>
        <div class="pt-pref-info">
          <p class="pt-pref-title">Cookies Analíticas</p>
          <p class="pt-pref-desc">Nos permiten medir el tráfico de usuarios y comportamiento de navegación para mejorar nuestros servicios.</p>
        </div>
      </div>

      <div class="pt-pref-card">
        <input type="checkbox" class="pt-pref-checkbox" id="pt-chk-marketing" ${this.hasConsent('marketing') ? 'checked' : ''}>
        <div class="pt-pref-info">
          <p class="pt-pref-title">Cookies de Publicidad / Marketing</p>
          <p class="pt-pref-desc">Utilizadas para crear perfiles de interés del usuario y desplegar anuncios publicitarios relevantes.</p>
        </div>
      </div>

      <button class="pt-btn pt-btn-primary" id="pt-btn-save-pref" style="width: 100%; margin-top: 10px;">Guardar Preferencias</button>
    `;

    const { close } = this.createModal('Configurar Preferencias', content);

    document.getElementById('pt-btn-save-pref')?.addEventListener('click', () => {
      const analytical = (document.getElementById('pt-chk-analytical') as HTMLInputElement).checked;
      const marketing = (document.getElementById('pt-chk-marketing') as HTMLInputElement).checked;
      
      this.saveConsent({
        essential: true,
        analytical,
        marketing
      });
      close();
    });
  }

  private showPrivacyPolicy() {
    const policy = this.config?.policy_content;
    const content = `
      <div style="font-size: 13px; color: #475569;">
        <p style="margin-top: 0; margin-bottom: 20px;">
          Esta política regula el tratamiento de datos personales en el sitio web conforme a la Ley N° 21.719 (Chile).
        </p>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">1. Responsable del Tratamiento</p>
          <p class="pt-policy-sec-body">${policy?.representative || 'No especificado'} (${this.config?.company_name})</p>
          <p class="pt-policy-sec-body">Correo: ${policy?.representative_email || 'No especificado'}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">2. Finalidades de Tratamiento</p>
          <p class="pt-policy-sec-body">${policy?.purposes || 'No especificado'}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">3. Plazo de Conservación</p>
          <p class="pt-policy-sec-body">${policy?.retention_time || 'No especificado'}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">4. Ejercicio de Derechos (ARCO+)</p>
          <p class="pt-policy-sec-body">Puede ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición, Portabilidad y Bloqueo Temporal contactando al correo indicado o a través de nuestro portal interactivo haciendo clic en el escudo de privacidad.</p>
        </div>

        <p style="font-size: 11px; color: #94a3b8; margin-top: 25px; text-align: center;">
          Versión de Política: ${this.config?.policy_version || '1.0.0'}
        </p>
      </div>
    `;

    this.createModal('Política de Privacidad', content);
  }

  private showArcoMenu() {
    const content = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button class="pt-btn pt-btn-secondary" id="pt-btn-opt-policy" style="text-align: left; padding: 14px;">
          📖 Ver Política de Privacidad Dinámica
        </button>
        <button class="pt-btn pt-btn-secondary" id="pt-btn-opt-cookies" style="text-align: left; padding: 14px;">
          ⚙️ Ajustar Preferencias de Cookies
        </button>
        <button class="pt-btn pt-btn-primary" id="pt-btn-opt-arco" style="text-align: left; padding: 14px; background: #2563eb; color: white;">
          🛡️ Ejercer Derechos ARCO+ (Ley 21.719)
        </button>
      </div>
    `;

    const { close } = this.createModal('Centro de Privacidad', content);

    document.getElementById('pt-btn-opt-policy')?.addEventListener('click', () => {
      close();
      this.showPrivacyPolicy();
    });

    document.getElementById('pt-btn-opt-cookies')?.addEventListener('click', () => {
      close();
      this.showPreferencesModal();
    });

    document.getElementById('pt-btn-opt-arco')?.addEventListener('click', () => {
      close();
      this.showArcoForm();
    });
  }

  private showArcoForm() {
    const content = `
      <form id="pt-arco-form">
        <div class="pt-form-alert pt-form-alert-info">
          <strong>Plazos Legales en Chile:</strong> Las solicitudes generales de derechos ARCO+ se resolverán en un plazo máximo de <strong>30 días corridos</strong>. Las solicitudes de <strong>Bloqueo Temporal</strong> se procesarán en un máximo de <strong>2 días hábiles</strong>.
        </div>

        <div id="pt-arco-form-fields">
          <div class="pt-form-group">
            <label class="pt-form-label" for="pt-arco-name">Nombre Completo</label>
            <input class="pt-form-input" type="text" id="pt-arco-name" required placeholder="Ej. Juan Pérez">
          </div>

          <div class="pt-form-group">
            <label class="pt-form-label" for="pt-arco-email">Correo Electrónico</label>
            <input class="pt-form-input" type="email" id="pt-arco-email" required placeholder="Ej. juan@correo.cl">
          </div>

          <div class="pt-form-group">
            <label class="pt-form-label" for="pt-arco-type">Derecho que desea Ejercer</label>
            <select class="pt-form-select" id="pt-arco-type" required>
              <option value="">-- Seleccione una Opción --</option>
              <option value="Acceso">Acceso (Conocer qué datos se tienen)</option>
              <option value="Rectificación">Rectificación (Corregir datos incorrectos)</option>
              <option value="Supresión">Supresión / Eliminación</option>
              <option value="Oposición">Oposición (Negar tratamiento específico)</option>
              <option value="Portabilidad">Portabilidad (Trasladar datos a otro proveedor)</option>
              <option value="Bloqueo">Bloqueo Temporal (Suspensión por 2 días hábiles)</option>
            </select>
          </div>

          <div class="pt-form-group">
            <label class="pt-form-label" for="pt-arco-details">Detalles de la Solicitud</label>
            <textarea class="pt-form-textarea" id="pt-arco-details" rows="4" required placeholder="Describa claramente su requerimiento o los datos que desea consultar/modificar..."></textarea>
          </div>

          <button class="pt-btn pt-btn-primary" type="submit" style="width: 100%;">Enviar Solicitud</button>
        </div>
      </form>
    `;

    const { close } = this.createModal('Formulario de Derechos ARCO+', content);

    const form = document.getElementById('pt-arco-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = (document.getElementById('pt-arco-name') as HTMLInputElement).value;
      const email = (document.getElementById('pt-arco-email') as HTMLInputElement).value;
      const type = (document.getElementById('pt-arco-type') as HTMLSelectElement).value;
      const details = (document.getElementById('pt-arco-details') as HTMLTextAreaElement).value;

      try {
        const res = await fetch(`${this.apiHost}/api/arco`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: this.domain,
            requesterName: name,
            requesterEmail: email,
            requestType: type,
            details: details
          })
        });

        if (res.ok) {
          const data = await res.json();
          const limitDate = new Date(data.dueDate).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const fieldsContainer = document.getElementById('pt-arco-form-fields');
          if (fieldsContainer) {
            fieldsContainer.innerHTML = `
              <div class="pt-form-alert pt-form-alert-success">
                🚀 <strong>¡Solicitud Registrada con Éxito!</strong><br>
                Hemos recibido su requerimiento de <strong>${type}</strong>.<br><br>
                Conforme a la normativa legal vigente, la fecha máxima de respuesta es el <strong>${limitDate}</strong>. Se le notificará al correo provisto.
              </div>
              <button class="pt-btn pt-btn-secondary" id="pt-btn-arco-done" style="width: 100%;">Cerrar Portal</button>
            `;
            document.getElementById('pt-btn-arco-done')?.addEventListener('click', close);
          }
        } else {
          throw new Error();
        }
      } catch (err) {
        alert('Hubo un error al procesar su solicitud. Intente más tarde.');
      }
    });
  }
}

// Auto-instantiate
new PrivacyTechWidget();
