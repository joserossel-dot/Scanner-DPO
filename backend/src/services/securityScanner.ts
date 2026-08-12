import tls from 'tls';
import https from 'https';

export interface VulnerabilityAlert {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  recommendation: string;
  type: 'SSL_EXPIRED' | 'HSTS_MISSING' | 'CSP_MISSING' | 'PORT_EXPOSED' | 'LEAKED_CREDENTIALS';
}

export interface SecurityScanResult {
  domain: string;
  scanDate: string;
  score: number; // 0 to 100
  vulnerabilities: VulnerabilityAlert[];
}

// Helper to sanitize and get pure hostname from any URL input
function getHostname(domain: string): string {
  let host = domain.trim();
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `https://${host}`;
  }
  try {
    const url = new URL(host);
    return url.hostname;
  } catch (e) {
    return host.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

// 1. Check SSL Certificate expiration and details
function checkSslCertificate(hostname: string): Promise<{ valid: boolean; daysRemaining?: number; issuer?: string; error?: string }> {
  return new Promise((resolve) => {
    let completed = false;

    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false, // Obtain certificate data even if invalid/expired to inspect it
      timeout: 5000
    }, () => {
      if (completed) return;
      completed = true;

      try {
        const cert = socket.getPeerCertificate(true);
        socket.end();

        if (!cert || !Object.keys(cert).length) {
          resolve({ valid: false, error: 'No se pudo leer el certificado SSL del servidor.' });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const msRemaining = validTo.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
        
        const getIssuerString = (field: string | string[] | undefined): string => {
          if (Array.isArray(field)) return field[0] || '';
          return field || '';
        };
        const issuerO = cert.issuer ? getIssuerString(cert.issuer.O) : '';
        const issuerCN = cert.issuer ? getIssuerString(cert.issuer.CN) : '';
        const issuer = issuerO || issuerCN || 'Desconocido';
        const valid = socket.authorized && msRemaining > 0;

        resolve({
          valid,
          daysRemaining,
          issuer
        });
      } catch (err: any) {
        resolve({ valid: false, error: err.message });
      }
    });

    socket.on('error', (err) => {
      if (completed) return;
      completed = true;
      resolve({ valid: false, error: err.message });
    });

    socket.on('timeout', () => {
      if (completed) return;
      completed = true;
      socket.destroy();
      resolve({ valid: false, error: 'Excedió el tiempo límite de conexión SSL (Timeout).' });
    });
  });
}

// 2. Query HTTP Headers
function checkHttpHeaders(hostname: string): Promise<{ headers: Record<string, string>; error?: string }> {
  return new Promise((resolve) => {
    let completed = false;

    const req = https.request({
      hostname,
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'PrivacyTech-SecurityScanner/1.0'
      },
      timeout: 5000,
      rejectUnauthorized: false
    }, (res) => {
      if (completed) return;
      completed = true;

      const headers: Record<string, string> = {};
      for (const key of Object.keys(res.headers)) {
        const val = res.headers[key];
        headers[key.toLowerCase()] = Array.isArray(val) ? val.join(', ') : (val || '');
      }
      res.resume(); // free socket memory
      resolve({ headers });
    });

    req.on('error', (err) => {
      if (completed) return;
      completed = true;
      resolve({ headers: {}, error: err.message });
    });

    req.on('timeout', () => {
      if (completed) return;
      completed = true;
      req.destroy();
      resolve({ headers: {}, error: 'Timeout de consulta HTTP.' });
    });

    req.end();
  });
}

