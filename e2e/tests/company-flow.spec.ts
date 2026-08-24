import { expect, request, test } from '@playwright/test';
import crypto from 'node:crypto';

test('empresa nueva completa autenticacion, escaneo y escritura empresarial', async ({ baseURL }) => {
  if (!baseURL) throw new Error('Playwright baseURL is not configured.');

  const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const email = `e2e-${runId}@example.invalid`;
  const password = `E2e-${crypto.randomBytes(18).toString('base64url')}9aA`;
  const companyName = `Empresa E2E ${runId}`;
  const processName = `Proceso E2E ${runId}`;

  const anonymous = await request.newContext({ baseURL });
  const register = await anonymous.post('/api/auth/register', {
    data: { email, password, company_name: companyName }
  });
  expect(register.status(), await responseDetail(register)).toBe(201);
  const registered = await register.json();
  expect(registered).toMatchObject({
    success: true,
    user: { email, company_name: companyName, role: 'tenant' }
  });
  expect(registered.token).toEqual(expect.any(String));

  // A fresh login proves that credentials persisted and does not rely on the
  // token returned by registration.
  const login = await anonymous.post('/api/auth/login', {
    data: { email, password }
  });
  expect(login.status(), await responseDetail(login)).toBe(200);
  const loggedIn = await login.json();
  expect(loggedIn).toMatchObject({ success: true, user: { email } });
  expect(loggedIn.token).toEqual(expect.any(String));
  await anonymous.dispose();

  const authenticated = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      Authorization: `Bearer ${loggedIn.token}`
    }
  });

  const session = await authenticated.get('/api/dashboard');
  expect(session.status(), await responseDetail(session)).toBe(200);
  await expect(session.json()).resolves.toMatchObject({ success: true });

  const risk = await authenticated.post('/api/dpo/risks', {
    data: {
      process_name: processName,
      identified_risk: 'Acceso no autorizado a datos sinteticos de prueba',
      severity: 'MEDIUM',
      mitigation_control: 'Control sintetico creado por la prueba E2E',
      status: 'PENDING'
    }
  });
  expect(risk.status(), await responseDetail(risk)).toBe(201);
  const createdRisk = await risk.json();
  expect(createdRisk).toMatchObject({ process_name: processName });

  const risks = await authenticated.get('/api/dpo/risks');
  expect(risks.status(), await responseDetail(risks)).toBe(200);
  expect(await risks.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ process_name: processName })])
  );

  const scanTarget = process.env.E2E_SCAN_TARGET || 'https://example.com';
  const scan = await authenticated.post('/api/scan', {
    data: { url: scanTarget },
    timeout: 80_000
  });
  expect(scan.status(), await responseDetail(scan)).toBe(200);
  const scanResult = await scan.json();
  expect(scanResult).toEqual(expect.objectContaining({
    id: expect.anything(),
    score: expect.any(Number),
    findings: expect.any(Array)
  }));

  const latestScan = await authenticated.get('/api/scan/latest');
  expect(latestScan.status(), await responseDetail(latestScan)).toBe(200);
  const persistedScan = await latestScan.json();
  expect(String(persistedScan.url)).toContain(new URL(scanTarget).hostname);

  await authenticated.dispose();
});

async function responseDetail(response: { text(): Promise<string> }): Promise<string> {
  const body = (await response.text())
    .replace(/("token"\s*:\s*")[^"]+("?)/gi, '$1[REDACTED]$2')
    .replace(/("password"\s*:\s*")[^"]+("?)/gi, '$1[REDACTED]$2');
  return body ? `Respuesta API: ${body.slice(0, 500)}` : 'La API no devolvio cuerpo.';
}
