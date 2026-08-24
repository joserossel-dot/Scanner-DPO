import dns from 'node:dns/promises';
import net from 'node:net';

export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 5;

export function isBlockedAddress(address: string): boolean {
  const ip = address.toLowerCase().split('%')[0];
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) || (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    if (ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip)) return true;
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isBlockedAddress(mapped[1]) : false;
  }
  return true;
}

export async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL no permitida por seguridad.');
  const addresses = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error('No se permite escanear hosts que resuelvan a redes privadas o reservadas (SSRF).');
  }
}

export async function fetchStaticHtml(input: string, timeoutMs: number): Promise<{ response: Response; finalUrl: URL; html: string }> {
  let target = new URL(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    await assertPublicHttpUrl(target);
    const response = await fetch(target, { redirect: 'manual', headers: { 'User-Agent': 'PrivacyTech-Static-Audit/1.0' }, signal: AbortSignal.timeout(timeoutMs) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) throw new Error('Cadena de redirecciones no permitida.');
      target = new URL(location, target);
      continue;
    }
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (response.ok && !type.includes('text/html') && !type.includes('application/xhtml+xml')) throw new Error('El destino no entregó contenido HTML.');
    if (Number(response.headers.get('content-length') || 0) > MAX_RESPONSE_BYTES) throw new Error('La respuesta excede el tamaño máximo permitido.');
    if (!response.body) return { response, finalUrl: target, html: '' };
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('La respuesta excede el tamaño máximo permitido.'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { response, finalUrl: target, html: new TextDecoder().decode(bytes) };
  }
  throw new Error('No fue posible obtener el destino.');
}
