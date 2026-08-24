export const ELIGIBILITY_RULES_VERSION = 'SME_STANDARD_V1';

const COMPLEX_INDUSTRIES = new Set([
  'HEALTHCARE',
  'EDUCATION_MINORS',
  'BANKING',
  'FINANCIAL_SERVICES',
  'INSURANCE'
]);

const COMPLEX_RISK_FACTORS = [
  'biometrics',
  'largeScaleSensitiveData',
  'systematicMinorsData',
  'intensiveProfiling',
  'highImpactAutomatedDecisions',
  'systematicLargeScaleMonitoring',
  'activeRegulatoryProceeding'
] as const;

export interface EligibilityInput {
  employeeCount: number;
  operatesInChile: boolean;
  industries: string[];
  riskFactors: Record<string, boolean>;
}

export interface EligibilityResult {
  decision: 'STANDARD' | 'SPECIAL_ASSESSMENT' | 'NOT_ELIGIBLE';
  reasons: string[];
  rulesVersion: string;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  if (!Number.isInteger(input.employeeCount) || input.employeeCount < 0) {
    throw new Error('employeeCount must be a non-negative integer');
  }
  if (input.employeeCount > 100) reasons.push('La empresa supera el límite de 100 trabajadores.');
  if (!input.operatesInChile) reasons.push('La operación principal declarada no está radicada en Chile.');

  const complexIndustries = input.industries
    .map(value => value.trim().toUpperCase())
    .filter(value => COMPLEX_INDUSTRIES.has(value));
  if (complexIndustries.length) {
    reasons.push(`Industria de evaluación especial: ${complexIndustries.join(', ')}.`);
  }

  const activeFactors = COMPLEX_RISK_FACTORS.filter(factor => input.riskFactors[factor] === true);
  if (activeFactors.length) {
    reasons.push(`Factores de alto riesgo declarados: ${activeFactors.join(', ')}.`);
  }

  const isOutsideBasicMarket = input.employeeCount > 250 || !input.operatesInChile;
  return {
    decision: isOutsideBasicMarket ? 'NOT_ELIGIBLE' : reasons.length ? 'SPECIAL_ASSESSMENT' : 'STANDARD',
    reasons: reasons.length ? reasons : ['Cumple los criterios declarados del paquete estándar para pymes.'],
    rulesVersion: ELIGIBILITY_RULES_VERSION
  };
}
