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
      apiHost = 'http://localhost:3050';
      if (window.location.port) {
        apiHost = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port;
      } else {
        apiHost = 'http://localhost:3000';
      }
    }
  }

  // 2. COOKIE BLOCKING MOTOR (Monkey Patching document.createElement)
  const blockedScripts = [];
  const hasConsent = (category) => {
    const raw = localStorage.getItem('dpo_consent');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!parsed[category];
    } catch {
      return raw === 'true'; // compatibilidad con visitantes antiguos
    }
  };

  const isTrackingScript = (src) => {
    if (/google-analytics\.com|googletagmanager\.com|hotjar\.com/i.test(src)) return 'analytical';
    if (/connect\.facebook\.net/i.test(src)) return 'marketing';
    return null;
  };

  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const el = originalCreateElement.call(document, tagName, options);
    if (tagName.toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        set(val) {
          const category = isTrackingScript(val);
          if (category && !hasConsent(category)) {
            el.setAttribute('data-pt-blocked', val);
            el.removeAttribute('src');
            blockedScripts.push({ element: el, src: val });
            console.log(`[PrivacyTech Widget] Script bloqueado de forma preventiva (${category}): ${val}`);
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
    if (hasConsent('analytical')) {
      (window.ga.q = window.ga.q || []).push(arguments);
    } else {
      console.log('[PrivacyTech Widget] Google Analytics llamado ignorado (Falta Consentimiento).');
    }
  };
  window.fbq = window.fbq || function() {
    if (hasConsent('marketing')) {
      console.log('[PrivacyTech Widget] Meta Pixel llamada permitida.');
    } else {
      console.log('[PrivacyTech Widget] Meta Pixel llamado ignorado (Falta Consentimiento).');
    }
  };

  // Unblock scripts when user grants consent
  const unblockScripts = (consentTypes) => {
    if (!consentTypes) return;
    for (let i = blockedScripts.length - 1; i >= 0; i--) {
      const script = blockedScripts[i];
      const category = isTrackingScript(script.src);
      if (category && consentTypes[category]) {
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
        blockedScripts.splice(i, 1);
      }
    }
  };

  // 3. UI BANNER INJECTION
  const renderBanner = () => {
    if (document.getElementById('pt-consent-banner')) return;

    const banner = originalCreateElement.call(document, 'div');
    banner.id = 'pt-consent-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background-color:#0f172a;color:#cbd5e1;padding:16px 24px;box-shadow:0 -4px 10px rgba(0,0,0,0.3);z-index:999999;font-family:sans-serif;font-size:13px;display:flex;flex-direction:column;gap:12px;border-top:1px solid #1e293b;box-sizing:border-box;';

    const topRow = originalCreateElement.call(document, 'div');
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;';

    const textDiv = originalCreateElement.call(document, 'div');
    textDiv.style.cssText = 'flex:1;min-width:280px;line-height:1.5;text-align:left;';
    textDiv.innerHTML = 'Utilizamos cookies esenciales y, con su permiso, de analítica y marketing. Revise nuestra <a href="/privacidad" target="_blank" style="color:#6366f1;text-decoration:underline;font-weight:600;">Política de Privacidad</a>.';

    const actionsDiv = originalCreateElement.call(document, 'div');
    actionsDiv.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';

    const customizeBtn = originalCreateElement.call(document, 'button');
    customizeBtn.innerText = 'Personalizar';
    customizeBtn.style.cssText = 'background-color:transparent;color:#94a3b8;border:1px solid #334155;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;';

    const rejectBtn = originalCreateElement.call(document, 'button');
    rejectBtn.innerText = 'Rechazar No Esenciales';
    rejectBtn.style.cssText = 'background-color:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;';

    const acceptBtn = originalCreateElement.call(document, 'button');
    acceptBtn.innerText = 'Aceptar Todo';
    acceptBtn.style.cssText = 'background-color:#6366f1;color:#ffffff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;';

    actionsDiv.appendChild(customizeBtn);
    actionsDiv.appendChild(rejectBtn);
    actionsDiv.appendChild(acceptBtn);
    topRow.appendChild(textDiv);
    topRow.appendChild(actionsDiv);
    banner.appendChild(topRow);

    // Panel de categorías, oculto por defecto
    const prefsPanel = originalCreateElement.call(document, 'div');
    prefsPanel.style.cssText = 'display:none;gap:16px;padding-top:12px;border-top:1px solid #1e293b;flex-wrap:wrap;';

    const makeToggle = (label, key, checked, disabled) => {
      const wrap = originalCreateElement.call(document, 'label');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:' + (disabled ? 'not-allowed' : 'pointer') + ';opacity:' + (disabled ? '0.5' : '1') + ';';
      const input = originalCreateElement.call(document, 'input');
      input.type = 'checkbox';
      input.checked = checked;
      input.disabled = !!disabled;
      input.dataset.key = key;
      const span = originalCreateElement.call(document, 'span');
      span.innerText = label;
      wrap.appendChild(input);
      wrap.appendChild(span);
      return wrap;
    };

    const essentialToggle = makeToggle('Esenciales (siempre activas)', 'essential', true, true);
    const analyticalToggle = makeToggle('Analítica', 'analytical', false, false);
    const marketingToggle = makeToggle('Marketing', 'marketing', false, false);
    prefsPanel.appendChild(essentialToggle);
    prefsPanel.appendChild(analyticalToggle);
    prefsPanel.appendChild(marketingToggle);

    const savePrefsBtn = originalCreateElement.call(document, 'button');
    savePrefsBtn.innerText = 'Guardar preferencias';
    savePrefsBtn.style.cssText = 'background-color:#6366f1;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;';
    prefsPanel.appendChild(savePrefsBtn);

    banner.appendChild(prefsPanel);
    document.body.appendChild(banner);

    customizeBtn.onclick = function() {
      prefsPanel.style.display = prefsPanel.style.display === 'none' ? 'flex' : 'none';
    };

    rejectBtn.onclick = function() {
      saveConsent({ essential: true, analytical: false, marketing: false });
    };
    acceptBtn.onclick = function() {
      saveConsent({ essential: true, analytical: true, marketing: true });
    };
    savePrefsBtn.onclick = function() {
      const analytical = prefsPanel.querySelector('[data-key="analytical"]').checked;
      const marketing = prefsPanel.querySelector('[data-key="marketing"]').checked;
      saveConsent({ essential: true, analytical, marketing });
    };
  };

  const saveConsent = async (consentTypes) => {
    localStorage.setItem('dpo_consent', JSON.stringify(consentTypes));

    const banner = document.getElementById('pt-consent-banner');
    if (banner) banner.remove();

    if (consentTypes.analytical || consentTypes.marketing) {
      unblockScripts(consentTypes);
    }

    try {
      await fetch(`${apiHost}/api/remediation/consent-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          timestamp: new Date().toISOString(),
          action: (consentTypes.analytical || consentTypes.marketing) ? 'accepted' : 'rejected',
          userAgent: navigator.userAgent,
          consentTypes: consentTypes
        })
      });
    } catch (e) {
      console.warn('[PrivacyTech Widget] Fallo al reportar consentimiento al servidor:', e);
    }
  };

  // Reliable DOM ready initialization
  const init = () => {
    if (localStorage.getItem('dpo_consent') === null) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBanner);
      } else {
        renderBanner();
      }
    } else {
      const raw = localStorage.getItem('dpo_consent');
      let consentTypes = { essential: true, analytical: false, marketing: false };
      try {
        consentTypes = JSON.parse(raw) || consentTypes;
      } catch (e) {
        if (raw === 'true') {
          consentTypes = { essential: true, analytical: true, marketing: true };
        }
      }
      unblockScripts(consentTypes);
    }
  };

  init();
})();
