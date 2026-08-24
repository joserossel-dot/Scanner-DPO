import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();

// Protect routes
router.use(authenticateToken);
router.use(resolveActiveOrganization);

// POST /api/ai/ask - Ask DPO Copilot about Ley N° 21.719
router.post('/ask', requireOrganizationPermission('compliance.read'), async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'El parámetro "prompt" es obligatorio y debe ser texto.' });
  }

  const query = prompt.toLowerCase();

  // Simulated AI response logic matching key topics in Ley 21.719
  let responseText = '';

  if (query.includes('multa') || query.includes('sancion') || query.includes('sanción')) {
    responseText = 'Bajo la Ley N° 21.719 (que reforma la protección de datos en Chile), las sanciones son severas. Se dividen en: Leves (amonestación o multa hasta 5.000 UTM), Graves (multa hasta 10.000 UTM o el 2% de los ingresos anuales) y Gravísimas (multa hasta 20.000 UTM o el 4% de los ingresos anuales globales). ¿Desea que simulemos el pico máximo de su exposición al riesgo en UTM en su reporte?';
  } else if (query.includes('arco') || query.includes('acceso') || query.includes('derecho')) {
    responseText = 'La Ley N° 21.719 consagra los derechos ARCO+: Acceso (conocer qué datos se tratan), Rectificación (corregir datos incorrectos), Cancelación (eliminar registros), Oposición (denegar tratamiento específico), Portabilidad (transferir datos a otro proveedor) y Bloqueo Temporal (suspender el tratamiento durante disputas). Para cumplir, debe desplegar un formulario público en su sitio web; puede usar nuestro portal público en /arco.';
  } else if (query.includes('dpo') || query.includes('delegado') || query.includes('prevencion') || query.includes('prevención')) {
    responseText = 'El Delegado de Protección de Datos (DPO) es el encargado de coordinar el cumplimiento interno y servir de puente ante la Agencia de Protección de Datos Personales. Nombrar un DPO y contar con una matriz de riesgos (como la provista en nuestra sección DPO Suite) es una medida atenuante clave en caso de fiscalizaciones o incidentes.';
  } else if (query.includes('cookie') || query.includes('consentimiento') || query.includes('banner')) {
    responseText = 'El Art. 12 exige el consentimiento previo, expreso, informado e inequívoco para el tratamiento de datos. El uso de cookies analíticas o publicitarias (como las de Google o Meta) sin autorización previa es una infracción. Para resolverlo, puede incrustar nuestro widget.js en su sitio web, el cual bloquea automáticamente los scripts hasta obtener aceptación.';
  } else {
    responseText = 'De acuerdo con las directivas de la Ley N° 21.719 en Chile, este aspecto operativo específico debe ser supervisado por el Oficial de Privacidad (DPO). ¿Le gustaría que redactemos una política de tratamiento o registremos esta brecha dentro de su Matriz de Riesgos?';
  }

  /*
   * FUTURE INTEGRATION WITH OPENAI / GEMINI API:
   * 
   * import { GoogleGenAI } from '@google/generative-ai';
   * const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
   * const model = ai.getGenerativeModel({ model: 'gemini-1.5-pro' });
   * 
   * const systemInstruction = `Actúas como un Oficial de Protección de Datos (DPO) Senior experto en la Ley N° 21.719 de Chile.
   * Responde de manera profesional, técnica y clara citando artículos específicos si aplica.`;
   * 
   * try {
   *   const result = await model.generateContent({
   *     contents: [{ role: 'user', parts: [{ text: prompt }] }],
   *     generationConfig: { maxOutputTokens: 500 },
   *     systemInstruction
   *   });
   *   const responseText = result.response.text();
   *   return res.json({ response: responseText });
   * } catch (error) { ... }
   */

  return res.json({ response: responseText });
});

export default router;
