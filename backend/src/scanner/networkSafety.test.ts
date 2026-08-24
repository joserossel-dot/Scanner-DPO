import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicHttpUrl, isBlockedAddress } from './networkSafety.js';

test('clasifica IPv4 de riesgo', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '203.0.113.4']) assert.equal(isBlockedAddress(ip), true, ip);
  assert.equal(isBlockedAddress('8.8.8.8'), false);
});

test('clasifica IPv6 de riesgo', () => {
  for (const ip of ['::1', '::', 'fc00::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(isBlockedAddress(ip), true, ip);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('rechaza protocolos y credenciales no permitidos antes de resolver DNS', async () => {
  await assert.rejects(assertPublicHttpUrl(new URL('file:///etc/passwd')), /URL no permitida/);
  await assert.rejects(assertPublicHttpUrl(new URL('https://user:pass@example.com')), /URL no permitida/);
});
