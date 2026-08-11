import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
const router = Router();
// CORS setup matching dashboard origins
const adminCors = cors((req, callback) => {
    const origin = req.header('Origin');
    const host = req.header('Host');
    const allowedOrigins = [
        process.env.DASHBOARD_ORIGIN,
        'http://localhost:5173',
        'http://localhost:3000',
        host
    ].filter(Boolean);
    const isAllowed = !origin || allowedOrigins.some(allowed => origin === allowed ||
        origin === `https://${allowed}` ||
        origin === `http://${allowed}`);
    let corsOptions;
    if (isAllowed || process.env.NODE_ENV !== 'production') {
        corsOptions = { origin: true, credentials: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
});
// Protect all routes under this router
router.use(authenticateToken);
// GET /api/transfers - List all registered transfers for user
router.get('/', adminCors, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query('SELECT * FROM international_transfers WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching international transfers:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al consultar transferencias.' });
    }
});
// POST /api/transfers - Register a new transfer flow for user
router.post('/', adminCors, async (req, res) => {
    const { domain, vendor_name, destination_country, data_categories, transfer_mechanism, has_signed_scc, scc_document_url, signature_status } = req.body;
    if (!domain || !vendor_name || !destination_country || !transfer_mechanism || !Array.isArray(data_categories)) {
        return res.status(400).json({ error: 'Campos requeridos faltantes o con formato inválido.' });
    }
    const db = getDb();
    try {
        const result = await db.query(`INSERT INTO international_transfers 
       (domain, vendor_name, destination_country, data_categories, transfer_mechanism, has_signed_scc, scc_document_url, signature_status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            domain,
            vendor_name,
            destination_country,
            JSON.stringify(data_categories),
            transfer_mechanism,
            has_signed_scc === true,
            scc_document_url || null,
            signature_status || 'PENDING',
            req.user.id
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating international transfer:', error.message);
        res.status(500).json({ error: 'Error al registrar la transferencia internacional.' });
    }
});
// PUT /api/transfers/:id - Update transfer mechanism or documents
router.put('/:id', adminCors, async (req, res) => {
    const { id } = req.params;
    const { vendor_name, destination_country, data_categories, transfer_mechanism, has_signed_scc, scc_document_url, signature_status } = req.body;
    const db = getDb();
    try {
        // Check if transfer exists and belongs to the user
        const check = await db.query('SELECT 1 FROM international_transfers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Registro de transferencia no encontrado o sin permisos.' });
        }
        const result = await db.query(`UPDATE international_transfers
       SET vendor_name = COALESCE($2, vendor_name),
           destination_country = COALESCE($3, destination_country),
           data_categories = COALESCE($4, data_categories),
           transfer_mechanism = COALESCE($5, transfer_mechanism),
           has_signed_scc = COALESCE($6, has_signed_scc),
           scc_document_url = COALESCE($7, scc_document_url),
           signature_status = COALESCE($8, signature_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $9
       RETURNING *`, [
            id,
            vendor_name,
            destination_country,
            data_categories ? JSON.stringify(data_categories) : null,
            transfer_mechanism,
            has_signed_scc !== undefined ? has_signed_scc === true : null,
            scc_document_url,
            signature_status,
            req.user.id
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating international transfer:', error.message);
        res.status(500).json({ error: 'Error al actualizar la transferencia internacional.' });
    }
});
// DELETE /api/transfers/:id - Delete transfer record
router.delete('/:id', adminCors, async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const check = await db.query('SELECT 1 FROM international_transfers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Registro de transferencia no encontrado o sin permisos.' });
        }
        await db.query('DELETE FROM international_transfers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ message: 'Registro de transferencia eliminado exitosamente.' });
    }
    catch (error) {
        console.error('Error deleting international transfer:', error.message);
        res.status(500).json({ error: 'Error al eliminar el registro de transferencia.' });
    }
});
// GET /api/transfers/countries - List all adequate countries and reference notes
router.get('/countries', adminCors, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query('SELECT * FROM adequate_countries_reference ORDER BY country_name ASC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching countries reference:', error.message);
        res.status(500).json({ error: 'Error al consultar la lista de países adecuados.' });
    }
});
// POST /api/transfers/generate-scc - Generate custom Model Contractual Clauses (SCC)
router.post('/generate-scc', adminCors, async (req, res) => {
    const { exporterName, exporterRut, exporterAddress, importerName, importerCountry, importerAddress, dataCategories } = req.body;
    if (!exporterName || !exporterRut || !exporterAddress || !importerName || !importerCountry || !importerAddress) {
        return res.status(400).json({ error: 'Faltan datos de las partes contratantes para generar las Cláusulas Tipo.' });
    }
    const sccContent = `# ANEXO CONTRACTUAL: CLÁUSULAS CONTRACTUALES TIPO (SCC)
**Para la Transferencia Internacional de Datos Personales (Art. 27 y 28 de la Ley N° 21.719 de Chile)**

---

### REUNIDOS

**De una parte, como EXPORTADOR DE DATOS (Chile):**
- **Razón Social / Nombre:** ${exporterName}
- **RUT / Identificación:** ${exporterRut}
- **Domicilio Legal:** ${exporterAddress}
- **País:** Chile

**Y de otra parte, como IMPORTADOR DE DATOS (Destinatario):**
- **Razón Social / Nombre:** ${importerName}
- **Domicilio Legal:** ${importerAddress}
- **País / Jurisdicción:** ${importerCountry}

Ambas partes se reconocen la capacidad legal suficiente y suscriben las presentes Cláusulas Contractuales Tipo de conformidad con las exigencias legales de la Ley N° 21.719 sobre Protección de Datos Personales de Chile.

---

### CLÁUSULAS

#### CLÁUSULA PRIMERA: Objeto y Ámbito de Aplicación
El Exportador transferirá al Importador los datos personales descritos en el Anexo I para la prestación de servicios indicados. El Importador se compromete a tratarlos únicamente bajo las instrucciones del Exportador y con apego estricto a las garantías de seguridad técnica y organizativa estipuladas.

#### CLÁUSULA SEGUNDA: Categorías de Datos Transferidos (Anexo I)
Los datos personales objeto de transferencia transfronteriza comprenden:
${Array.isArray(dataCategories) ? dataCategories.map(c => `- ${c}`).join('\n') : '- Datos de contacto y registro de usuarios'}

#### CLÁUSULA TERCERA: Obligaciones del Importador
1. **Limitación de Finalidad:** Tratar los datos personales únicamente para las finalidades autorizadas por el titular del dato.
2. **Medidas de Seguridad:** Implementar cifrado de datos (en tránsito y en reposo), control de acceso estricto y auditorías periódicas.
3. **Notificación de Brechas:** Informar inmediatamente al Exportador (en un plazo no mayor a 24 horas) en caso de cualquier incidente de seguridad que afecte los datos transferidos.
4. **Subprocesamiento:** No transferir los datos a terceros subencargados sin la autorización expresa y escrita del Exportador.

#### CLÁUSULA CUARTA: Derechos de los Titulares (ARCO+)
El Importador facilitará la respuesta a las solicitudes de acceso, rectificación, supresión, oposición, bloqueo y portabilidad que formulen los titulares de los datos ante el Exportador en los plazos máximos señalados por la legislación chilena (30 días corridos generales, o 2 días hábiles en caso de bloqueo temporal).

#### CLÁUSULA QUINTA: Jurisdicción y Ley Aplicable
Las presentes cláusulas se regirán por las leyes de la República de Chile. Las partes acuerdan someter cualquier controversia a la jurisdicción exclusiva de los tribunales ordinarios de justicia de Santiago de Chile o a la Agencia de Protección de Datos Personales de Chile.

---

### FIRMAS DE LAS PARTES

\`\`\`
____________________________________        ____________________________________
Por el EXPORTADOR DE DATOS                   Por el IMPORTADOR DE DATOS
Nombre:                                     Nombre:
Cargo:                                      Cargo:
Fecha:                                      Fecha:
\`\`\`
`;
    res.json({ sccContent });
});
export default router;
