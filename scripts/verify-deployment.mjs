const apiUrl = requiredUrl('VERIFY_API_URL');
const dashboardUrl = requiredUrl('VERIFY_DASHBOARD_URL');

const checks = [];

await check('API health', new URL('/health', apiUrl), { expected: 200, json: true });
await check('Protected service workspace', new URL('/api/service/workspace', apiUrl), { expected: 401 });
await check('Protected DPO controls', new URL('/api/dpo/controls', apiUrl), { expected: 401 });
await check('Dashboard login', new URL('/login', dashboardUrl), { expected: 200, contains: '<div id="root">' });

const corsResponse = await fetch(new URL('/api/auth/login', apiUrl), {
  method: 'OPTIONS',
  headers: {
    Origin: dashboardUrl.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'
  }
});
const allowedOrigin = corsResponse.headers.get('access-control-allow-origin');
if (corsResponse.status !== 204 || allowedOrigin !== dashboardUrl.origin) {
  throw new Error(`CORS preflight failed: HTTP ${corsResponse.status}, allowed origin ${allowedOrigin ?? 'missing'}`);
}
checks.push('CORS preflight');

console.log(`PASS: ${checks.join(', ')}`);

async function check(name, url, options) {
  const response = await fetch(url, { redirect: 'manual' });
  if (response.status !== options.expected) {
    throw new Error(`${name} returned HTTP ${response.status}; expected ${options.expected}`);
  }
  const body = await response.text();
  if (options.json) {
    const payload = JSON.parse(body);
    if (payload.status !== 'ok') throw new Error(`${name} did not report status ok`);
  }
  if (options.contains && !body.includes(options.contains)) {
    throw new Error(`${name} response is missing the expected application root`);
  }
  checks.push(name);
}

function requiredUrl(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is required`);
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(`${name} must use HTTPS outside localhost`);
  }
  return parsed;
}
