export interface ShadowITProvider {
  name: string;
  category: string;
  country: string;
  adequacyStatus: 'Adecuado' | 'Requiere Garantías (SCC/DPA)' | 'No Adecuado';
  legalRisk: 'Bajo' | 'Medio' | 'Alto';
  multaAsociada: string;
}

export const SHADOW_IT_PROVIDERS: ShadowITProvider[] = [
  // Infraestructura y Nube
  { name: 'AWS (Amazon Web Services)', category: 'Infraestructura y Nube', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Google Cloud Platform (GCP)', category: 'Infraestructura y Nube', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Microsoft Azure', category: 'Infraestructura y Nube', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'DigitalOcean', category: 'Infraestructura y Nube', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },

  // CRM, Marketing y Ventas
  { name: 'HubSpot', category: 'CRM, Marketing y Ventas', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Salesforce', category: 'CRM, Marketing y Ventas', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Mailchimp', category: 'CRM, Marketing y Ventas', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'ActiveCampaign', category: 'CRM, Marketing y Ventas', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'SendGrid', category: 'CRM, Marketing y Ventas', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },

  // Operaciones y Recursos Humanos
  { name: 'Google Workspace', category: 'Operaciones y Recursos Humanos', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Microsoft 365', category: 'Operaciones y Recursos Humanos', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Slack', category: 'Operaciones y Recursos Humanos', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Zoom', category: 'Operaciones y Recursos Humanos', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Deel', category: 'Operaciones y Recursos Humanos', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },

  // Soporte, TI y Analítica
  { name: 'Zendesk', category: 'Soporte, TI y Analítica', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Jira / Atlassian', category: 'Soporte, TI y Analítica', country: 'Australia', adequacyStatus: 'Adecuado', legalRisk: 'Bajo', multaAsociada: 'Sin multa directa' },
  { name: 'Mixpanel', category: 'Soporte, TI y Analítica', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Datadog', category: 'Soporte, TI y Analítica', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' },
  { name: 'Sentry', category: 'Soporte, TI y Analítica', country: 'Estados Unidos', adequacyStatus: 'Requiere Garantías (SCC/DPA)', legalRisk: 'Medio', multaAsociada: 'Hasta 10.000 UTM' }
];

export function getProvidersByCategory(category: string): ShadowITProvider[] {
  return SHADOW_IT_PROVIDERS.filter(p => p.category === category);
}

export function assessProviderRisk(providerName: string): ShadowITProvider | undefined {
  return SHADOW_IT_PROVIDERS.find(p => p.name === providerName);
}
