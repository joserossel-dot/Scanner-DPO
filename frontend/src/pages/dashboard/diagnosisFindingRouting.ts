export interface RoutableDiagnosisFinding {
  id?: string;
  category?: string;
  description?: string;
}

export function classifyDiagnosisFinding(finding: RoutableDiagnosisFinding): 1 | 2 | 3 {
  const id = finding.id?.toUpperCase() || '';
  const category = finding.category?.toLowerCase() || '';
  const description = finding.description?.toLowerCase() || '';

  if (
    ['COOKIES', 'TRACKER', 'FORM', 'ARCO', 'WEB_SCAN', 'CONSENT_EVIDENCE'].some(value => id.includes(value)) ||
    ['cookie', 'tracker', 'form', 'arco', 'web', 'consent'].some(value => category.includes(value)) ||
    ['cookie', 'tracker', 'formulario', 'arco', 'escaneo web', 'consentimiento'].some(value => description.includes(value))
  ) return 1;

  if (
    ['POLICY', 'POLICIES', 'DOCUMENT', 'PROCESSOR', 'CONTRACT', 'TRANSFER', 'TID'].some(value => id.includes(value)) ||
    ['polic', 'document', 'contrato', 'transfer', 'proveedor'].some(value => category.includes(value)) ||
    ['política', 'documento', 'proveedor', 'encargado', 'dpa', 'scc', 'transferencia internacional'].some(value => description.includes(value))
  ) return 2;

  return 3;
}

export function remediationTargetForFinding(finding: RoutableDiagnosisFinding): 'cmp' | 'arco' | 'transfers' | 'policies' | 'ropa_hub' {
  const id = finding.id?.toUpperCase() || '';
  const category = finding.category?.toLowerCase() || '';
  const description = finding.description?.toLowerCase() || '';

  if (id === 'FIND_ROPA_MISSING' || id === 'FIND_ROPA_DRAFTS_PENDING') return 'ropa_hub';
  if (id.includes('ARCO') || category.includes('arco') || description.includes('arco')) return 'arco';
  if (id.includes('DOCUMENT') || id.includes('POLICY') || category.includes('document') || category.includes('polic') || description.includes('política')) return 'policies';
  if (
    ['CONTRACT', 'PROCESSOR', 'TRANSFER', 'TID'].some(value => id.includes(value)) ||
    ['contrato', 'transfer', 'proveedor'].some(value => category.includes(value)) ||
    ['proveedor', 'encargado', 'dpa', 'scc', 'transferencia'].some(value => description.includes(value))
  ) return 'transfers';
  return 'cmp';
}
