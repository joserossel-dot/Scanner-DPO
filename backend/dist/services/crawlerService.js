import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';
const dnsLookup = promisify(dns.lookup);
function isPrivateIp(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
        return false;
    }
    const [p1, p2] = parts;
    if (p1 === 10)
        return true;
    if (p1 === 127)
        return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31)
        return true;
    if (p1 === 192 && p2 === 168)
        return true;
    if (p1 === 169 && p2 === 254)
        return true;
    if (p1 === 0)
        return true;
    return false;
}
export async function runAudit(url) {
    let fetchedUrl = url;
    // Add default protocol if missing
    if (!/^https?:\/\//i.test(fetchedUrl)) {
        fetchedUrl = 'http://' + fetchedUrl;
    }
    let baseUrl;
    try {
        baseUrl = new URL(fetchedUrl);
    }
    catch (e) {
        throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
    }
    // SSRF prevention: DNS resolution check
    try {
        const lookupRes = await dnsLookup(baseUrl.hostname);
        if (isPrivateIp(lookupRes.address)) {
            throw new Error("No se permite escanear hosts o IPs privadas (Prevención de SSRF).");
        }
    }
    catch (dnsErr) {
        if (dnsErr.message.includes("SSRF")) {
            throw dnsErr;
        }
        throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
    }
    const queue = [fetchedUrl];
    const visited = new Set();
    const pagesAnalyzed = [];
    const maxPages = 15;
    const trackersFound = new Set();
    let totalMissingOptIn = 0;
    let totalPreCheckedOptIn = 0;
    let privacyLinkUrl = '';
    const crawledHtmls = [];
    while (queue.length > 0 && visited.size < maxPages) {
        const currentUrl = queue.shift();
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
            const response = await fetch(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(8000) // 8s timeout per page
            });
            if (!response.ok) {
                console.warn(`Failed to fetch subpage ${currentUrl}: Status ${response.status}`);
                continue;
            }
            const html = await response.text();
            crawledHtmls.push({ url: currentUrl, html });
            const $ = cheerio.load(html);
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
                }
                else {
                    checkboxes.each((_, cb) => {
                        const isChecked = $(cb).attr('checked') !== undefined || $(cb).prop('checked') === true;
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
                    if (!href)
                        return;
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
                                if (norm.endsWith('/'))
                                    norm = norm.slice(0, -1);
                                if (!visited.has(norm) && !queue.includes(resolved)) {
                                    queue.push(resolved);
                                }
                            }
                        }
                    }
                    catch { }
                });
            }
        }
        catch (error) {
            console.error(`Audit crawl page failed for ${currentUrl}:`, error.message);
        }
    }
    // If no pages were crawled successfully, throw exception
    if (crawledHtmls.length === 0) {
        throw new Error("No pudimos analizar tu sitio automáticamente. Verifica si requiere JavaScript o bloquea bots, y utiliza el cuestionario manual.");
    }
    const findings = [];
    // 1. Script findings
    const uniqueTrackers = Array.from(trackersFound);
    if (uniqueTrackers.length > 0) {
        findings.push({
            id: 'unconsented_scripts',
            category: 'cookies_scripts',
            severity: 'Grave',
            description: `Se detectaron scripts de seguimiento de terceros (${uniqueTrackers.join(', ')}) cargando en las páginas analizadas sin consentimiento previo.`,
            recommendation: 'Implementar el CMP (Consent Management Platform) de PrivacyTech para bloquear dinámicamente estos scripts hasta recibir el consentimiento del usuario.',
            details: `Scripts detectados: ${uniqueTrackers.join(', ')}. El rastreo de usuarios sin consentimiento previo explícito vulnera el principio de licitud de la Ley N° 21.719.`
        });
    }
    // 2. Form findings
    if (totalMissingOptIn > 0) {
        findings.push({
            id: 'missing_opt_in',
            category: 'forms',
            severity: 'Grave',
            description: `Se detectaron ${totalMissingOptIn} formulario(s) de contacto/registro en el sitio que recopilan datos sin casilla de consentimiento explícito (opt-in).`,
            recommendation: 'Añadir una casilla de verificación no seleccionada por defecto con un enlace a la Política de Privacidad en todos los formularios del sitio.',
            details: 'La ley exige que el consentimiento sea libre e informado, por lo que no es lícito asumir consentimiento por el simple envío del formulario.'
        });
    }
    if (totalPreCheckedOptIn > 0) {
        findings.push({
            id: 'prechecked_opt_in',
            category: 'forms',
            severity: 'Gravísima',
            description: `Se detectaron casillas de consentimiento pre-marcadas (pre-checked) en los formularios analizados.`,
            recommendation: 'Modificar las casillas de aceptación de términos y políticas para que aparezcan vacías por defecto.',
            details: 'La ley exige que el consentimiento sea una acción afirmativa clara. Las casillas pre-marcadas no constituyen consentimiento válido.'
        });
    }
    // 3. Privacy Policy Link & Content findings
    if (!privacyLinkUrl) {
        findings.push({
            id: 'missing_privacy_link',
            category: 'privacy_policy',
            severity: 'Gravísima',
            description: 'No se encontró un enlace visible a la Política de Privacidad en ninguna de las páginas analizadas.',
            recommendation: 'Agregar un enlace a la Política de Privacidad de forma permanente y visible en el pie de página (footer) de todo el sitio.',
            details: 'Infracción grave al principio de transparencia e información obligatoria de la Ley N° 21.719.'
        });
    }
    else {
        // Audit the privacy policy text
        let resolvedPolicyUrl = privacyLinkUrl;
        if (privacyLinkUrl && !/^https?:\/\//i.test(privacyLinkUrl)) {
            try {
                resolvedPolicyUrl = new URL(privacyLinkUrl, baseUrl.origin).toString();
            }
            catch { }
        }
        let policyText = '';
        try {
            const policyResponse = await fetch(resolvedPolicyUrl, { signal: AbortSignal.timeout(5000) });
            if (policyResponse.ok) {
                const policyHtml = await policyResponse.text();
                const policy$ = cheerio.load(policyHtml);
                policyText = policy$('body').text().toLowerCase();
            }
        }
        catch {
            // Fallback: search across all HTML text crawled
            policyText = crawledHtmls.map(h => h.html).join(' ').toLowerCase();
        }
        const missingClauses = [];
        const missingClausesRecommendations = [];
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
                description: `La Política de Privacidad no cumple cabalmente con el Art. 14 ter. Faltan las siguientes cláusulas obligatorias: ${missingClauses.join(', ')}.`,
                recommendation: `Actualizar el texto de la política para incluir: ${missingClausesRecommendations.join(' ')}`,
                details: `La Ley 21.719 exige informar claramente la identidad del responsable, los fines del tratamiento, el tiempo de conservación y los medios para el ejercicio de derechos ARCO+.`
            });
        }
    }
    // --- Calculate Compliance Score ---
    let score = 100;
    findings.forEach(f => {
        if (f.severity === 'Gravísima')
            score -= 30;
        else if (f.severity === 'Grave')
            score -= 15;
        else if (f.severity === 'Leve')
            score -= 5;
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
        if (norm.endsWith('/'))
            norm = norm.slice(0, -1);
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
        pagesSkipped
    };
}
function generateActionPlan(findings) {
    const plan = [];
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
    plan.push({
        step: stepCounter++,
        title: 'Habilitar Portal de Derechos ARCO+ (Acceso, Rectificación, Bloqueo)',
        description: 'La Ley N° 21.719 exige la existencia de un canal expedito para que las personas soliciten la gestión de sus datos.',
        priority: 'Media',
        estimatedEffort: '2 horas',
        details: 'Activa y publica en tu sitio el enlace al formulario interactivo ARCO+ provisto por el Widget de PrivacyTech.'
    });
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
