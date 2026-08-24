import crypto from 'crypto';

export function deriveSessionVersion(userId: string | number, passwordHash: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${String(userId)}\0${passwordHash}`).digest('base64url');
}

export function sessionVersionsMatch(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
