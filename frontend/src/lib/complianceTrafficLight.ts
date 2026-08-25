export type ComplianceTrafficLight = 'green' | 'yellow' | 'red';

export function complianceTrafficLight(score: number): ComplianceTrafficLight {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  if (normalized === 100) return 'green';
  if (normalized < 25) return 'red';
  return 'yellow';
}
