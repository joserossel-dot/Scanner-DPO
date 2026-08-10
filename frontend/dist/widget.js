var h=Object.defineProperty;var y=(l,r,p)=>r in l?h(l,r,{enumerable:!0,configurable:!0,writable:!0,value:p}):l[r]=p;var d=(l,r,p)=>y(l,typeof r!="symbol"?r+"":r,p);(function(){"use strict";const l=`
/* PrivacyTech Widget Styles */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

#pt-widget-root {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
  position: fixed;
  z-index: 999999;
}

/* Floating Privacy Badge */
.pt-floating-badge {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(255, 255, 255, 0.1);
}
.pt-floating-badge:hover {
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
}
.pt-floating-badge svg {
  width: 24px;
  height: 24px;
  fill: #ffffff;
}

/* Capa 1: Cookie Banner */
.pt-banner {
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 88px; /* Safe space for the floating badge */
  max-width: 800px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ptSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (min-width: 768px) {
  .pt-banner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
}
.pt-banner-content {
  flex: 1;
}
.pt-banner-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: #0f172a;
}
.pt-banner-desc {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  color: #475569;
}
.pt-banner-desc a {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}
.pt-banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 280px;
}
.pt-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}
.pt-btn-primary {
  background: #2563eb;
  color: white;
  flex: 1;
}
.pt-btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.pt-btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}
.pt-btn-secondary:hover {
  background: #e2e8f0;
}

/* Modales (Capa 2, ARCO+, Política) */
.pt-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ptFadeIn 0.3s ease;
}
.pt-modal {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ptScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pt-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pt-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.pt-modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
  padding: 0;
}
.pt-modal-close:hover {
  color: #475569;
}
.pt-modal-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* Preference Cards (Capa 2) */
.pt-pref-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.pt-pref-card:focus-within {
  border-color: #2563eb;
}
.pt-pref-checkbox {
  margin-top: 4px;
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}
.pt-pref-info {
  flex: 1;
}
.pt-pref-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pt-pref-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 99px;
  color: #64748b;
  font-weight: 500;
}
.pt-pref-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}

/* Form Styles (ARCO+) */
.pt-form-group {
  margin-bottom: 16px;
}
.pt-form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.pt-form-input, .pt-form-select, .pt-form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  box-sizing: border-box;
}
.pt-form-input:focus, .pt-form-select:focus, .pt-form-textarea:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.pt-form-alert {
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 16px;
}
.pt-form-alert-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}
.pt-form-alert-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #14532d;
}

/* Policy Content Viewer styles */
.pt-policy-section {
  margin-bottom: 18px;
}
.pt-policy-sec-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pt-policy-sec-body {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}

/* Animations */
@keyframes ptSlideUp {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes ptFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ptScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
`,r={};class p{constructor(){d(this,"apiHost");d(this,"domain");d(this,"config",null);d(this,"consent",null);d(this,"blockedScripts",[]);const e=(r==null?void 0:r.VITE_API_URL)||(r==null?void 0:r.RENDER_EXTERNAL_URL);if(e)this.apiHost=e;else{const t=document.currentScript;this.apiHost=t?new URL(t.src).origin:"http://localhost:3000"}this.domain=window.location.host,this.setupInterceptors(),this.init()}setupInterceptors(){const e=this,t=document.createElement;document.createElement=function(i,o){const a=t.call(document,i,o);if(i.toLowerCase()==="script"){const n=a;Object.defineProperty(n,"src",{set(s){const c=e.getScriptCategory(s);c&&!e.hasConsent(c)?(n.setAttribute("data-pt-blocked",s),n.setAttribute("data-pt-category",c),n.removeAttribute("src"),e.blockedScripts.push({element:n,src:s,category:c}),console.log(`[PrivacyTech] Script bloqueado de forma preventiva: ${s} (${c})`)):n.setAttribute("src",s)},get(){return n.getAttribute("src")||n.getAttribute("data-pt-blocked")||""},configurable:!0})}return a},window.ga=window.ga||function(){e.hasConsent("analytical")?(window.ga.q=window.ga.q||[]).push(arguments):console.log("[PrivacyTech] Google Analytics llamada ignorada (Falta Consentimiento)")},window.fbq=window.fbq||function(){e.hasConsent("marketing")?console.log("[PrivacyTech] Meta Pixel llamada permitida."):console.log("[PrivacyTech] Meta Pixel llamada ignorada (Falta Consentimiento)")}}getScriptCategory(e){return/google-analytics\.com|analytics\.js|gtag/i.test(e)?"analytical":/connect\.facebook\.net|fbevents\.js/i.test(e)?"marketing":/hotjar\.com/i.test(e)?"analytical":null}hasConsent(e){return e==="essential"?!0:this.consent&&this.consent[e]||!1}unblockScripts(){this.blockedScripts.forEach(e=>{if(this.hasConsent(e.category)){const t=e.element.parentNode||document.head,i=document.createElement("script");i.src=e.src,Array.from(e.element.attributes).forEach(o=>{o.name!=="src"&&o.name!=="data-pt-blocked"&&o.name!=="data-pt-category"&&i.setAttribute(o.name,o.value)}),t.removeChild(e.element),t.appendChild(i),console.log(`[PrivacyTech] Script desbloqueado y ejecutado: ${e.src}`)}}),this.blockedScripts=this.blockedScripts.filter(e=>!this.hasConsent(e.category))}async init(){const e=document.createElement("style");e.textContent=l,document.head.appendChild(e);try{const i=await fetch(`${this.apiHost}/api/config/${this.domain}`);i.ok&&(this.config=await i.json())}catch{console.warn("[PrivacyTech] Error cargando configuración del backend, usando defaults locales.")}this.config||(this.config={domain:this.domain,company_name:"Organización Local",policy_version:"v1.0.0",policy_content:{representative:"Representante General",representative_email:"privacidad@dominio.cl",purposes:"Prestación de servicios web y analítica básica.",retention_time:"24 meses.",exercise_channels:"Formulario ARCO+ integrado."},banner_title:"Tu Privacidad es Prioridad",banner_description:"Utilizamos cookies propias y de terceros para optimizar la experiencia y analizar estadísticas conforme a la Ley N° 21.719."});const t=localStorage.getItem("pt_consent_preferences");t?(this.consent=JSON.parse(t),this.unblockScripts(),this.renderFloatingBadge()):this.renderBanner()}getRootElement(){let e=document.getElementById("pt-widget-root");return e||(e=document.createElement("div"),e.id="pt-widget-root",document.body.appendChild(e)),e}renderFloatingBadge(){const e=this.getRootElement();e.innerHTML="";const t=document.createElement("div");t.className="pt-floating-badge",t.title="Derechos de Privacidad (ARCO+) y Cookies",t.innerHTML=`
      <svg viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v6.8z"/>
      </svg>
    `,t.addEventListener("click",()=>this.showArcoMenu()),e.appendChild(t)}renderBanner(){var i,o,a,n,s,c;const e=this.getRootElement();e.innerHTML="";const t=document.createElement("div");t.className="pt-banner",t.innerHTML=`
      <div class="pt-banner-content">
        <p class="pt-banner-title">${(i=this.config)==null?void 0:i.banner_title}</p>
        <p class="pt-banner-desc">
          ${(o=this.config)==null?void 0:o.banner_description}
          Lee nuestra <a id="pt-link-policy">Política de Privacidad</a> para saber más.
        </p>
      </div>
      <div class="pt-banner-actions">
        <button class="pt-btn pt-btn-secondary" id="pt-btn-pref">Configurar</button>
        <button class="pt-btn pt-btn-secondary" id="pt-btn-reject">Solo Esenciales</button>
        <button class="pt-btn pt-btn-primary" id="pt-btn-accept">Aceptar Todo</button>
      </div>
    `,e.appendChild(t),(a=document.getElementById("pt-link-policy"))==null||a.addEventListener("click",()=>this.showPrivacyPolicy()),(n=document.getElementById("pt-btn-pref"))==null||n.addEventListener("click",()=>this.showPreferencesModal()),(s=document.getElementById("pt-btn-reject"))==null||s.addEventListener("click",()=>this.saveConsent({essential:!0,analytical:!1,marketing:!1})),(c=document.getElementById("pt-btn-accept"))==null||c.addEventListener("click",()=>this.saveConsent({essential:!0,analytical:!0,marketing:!0}))}async saveConsent(e){var t;this.consent=e,localStorage.setItem("pt_consent_preferences",JSON.stringify(e));try{await fetch(`${this.apiHost}/api/consent`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:this.domain,consentTypes:e,policyVersion:((t=this.config)==null?void 0:t.policy_version)||"v1.0.0",userAgent:navigator.userAgent})})}catch{console.warn("[PrivacyTech] Error registrando log de consentimiento en servidor.")}this.unblockScripts(),this.renderFloatingBadge()}createModal(e,t){var s;const i=this.getRootElement(),o=document.createElement("div");o.className="pt-modal-overlay";const a=document.createElement("div");a.className="pt-modal",a.innerHTML=`
      <div class="pt-modal-header">
        <h3>${e}</h3>
        <button class="pt-modal-close">&times;</button>
      </div>
      <div class="pt-modal-body">
        ${t}
      </div>
    `,o.appendChild(a),i.appendChild(o);const n=()=>{i.contains(o)&&i.removeChild(o)};return o.addEventListener("click",c=>{c.target===o&&n()}),(s=a.querySelector(".pt-modal-close"))==null||s.addEventListener("click",n),{overlay:o,close:n}}showPreferencesModal(){var i;const e=`
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
        <input type="checkbox" class="pt-pref-checkbox" id="pt-chk-analytical" ${this.hasConsent("analytical")?"checked":""}>
        <div class="pt-pref-info">
          <p class="pt-pref-title">Cookies Analíticas</p>
          <p class="pt-pref-desc">Nos permiten medir el tráfico de usuarios y comportamiento de navegación para mejorar nuestros servicios.</p>
        </div>
      </div>

      <div class="pt-pref-card">
        <input type="checkbox" class="pt-pref-checkbox" id="pt-chk-marketing" ${this.hasConsent("marketing")?"checked":""}>
        <div class="pt-pref-info">
          <p class="pt-pref-title">Cookies de Publicidad / Marketing</p>
          <p class="pt-pref-desc">Utilizadas para crear perfiles de interés del usuario y desplegar anuncios publicitarios relevantes.</p>
        </div>
      </div>

      <button class="pt-btn pt-btn-primary" id="pt-btn-save-pref" style="width: 100%; margin-top: 10px;">Guardar Preferencias</button>
    `,{close:t}=this.createModal("Configurar Preferencias",e);(i=document.getElementById("pt-btn-save-pref"))==null||i.addEventListener("click",()=>{const o=document.getElementById("pt-chk-analytical").checked,a=document.getElementById("pt-chk-marketing").checked;this.saveConsent({essential:!0,analytical:o,marketing:a}),t()})}showPrivacyPolicy(){var i,o,a;const e=(i=this.config)==null?void 0:i.policy_content,t=`
      <div style="font-size: 13px; color: #475569;">
        <p style="margin-top: 0; margin-bottom: 20px;">
          Esta política regula el tratamiento de datos personales en el sitio web conforme a la Ley N° 21.719 (Chile).
        </p>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">1. Responsable del Tratamiento</p>
          <p class="pt-policy-sec-body">${(e==null?void 0:e.representative)||"No especificado"} (${(o=this.config)==null?void 0:o.company_name})</p>
          <p class="pt-policy-sec-body">Correo: ${(e==null?void 0:e.representative_email)||"No especificado"}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">2. Finalidades de Tratamiento</p>
          <p class="pt-policy-sec-body">${(e==null?void 0:e.purposes)||"No especificado"}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">3. Plazo de Conservación</p>
          <p class="pt-policy-sec-body">${(e==null?void 0:e.retention_time)||"No especificado"}</p>
        </div>

        <div class="pt-policy-section">
          <p class="pt-policy-sec-title">4. Ejercicio de Derechos (ARCO+)</p>
          <p class="pt-policy-sec-body">Puede ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición, Portabilidad y Bloqueo Temporal contactando al correo indicado o a través de nuestro portal interactivo haciendo clic en el escudo de privacidad.</p>
        </div>

        <p style="font-size: 11px; color: #94a3b8; margin-top: 25px; text-align: center;">
          Versión de Política: ${((a=this.config)==null?void 0:a.policy_version)||"1.0.0"}
        </p>
      </div>
    `;this.createModal("Política de Privacidad",t)}showArcoMenu(){var i,o,a;const e=`
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
    `,{close:t}=this.createModal("Centro de Privacidad",e);(i=document.getElementById("pt-btn-opt-policy"))==null||i.addEventListener("click",()=>{t(),this.showPrivacyPolicy()}),(o=document.getElementById("pt-btn-opt-cookies"))==null||o.addEventListener("click",()=>{t(),this.showPreferencesModal()}),(a=document.getElementById("pt-btn-opt-arco"))==null||a.addEventListener("click",()=>{t(),this.showArcoForm()})}showArcoForm(){const e=`
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
    `,{close:t}=this.createModal("Formulario de Derechos ARCO+",e);document.getElementById("pt-arco-form").addEventListener("submit",async o=>{var f;o.preventDefault();const a=document.getElementById("pt-arco-name").value,n=document.getElementById("pt-arco-email").value,s=document.getElementById("pt-arco-type").value,c=document.getElementById("pt-arco-details").value;try{const m=await fetch(`${this.apiHost}/api/arco`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:this.domain,requesterName:a,requesterEmail:n,requestType:s,details:c})});if(m.ok){const u=await m.json(),g=new Date(u.dueDate).toLocaleDateString("es-CL",{year:"numeric",month:"long",day:"numeric"}),b=document.getElementById("pt-arco-form-fields");b&&(b.innerHTML=`
              <div class="pt-form-alert pt-form-alert-success">
                🚀 <strong>¡Solicitud Registrada con Éxito!</strong><br>
                Hemos recibido su requerimiento de <strong>${s}</strong>.<br><br>
                Conforme a la normativa legal vigente, la fecha máxima de respuesta es el <strong>${g}</strong>. Se le notificará al correo provisto.
              </div>
              <button class="pt-btn pt-btn-secondary" id="pt-btn-arco-done" style="width: 100%;">Cerrar Portal</button>
            `,(f=document.getElementById("pt-btn-arco-done"))==null||f.addEventListener("click",t))}else throw new Error}catch{alert("Hubo un error al procesar su solicitud. Intente más tarde.")}})}}new p})();