// 3. Scan for exposed configuration files (.env, .git/config)
function scanExposedFile(hostname: string, filePath: string, keywords: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let completed = false;

    const req = https.request({
      hostname,
      port: 443,
      path: filePath,
      method: 'GET',
      headers: {
        'User-Agent': 'PrivacyTech-SecurityScanner/1.0'
      },
      timeout: 3000,
      rejectUnauthorized: false
    }, (res) => {
      if (completed) return;
      
      if (res.statusCode !== 200) {
        completed = true;
        res.resume();
        resolve(false);
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 3072) {
          req.destroy();
        }
      });

      res.on('end', () => {
        if (completed) return;
        completed = true;
        const matches = keywords.some(kw => body.toLowerCase().includes(kw.toLowerCase()));
        resolve(matches);
      });
    });

    req.on('error', () => {
      if (completed) return;
      completed = true;
      resolve(false);
    });

    req.on('timeout', () => {
      if (completed) return;
      completed = true;
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Main scan runner
export async function runSecurityScan(domain: string): Promise<SecurityScanResult> {
  const hostname = getHostname(domain);
  console.log(`[SecurityScanner] Iniciando análisis real sobre hostname: ${hostname}`);

  const isLocalDomain = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDomain) {
    return generateSimulatedResult(domain);
  }

  try {
    const vulnerabilities: VulnerabilityAlert[] = [];
    let score = 100;

    // 1. SSL Scan (throws error on connection issues)
    const sslInfo = await checkSslCertificate(hostname);
    if (sslInfo.error) {
      throw new Error(sslInfo.error);
    }

    if (!sslInfo.valid) {
      score -= 30;
      vulnerabilities.push({
        id: 'ssl_expired',
        title: 'Certificado SSL Criptográfico Inválido o Ausente',
        severity: 'CRITICAL',
        description: 'El servidor no proporciona un cifrado SSL/TLS válido para las transmisiones.',
        recommendation: 'Instalar un certificado SSL/TLS de confianza en el servidor y configurar redirección HTTPS automática.',
        type: 'SSL_EXPIRED'
      });
    } else if (sslInfo.daysRemaining !== undefined && sslInfo.daysRemaining < 7) {
      score -= 15;
      vulnerabilities.push({
        id: 'ssl_critical_expiration',
        title: 'Certificado SSL Próximo a Vencer',
        severity: 'HIGH',
        description: `El certificado SSL/TLS (Emisor: ${sslInfo.issuer || 'Desconocido'}) expira en ${sslInfo.daysRemaining} días.`,
        recommendation: 'Proceder a renovar el certificado criptográfico de inmediato para evitar la caída técnica del portal.',
        type: 'SSL_EXPIRED'
      });
    }

    // 2. HTTP Headers Audit (throws error on connection issues)
    const httpInfo = await checkHttpHeaders(hostname);
    if (httpInfo.error) {
      throw new Error(httpInfo.error);
    }

    const headers = httpInfo.headers || {};
    
    // Check HSTS
    if (!headers['strict-transport-security']) {
      score -= 10;
      vulnerabilities.push({
        id: 'hsts_missing',
        title: 'Falta cabecera de seguridad HSTS',
        severity: 'MEDIUM',
        description: 'La directiva Strict-Transport-Security no está configurada, permitiendo rebajas de protocolo HTTP maliciosas.',
        recommendation: 'Agregar la directiva HTTP "Strict-Transport-Security: max-age=63072000; includeSubDomains" en la configuración del servidor.',
        type: 'HSTS_MISSING'
      });
    }

    // Check CSP
    if (!headers['content-security-policy']) {
      score -= 20;
      vulnerabilities.push({
        id: 'csp_missing',
        title: 'Falta Política de Seguridad de Contenido (CSP)',
        severity: 'HIGH',
        description: 'No se detectó la directiva Content-Security-Policy, aumentando la susceptibilidad a ataques de inyección de scripts (XSS).',
        recommendation: 'Diseñar y configurar cabeceras CSP restrictivas indicando orígenes aprobados para scripts y frames.',
        type: 'CSP_MISSING'
      });
    }

    // Check X-Frame-Options (Clickjacking defense)
    if (!headers['x-frame-options']) {
      score -= 10;
      vulnerabilities.push({
        id: 'xframe_missing',
        title: 'Falta Cabecera de Protección Contra Clickjacking',
        severity: 'MEDIUM',
        description: 'La cabecera X-Frame-Options no está configurada, permitiendo inyectar el portal en frames maliciosos de terceros.',
        recommendation: 'Agregar el encabezado de respuesta HTTP "X-Frame-Options: SAMEORIGIN" o "DENY".',
        type: 'HSTS_MISSING'
      });
    }

    // 3. Exposed Files Pentesting (env, git)
    const hasExposedEnv = await scanExposedFile(hostname, '/.env', ['DB_', 'JWT_', 'SECRET', 'PASSWORD', 'API_']);
    if (hasExposedEnv) {
      score -= 40;
      vulnerabilities.push({
        id: 'env_exposed',
        title: 'Archivo de Variables de Entorno (.env) Expuesto Públicamente',
        severity: 'CRITICAL',
        description: 'Se detectó acceso público al archivo /.env conteniendo credenciales de base de datos, llaves de API o secretos de JWT.',
        recommendation: 'Modificar la configuración del servidor web (Nginx/Apache) para bloquear el acceso a archivos ocultos que inicien con punto.',
        type: 'LEAKED_CREDENTIALS'
      });
    }

    const hasExposedGit = await scanExposedFile(hostname, '/.git/config', ['[core]', 'repositoryformatversion', '[remote']);
    if (hasExposedGit) {
      score -= 40;
      vulnerabilities.push({
        id: 'git_exposed',
        title: 'Carpeta de Repositorio de Git (.git/config) Expuesta Públicamente',
        severity: 'CRITICAL',
        description: 'Se detectó acceso público al archivo /.git/config exponiendo la estructura del repositorio de código fuente.',
        recommendation: 'Bloquear inmediatamente el acceso web a la carpeta /.git y sus subdirectorios en las reglas de Nginx o .htaccess.',
        type: 'LEAKED_CREDENTIALS'
      });
    }

    return {
      domain,
      scanDate: new Date().toISOString(),
      score: Math.max(0, score),
      vulnerabilities
    };

  } catch (err: any) {
    console.error(`[SecurityScanner] Falla crítica al escanear ${hostname}:`, err.message);
    
    // For non-local domains, we MUST return a single critical finding
    return {
      domain,
      scanDate: new Date().toISOString(),
      score: 0,
      vulnerabilities: [
        {
          id: 'server_unreachable',
          title: 'Bloqueo de Auditoría o Servidor Inaccesible',
          severity: 'CRITICAL',
          description: `No pudimos auditar los certificados ni las cabeceras de seguridad. El servidor destino rechazó la conexión, superó el tiempo de espera (Timeout) o carece de protocolo HTTPS válido. (Error interno: ${err.message || 'error desconocido'}).`,
          recommendation: 'Verificar la conectividad del servidor, configurar puertos y firewalls para permitir el tráfico entrante HTTPS (puerto 443), y asegurarse de que el dominio está activo.',
          type: 'SSL_EXPIRED'
        }
      ]
    };
  }
}

// Graceful fallback generator using a domain-specific hash for local development testing only
function generateSimulatedResult(domain: string): SecurityScanResult {
  const vulnerabilities: VulnerabilityAlert[] = [];
  let score = 100;

  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  // Simulated SSL Alert
  if (absHash % 2 === 0) {
    score -= 30;
    vulnerabilities.push({
      id: 'ssl_expired_sim',
      title: 'Certificado SSL Criptográfico Inválido (Simulación Local)',
      severity: 'CRITICAL',
      description: 'El certificado criptográfico SSL/TLS del dominio simulado local expiró o carece de firma autorizada por una CA oficial.',
      recommendation: 'Instalar un certificado SSL/TLS Let\'s Encrypt válido.',
      type: 'SSL_EXPIRED'
    });
  }

  // Simulated CSP Alert
  if (absHash % 3 === 0) {
    score -= 20;
    vulnerabilities.push({
      id: 'csp_missing_sim',
      title: 'Falta Política de Seguridad de Contenido (CSP) (Simulación Local)',
      severity: 'HIGH',
      description: 'No se detectó una cabecera Content-Security-Policy restrictiva en el servidor local.',
      recommendation: 'Configurar directivas CSP para prevenir inyección de scripts externos de seguimiento.',
      type: 'CSP_MISSING'
    });
  }

  // Simulated HSTS Alert
  if (absHash % 4 === 0) {
    score -= 10;
    vulnerabilities.push({
      id: 'hsts_missing_sim',
      title: 'Falta cabecera de seguridad HSTS (Simulación Local)',
      severity: 'MEDIUM',
      description: 'La directiva Strict-Transport-Security no está configurada en los encabezados HTTP del entorno local.',
      recommendation: 'Configurar HSTS con un max-age de al menos un año en el servidor web.',
      type: 'HSTS_MISSING'
    });
  }

  return {
    domain,
    scanDate: new Date().toISOString(),
    score: Math.max(0, score),
    vulnerabilities
  };
}
