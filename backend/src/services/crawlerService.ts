import * as cheerio from 'cheerio';
import { assertPublicHttpUrl, fetchStaticHtml } from '../scanner/networkSafety.js';

export interface AuditEvidence { type: 'html_static'; url: string; observation: string; }

export interface AuditFinding {
  id: string;
  category: 'cookies_scripts' | 'forms' | 'privacy_policy' | 'policy_content';
  severity: 'Leve' | 'Grave' | 'Gravísima';
  description: string;
  recommendation: string;
  details?: string;
  evidence?: AuditEvidence[];
  limitations?: string[];
  pendingInformation?: string[];
  legalInterpretation?: string;
}

export interface ActionStep {
  step: number;
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  estimatedEffort: string;
  details: string;
}

export interface AuditResult {
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
  methodology?: { mode: 'static_html'; executesJavaScript: false; limitations: string[] };
}

export async function runAudit(url: string): Promise<AuditResult> {
  let fetchedUrl = url;

  // Add default protocol if missing
  if (!/^https?:\/\//i.test(fetchedUrl)) {
    fetchedUrl = 'http://' + fetchedUrl;
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(fetchedUrl);
  } catch (e) {
    throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
  }

  // SSRF prevention: DNS resolution check
  try {
    await assertPublicHttpUrl(baseUrl);
  } catch (dnsErr: any) {
    if (dnsErr.message.includes("SSRF")) {
      throw dnsErr;
    }
    throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
  }

  const queue: string[] = [fetchedUrl];
  const visited = new Set<string>();
  const pagesAnalyzed: string[] = [];
  const maxPages = 15;

  const trackersFound = new Set<string>();
  let totalMissingOptIn = 0;
  let totalPreCheckedOptIn = 0;
  let privacyLinkUrl = '';
  const crawledHtmls: { url: string; html: string }[] = [];
  
  let hasCookieBanner = false;
  let hasArcoLink = false;

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift()!;
    
    // Normalize URL to avoid crawling same page with trailing slashes or hash
    let normalizedUrl = currentUrl.split('#')[0];
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    if (visited.has(normalizedUrl)) {
      continue;
    }
    visited.add(normalizedUrl);
    pagesAnalyzed.push(currentUrl);

    try {
      console.log(`Auditing subpage: ${currentUrl}`);
      const { response, html } = await fetchStaticHtml(currentUrl, 8000);

      if (!response.ok) {
        console.warn(`Failed to fetch subpage ${currentUrl}: Status ${response.status}`);
        continue;
      }
      crawledHtmls.push({ url: currentUrl, html });

      const $ = cheerio.load(html);

      // Check for cookie banner presence (classes, IDs, or text keywords)
      const bodyText = $('body').text().toLowerCase();
      const hasCookieSelectors = $('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]').length > 0;
      const hasCookieTerms = /aceptar cookies|acepto cookies|configurar cookies|rechazar cookies|política de cookies|banner-cookies|aviso-cookies/i.test(bodyText);
      if (hasCookieSelectors || hasCookieTerms) {
        hasCookieBanner = true;
      }

      // Check for ARCO request link or text presence
      $('a').each((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr('href') || '';
        if (/arco|derechos\s+arco|ejercer\s+derechos|solicitud\s+arco|gestión\s+de\s+datos/i.test(text) || /arco/i.test(href)) {
          hasArcoLink = true;
          return false; // Break loop
        }
      });

      // --- 1. Detect trackers/cookies scripts ---
      $('script').each((_, el) => {
        const src = $(el).attr('src') || '';
        const content = $(el).html() || '';

        if (/google-analytics\.com|googletagmanager\.com/i.test(src) || /gtag\(/i.test(content)) {
          trackersFound.add('Google Analytics / Google Tag Manager');
        }
        if (/connect\.facebook\.net/i.test(src) || /fbq\(/i.test(content)) {
          trackersFound.add('Meta Pixel');
        }
        if (/hotjar\.com/i.test(src) || /hj\(/i.test(content)) {
          trackersFound.add('Hotjar');
        }
        if (/amplitude\.com/i.test(src)) {
          trackersFound.add('Amplitude');
        }
      });

      // --- 2. Detect forms and opt-in checkboxes ---
      $('form').each((_, el) => {
        const action = $(el).attr('action') || '';
        const id = $(el).attr('id') || '';
        const role = $(el).attr('role') || '';
        if (role === 'search' || /search/i.test(action) || /search/i.test(id)) {
          return;
        }

        const checkboxes = $(el).find('input[type="checkbox"]');
        if (checkboxes.length === 0) {
          totalMissingOptIn++;
        } else {
          checkboxes.each((_, cb) => {
            const isChecked = $(cb).attr('checked') !== undefined || ($(cb).prop('checked') as any) === true;
            if (isChecked) {
              totalPreCheckedOptIn++;
            }
          });
        }
      });

      // --- 3. Privacy Policy Link presence ---
      if (!privacyLinkUrl) {
        $('a').each((_, el) => {
          const text = $(el).text().toLowerCase();
          const href = $(el).attr('href') || '';
          if (/privacidad|privacy|legal|politica/i.test(text) || /privacidad|privacy|politica/i.test(href)) {
            privacyLinkUrl = href;
            return false; // Break loop
          }
        });
      }

      // --- 4. Extract internal links to queue ---
      if (visited.size < maxPages) {
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;

          try {
            // Resolve relative URLs
            const resolved = new URL(href, baseUrl.origin).toString();
            const resolvedUrlObj = new URL(resolved);

            // Only crawl same origin/domain and skip assets or dynamic actions
            if (resolvedUrlObj.origin === baseUrl.origin) {
              const pathname = resolvedUrlObj.pathname.toLowerCase();
              
              // Skip assets and extensions
              if (!/\.(jpg|jpeg|png|gif|svg|pdf|css|js|woff|woff2|xml|json)$/i.test(pathname)) {
                let norm = resolved.split('#')[0];
                if (norm.endsWith('/')) norm = norm.slice(0, -1);

                if (!visited.has(norm) && !queue.includes(resolved)) {
                  queue.push(resolved);
                }
              }
            }
          } catch {}
        });
      }
    } catch (error: any) {
      console.error(`Audit crawl page failed for ${currentUrl}:`, error.message);
    }
  }

  // If no pages were crawled successfully, throw exception
  if (crawledHtmls.length === 0) {
    throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
  }

  const findings: AuditFinding[] = [];

  // 1. Script findings
  const uniqueTrackers = Array.from(trackersFound);
  if (uniqueTrackers.length > 0) {
    findings.push({
      id: 'unconsented_scripts',
      category: 'cookies_scripts',
      severity: 'Grave',
      description: `El HTML estático referencia scripts de seguimiento de terceros (${uniqueTrackers.join(', ')}). No se verificó su ejecución ni el estado de consentimiento.`,
      recommendation: 'Verificar con navegador instrumentado la carga real antes de decidir medidas técnicas o jurídicas.',
      details: `Referencias detectadas: ${uniqueTrackers.join(', ')}. Hallazgo técnico preliminar.`,
      evidence: [{ type: 'html_static', url: baseUrl.origin, observation: `Referencias a: ${uniqueTrackers.join(', ')}` }],
      limitations: ['No se ejecutó JavaScript ni se observó tráfico de red o cookies.'],
      pendingInformation: ['Configuración efectiva del CMP y base jurídica aplicable.'],
      legalInterpretation: 'Preliminar y sujeta a revisión jurídica.'
    });
  }

  // 1.5 Cookie Banner presence check
  if (!hasCookieBanner) {
    findings.push({
      id: 'missing_cookie_banner',
      category: 'cookies_scripts',
      severity: 'Grave',
      description: 'No se identificó texto o marcado HTML estático asociado a un banner de cookies.',
      recommendation: 'Verificar en navegador si existe un mecanismo dinámico y determinar qué tecnologías requieren consentimiento.',
      details: 'La ausencia en HTML estático no demuestra ausencia del mecanismo ni falta de licitud.',
      limitations: ['Un banner cargado mediante JavaScript puede no aparecer.'],
      pendingInformation: ['Comportamiento antes y después de aceptar o rechazar.'],
      legalInterpretation: 'Hallazgo preliminar; no constituye conclusión de incumplimiento.'
    });
  }

  // 2. Form findings
  if (totalMissingOptIn > 0) {
    findings.push({
      id: 'missing_opt_in',
      category: 'forms',
      severity: 'Grave',
      description: `Se identificaron ${totalMissingOptIn} formulario(s) sin casilla de consentimiento visible en el HTML estático.`,
      recommendation: 'Documentar finalidad y base de licitud; añadir consentimiento solo cuando sea la base aplicable.',
      details: 'La falta de checkbox no demuestra por sí sola ausencia de licitud.',
      pendingInformation: ['Finalidad, datos, responsable y base de licitud de cada formulario.'],
      legalInterpretation: 'Requiere revisión jurídica caso a caso.'
    });
  }

  if (totalPreCheckedOptIn > 0) {
    findings.push({
      id: 'prechecked_opt_in',
      category: 'forms',
      severity: 'Gravísima',
      description: `Se detectaron casillas de consentimiento pre-marcadas (pre-checked) en los formularios analizados.`,
      recommendation: 'Modificar las casillas de aceptación de términos y políticas para que aparezcan vacías por defecto.',
      details: 'Si la base invocada es consentimiento, una casilla pre-marcada requiere revisión jurídica de su validez.',
      pendingInformation: ['Base de licitud y contexto de cada casilla.'],
      legalInterpretation: 'Preliminar, pendiente de revisión jurídica.'
    });
  }

  // 2.5 ARCO Link presence check
  if (!hasArcoLink) {
    findings.push({
      id: 'missing_arco_channel',
      category: 'forms',
      severity: 'Grave',
      description: 'No se identificó en el HTML estático un enlace cuyo texto o URL indique un canal ARCO+.',
      recommendation: 'Confirmar los canales disponibles y hacerlos encontrables en el sitio cuando corresponda.',
      details: 'El canal puede existir fuera de las páginas o cargarse dinámicamente.',
      limitations: ['Detección por palabras clave en enlaces HTML.'],
      pendingInformation: ['Canales operativos y procedimiento de atención de derechos.'],
      legalInterpretation: 'Observación preliminar, no prueba ausencia de un canal.'
    });
  }

  // 3. Privacy Policy Link & Content findings
  if (!privacyLinkUrl) {
    findings.push({
      id: 'missing_privacy_link',
      category: 'privacy_policy',
      severity: 'Gravísima',
      description: 'No se identificó un enlace a una Política de Privacidad mediante las palabras clave analizadas.',
      recommendation: 'Agregar un enlace a la Política de Privacidad de forma permanente y visible en el pie de página (footer) de todo el sitio.',
      details: 'La política puede usar otra denominación o cargarse dinámicamente.',
      limitations: ['Detección por palabras clave sobre HTML estático.'],
      pendingInformation: ['URL oficial y mecanismo de publicación de la política.'],
      legalInterpretation: 'Posible brecha de transparencia, pendiente de comprobación y revisión jurídica.'
    });
  } else {
    // Audit the privacy policy text
    let resolvedPolicyUrl = privacyLinkUrl;
    if (privacyLinkUrl && !/^https?:\/\//i.test(privacyLinkUrl)) {
      try {
        resolvedPolicyUrl = new URL(privacyLinkUrl, baseUrl.origin).toString();
      } catch {}
    }

    let policyText = '';
    try {
      const { response: policyResponse, html: policyHtml } = await fetchStaticHtml(resolvedPolicyUrl, 5000);
      if (policyResponse.ok) {
        const policy$ = cheerio.load(policyHtml);
        policyText = policy$('body').text().toLowerCase();
      }
    } catch {
      // Fallback: search across all HTML text crawled
      policyText = crawledHtmls.map(h => h.html).join(' ').toLowerCase();
    }

    const missingClauses: string[] = [];
    const missingClausesRecommendations: string[] = [];

    if (!/responsable|razon social|rut|representante|contacto|domicilio/i.test(policyText)) {
      missingClauses.push('Identificación del Responsable de Datos (Razón Social/RUT)');
      missingClausesRecommendations.push('Declarar explícitamente el nombre de la empresa, RUT y dirección de contacto.');
    }
    if (!/finalidad|fines|propósito|para qué/i.test(policyText)) {
      missingClauses.push('Finalidades claras del tratamiento');
      missingClausesRecommendations.push('Listar de manera detallada para qué se utilizarán los datos recolectados.');
    }
    if (!/retencion|retener|plazo|tiempo|conservar|duracion/i.test(policyText)) {
      missingClauses.push('Tiempos de retención de los datos');
      missingClausesRecommendations.push('Especificar el plazo de conservación de la información personal.');
    }
    if (!/acceso|rectificacion|supresion|oposicion|portabilidad|bloqueo|arco/i.test(policyText)) {
      missingClauses.push('Canales de ejercicio de derechos ARCO+');
      missingClausesRecommendations.push('Incluir un canal claro o el portal interactivo para ejercer derechos de Acceso, Rectificación, Supresión, etc.');
    }

    if (missingClauses.length > 0) {
      findings.push({
        id: 'incomplete_policy_content',
        category: 'policy_content',
        severity: 'Grave',
        description: `La búsqueda automatizada no identificó referencias claras a: ${missingClauses.join(', ')}.`,
        recommendation: `Actualizar el texto de la política para incluir: ${missingClausesRecommendations.join(' ')}`,
        details: 'La detección se basa en palabras clave y puede omitir redacciones equivalentes.',
        limitations: ['Análisis léxico automatizado, sin interpretación jurídica del contexto.'],
        legalInterpretation: 'Posible brecha informativa, pendiente de revisión jurídica.'
      });
    }
  }

  // --- Calculate Compliance Score ---
  let score = 100;
  findings.forEach(f => {
    if (f.severity === 'Gravísima') score -= 30;
    else if (f.severity === 'Grave') score -= 15;
    else if (f.severity === 'Leve') score -= 5;
  });
  score = Math.max(0, Math.min(100, score));

  const severityCounts = {
    leve: findings.filter(f => f.severity === 'Leve').length,
    grave: findings.filter(f => f.severity === 'Grave').length,
    gravisima: findings.filter(f => f.severity === 'Gravísima').length
  };

  const pagesSkipped = Array.from(new Set(queue))
    .filter(link => {
      let norm = link.split('#')[0];
      if (norm.endsWith('/')) norm = norm.slice(0, -1);
      return !visited.has(norm);
    });

  const actionPlan = generateActionPlan(findings);

  return {
    url,
    score,
    findings,
    severityCounts,
    actionPlan,
    pagesAnalyzed,
    pagesSkipped,
    methodology: {
      mode: 'static_html',
      executesJavaScript: false,
      limitations: ['No ejecuta JavaScript.', 'No observa red, cookies ni almacenamiento.', 'No compara estados de consentimiento.']
    }
  };
}



