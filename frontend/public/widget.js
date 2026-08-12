(function() {
  // 1. Detect tenant from script src parameter (e.g. widget.js?tenant=ID)
  let tenantId = 'default';
  const currentScript = document.currentScript;
  if (currentScript) {
    const srcUrl = new URL(currentScript.src, window.location.href);
    const params = new URLSearchParams(srcUrl.search);
    tenantId = params.get('tenant') || 'default';
  }

  // Determine API host URL (automatic local detection or production Render)
  let apiHost = 'https://pt-compliance-api.onrender.com';
  if (currentScript) {
    const url = new URL(currentScript.src);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      apiHost = 'http://localhost:3050'; // Fallback mapping matching local ports or main port
      if (window.location.port) {
        apiHost = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
      } else {
        apiHost = 'http://localhost:3000';
      }
    }
  }

  // 2. COOKIE BLOCKING MOTOR (Monkey Patching document.createElement)
  const blockedScripts = [];
  const hasConsent = () => {
    return localStorage.getItem('dpo_consent') === 'true';
  };

  const isTrackingScript = (src) => {
    return /google-analytics\.com|googletagmanager\.com|connect\.facebook\.net|hotjar\.com/i.test(src);
  };

  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const el = originalCreateElement.call(document, tagName, options);
    if (tagName.toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        set(val) {
          if (isTrackingScript(val) && !hasConsent()) {
            el.setAttribute('data-pt-blocked', val);
            el.removeAttribute('src');
            blockedScripts.push({ element: el, src: val });
            console.log(`[PrivacyTech Widget] Script bloqueado de forma preventiva: ${val}`);
          } else {
            el.setAttribute('src', val);
          }
        },
        get() {
          return el.getAttribute('src') || el.getAttribute('data-pt-blocked') || '';
        },
        configurable: true
      });
    }
    return el;
  };

  // Mock global hooks for popular trackers
  window.ga = window.ga || function() {
    if (hasConsent()) {
      (window.ga.q = window.ga.q || []).push(arguments);
    } else {
      console.log('[PrivacyTech Widget] Google Analytics llamado ignorado (Falta Consentimiento).');
    }
  };
  window.fbq = window.fbq || function() {
    if (hasConsent()) {
      console.log('[PrivacyTech Widget] Meta Pixel llamada permitida.');
    } else {
      console.log('[PrivacyTech Widget] Meta Pixel llamado ignorado (Falta Consentimiento).');
    }
  };

  // Unblock scripts when user grants consent
  const unblockScripts = () => {
    blockedScripts.forEach(script => {
      const parent = script.element.parentNode || document.head;
      const newScript = originalCreateElement.call(document, 'script');
      newScript.src = script.src;
      Array.from(script.element.attributes).forEach(attr => {
        if (attr.name !== 'src' && attr.name !== 'data-pt-blocked') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      if (script.element.parentNode) {
        parent.removeChild(script.element);
      }
      parent.appendChild(newScript);
      console.log(`[PrivacyTech Widget] Script desbloqueado y ejecutado: ${script.src}`);
    });
    blockedScripts.length = 0;
  };

  // 3. UI BANNER INJECTION
  const renderBanner = () => {
    if (document.getElementById('pt-consent-banner')) return;

    const banner = originalCreateElement.call(document, 'div');
    banner.id = 'pt-consent-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background-color:#0f172a;color:#cbd5e1;padding:16px 24px;box-shadow:0 -4px 10px rgba(0,0,0,0.3);z-index:999999;font-family:sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;border-top:1px solid #1e293b;box-sizing:border-box;';

    const textDiv = originalCreateElement.call(document, 'div');
    textDiv.style.cssText = 'flex:1;min-width:280px;line-height:1.5;text-align:left;';
    textDiv.innerHTML = 'Utilizamos cookies esenciales y de analítica para mejorar su experiencia. Revise nuestra <a href="#" id="pt-banner-policy-link" style="color:#6366f1;text-decoration:underline;font-weight:600;">Política de Privacidad</a>.';

    const actionsDiv = originalCreateElement.call(document, 'div');
    actionsDiv.style.cssText = 'display:flex;gap:12px;';

    const rejectBtn = originalCreateElement.call(document, 'button');
    rejectBtn.innerText = 'Rechazar No Esenciales';
    rejectBtn.style.cssText = 'background-color:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s;outline:none;';
    
    const acceptBtn = originalCreateElement.call(document, 'button');
    acceptBtn.innerText = 'Aceptar Todas';
    acceptBtn.style.cssText = 'background-color:#6366f1;color:#ffffff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s;outline:none;';

    actionsDiv.appendChild(rejectBtn);
    actionsDiv.appendChild(acceptBtn);

    banner.appendChild(textDiv);
    banner.appendChild(actionsDiv);
    document.body.appendChild(banner);

    // Click triggers
    rejectBtn.onclick = function() {
      saveConsent(false);
    };
    acceptBtn.onclick = function() {
      saveConsent(true);
    };
    textDiv.querySelector('#pt-banner-policy-link').onclick = function(e) {
      e.preventDefault();
      alert('Política de Privacidad (Art. 12 Ley N° 21.719):\nOrganización Responsable: ' + tenantId + '\nPara ejercer sus derechos ARCO+, contacte a privacidad@' + window.location.host);
    };
  };

  const saveConsent = async (accepted) => {
    localStorage.setItem('dpo_consent', accepted ? 'true' : 'false');
    
    const banner = document.getElementById('pt-consent-banner');
    if (banner) banner.remove();

    if (accepted) {
      unblockScripts();
    }

    // Post to DPO Compliance Audit Trail
    try {
      await fetch(`${apiHost}/api/remediation/consent-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: tenantId,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          action: accepted ? 'accepted' : 'rejected',
          userAgent: navigator.userAgent
        })
      });
    } catch (e) {
      console.warn('[PrivacyTech Widget] Fallo al reportar consentimiento al servidor:', e);
    }
  };

  // Initialize
  const init = () => {
    if (localStorage.getItem('dpo_consent') === null) {
      if (document.body) {
        renderBanner();
      } else {
        document.addEventListener('DOMContentLoaded', renderBanner);
      }
    } else if (hasConsent()) {
      unblockScripts();
    }
  };

  init();
})();