function generateActionPlan(findings: AuditFinding[]): ActionStep[] {
  const plan: ActionStep[] = [];
  let stepCounter = 1;

  if (findings.some(f => f.id === 'missing_privacy_link')) {
    plan.push({
      step: stepCounter++,
      title: 'Publicar e Integrar el Enlace a la Política de Privacidad',
      description: 'El sitio web carece de un enlace directo a las políticas de tratamiento de datos personales.',
      priority: 'Alta',
      estimatedEffort: '30 mins',
      details: 'Añadir un enlace permanente titulado "Política de Privacidad" en el pie de página (footer) de tu sitio web, visible en todas las páginas internas.'
    });
  }

  if (findings.some(f => f.id === 'incomplete_policy_content')) {
    plan.push({
      step: stepCounter++,
      title: 'Adecuación del Contenido Legal de la Política (Art. 14 ter)',
      description: 'La Política de Privacidad carece de cláusulas obligatorias exigidas por ley chilena (identificación, finalidades, plazos o derechos).',
      priority: 'Media',
      estimatedEffort: '4 horas',
      details: 'Actualiza el texto en tu página de Política de Privacidad incluyendo explícitamente: Razón Social y RUT, finalidades específicas del tratamiento, plazos de conservación y medios para ARCO+.'
    });
  }

  if (findings.some(f => f.id === 'prechecked_opt_in')) {
    plan.push({
      step: stepCounter++,
      title: 'Eliminar Casillas Pre-marcadas en Formularios',
      description: 'Se encontraron casillas de consentimiento pre-seleccionadas que asumen aceptación sin acción afirmativa.',
      priority: 'Alta',
      estimatedEffort: '30 mins',
      details: 'Edita el código de tus formularios y remueve la propiedad que autoselecciona la casilla. Debe estar vacía para que el usuario la marque manualmente.'
    });
  }

  if (findings.some(f => f.id === 'missing_opt_in')) {
    plan.push({
      step: stepCounter++,
      title: 'Integrar Casilla de Consentimiento en Formularios',
      description: 'Se detectaron formularios que recolectan datos sin consentimiento explícito e inequívoco.',
      priority: 'Alta',
      estimatedEffort: '2 horas',
      details: 'Agrega un campo de tipo checkbox obligatorio al final de cada formulario antes del botón de enviar.'
    });
  }

  if (findings.some(f => f.id === 'unconsented_scripts')) {
    plan.push({
      step: stepCounter++,
      title: 'Implementar Bloqueo de Scripts Invasivos (CMP)',
      description: 'Se detectó que scripts de seguimiento se cargan automáticamente en el navegador sin autorización.',
      priority: 'Alta',
      estimatedEffort: '1 hora',
      details: 'Inserta el script de cumplimiento CMP de PrivacyTech en la cabecera del sitio.'
    });
  }

  if (findings.some(f => f.id === 'missing_cookie_banner')) {
    plan.push({
      step: stepCounter++,
      title: 'Habilitar Banner de Consentimiento de Cookies',
      description: 'No se detectó un banner de cookies activo para obtener el consentimiento previo de los usuarios.',
      priority: 'Alta',
      estimatedEffort: '1 hora',
      details: 'Integrar el CMP (Consent Management Platform) de PrivacyTech para bloquear automáticamente cookies no esenciales hasta que el usuario decida aceptarlas.'
    });
  }

  if (findings.some(f => f.id === 'missing_arco_channel')) {
    plan.push({
      step: stepCounter++,
      title: 'Habilitar Portal de Derechos ARCO+ (Acceso, Rectificación, Bloqueo)',
      description: 'La Ley N° 21.719 exige la existencia de un canal expedito para que las personas soliciten la gestión de sus datos.',
      priority: 'Alta',
      estimatedEffort: '2 horas',
      details: 'Activa y publica en tu sitio el enlace al formulario interactivo ARCO+ provisto por el Widget de PrivacyTech.'
    });
  }

  if (plan.length === 1) {
    plan.unshift({
      step: stepCounter++,
      title: 'Monitoreo Continuo y Auditorías Periódicas',
      description: 'Tu sitio web actual cuenta con un nivel óptimo de cumplimiento de la Ley N° 21.719.',
      priority: 'Baja',
      estimatedEffort: 'Continuo',
      details: 'Realiza un escaneo semanal automático para garantizar que nuevos formularios o plugins sigan las mismas directrices de consentimiento previo.'
    });
  }

  const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
  plan.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  plan.forEach((item, index) => {
    item.step = index + 1;
  });

  return plan;
}
