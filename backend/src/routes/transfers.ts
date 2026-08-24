import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();

// Protect all routes under this router
router.use(authenticateToken);
router.use(resolveActiveOrganization);

// GET /api/transfers - List all registered transfers for user
router.get('/', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      'SELECT * FROM international_transfers WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.organization.id]
    );
    const mapped = result.rows.map((row: any) => ({
      ...row,
      provider_name: row.vendor_name,
      country: row.destination_country,
      has_scc: row.has_signed_scc === true,
      has_dpa: row.signature_status === 'SIGNED' || row.has_signed_scc === true
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching international transfers:', error.message);
    res.status(500).json({ error: 'Error interno del servidor al consultar transferencias.' });
  }
});

// POST /api/transfers - Register a new transfer flow for user
router.post('/', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { domain, vendor_name, provider_name, destination_country, country, data_categories, transfer_mechanism,
    has_signed_scc, has_scc, scc_document_url, signature_status, has_dpa, ropa_activity_id, purpose,
    legal_basis, safeguards, adequacy_status, assessment_source, assessment_version, review_due_at } = req.body;

  const vName = vendor_name || provider_name;
  const destCountry = destination_country || country;
  const hasScc = has_signed_scc !== undefined ? has_signed_scc === true : (has_scc !== undefined ? has_scc === true : false);
  const sigStatus = signature_status || (has_dpa === true ? 'SIGNED' : 'PENDING');

  if (!domain || !vName || !destCountry || !transfer_mechanism || !Array.isArray(data_categories)) {
    return res.status(400).json({ error: 'Campos requeridos faltantes o con formato inválido.' });
  }

  const db = getDb();
  try {
    if (ropa_activity_id) {
      const activity = await db.query(
        'SELECT 1 FROM ropa_inventory WHERE id = $1 AND organization_id = $2',
        [ropa_activity_id, req.organization.id]
      );
      if (!activity.rowCount) return res.status(400).json({ error: 'La actividad RoPA vinculada no pertenece a la organización.' });
    }
    const result = await db.query(
      `INSERT INTO international_transfers 
       (domain, vendor_name, destination_country, data_categories, transfer_mechanism, has_signed_scc,
        scc_document_url, signature_status, user_id, organization_id, ropa_activity_id, purpose,
        legal_basis, safeguards, adequacy_status, assessment_source, assessment_version, review_due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        domain,
        vName,
        destCountry,
        JSON.stringify(data_categories),
        transfer_mechanism,
        hasScc,
        scc_document_url || null,
        sigStatus,
        req.user.id,
        req.organization.id,
        ropa_activity_id || null,
        purpose || null,
        legal_basis || null,
        JSON.stringify(Array.isArray(safeguards) ? safeguards.map(String).filter(Boolean) : []),
        adequacy_status || 'PENDING_REVIEW',
        assessment_source || null,
        assessment_version || null,
        review_due_at || null
      ]
    );
    
    const row = result.rows[0];
    const mapped = {
      ...row,
      provider_name: row.vendor_name,
      country: row.destination_country,
      has_scc: row.has_signed_scc === true,
      has_dpa: row.signature_status === 'SIGNED' || row.has_signed_scc === true
    };
    res.status(201).json(mapped);
  } catch (error: any) {
    console.error('Error creating international transfer:', error.message);
    res.status(500).json({ error: 'Error al registrar la transferencia internacional.' });
  }
});

// PUT /api/transfers/:id - Update transfer mechanism or documents
router.put('/:id', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { id } = req.params;
  const { vendor_name, provider_name, destination_country, country, data_categories, transfer_mechanism,
    has_signed_scc, has_scc, scc_document_url, signature_status, has_dpa, ropa_activity_id, purpose,
    legal_basis, safeguards, adequacy_status, assessment_source, assessment_version, review_due_at } = req.body;

  const vName = vendor_name || provider_name;
  const destCountry = destination_country || country;
  const hasScc = has_signed_scc !== undefined ? has_signed_scc === true : (has_scc !== undefined ? has_scc === true : undefined);
  const sigStatus = signature_status || (has_dpa === true ? 'SIGNED' : (has_dpa === false ? 'PENDING' : undefined));

  const db = getDb();
  try {
    // Check if transfer exists and belongs to the user
    const check = await db.query('SELECT 1 FROM international_transfers WHERE id = $1 AND organization_id = $2', [id, req.organization.id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de transferencia no encontrado o sin permisos.' });
    }
    if (ropa_activity_id) {
      const activity = await db.query(
        'SELECT 1 FROM ropa_inventory WHERE id = $1 AND organization_id = $2',
        [ropa_activity_id, req.organization.id]
      );
      if (!activity.rowCount) return res.status(400).json({ error: 'La actividad RoPA vinculada no pertenece a la organización.' });
    }

    const result = await db.query(
      `UPDATE international_transfers
       SET vendor_name = COALESCE($2, vendor_name),
           destination_country = COALESCE($3, destination_country),
           data_categories = COALESCE($4, data_categories),
           transfer_mechanism = COALESCE($5, transfer_mechanism),
           has_signed_scc = COALESCE($6, has_signed_scc),
           scc_document_url = COALESCE($7, scc_document_url),
           signature_status = COALESCE($8, signature_status),
           ropa_activity_id = COALESCE($9, ropa_activity_id),
           purpose = COALESCE($10, purpose),
           legal_basis = COALESCE($11, legal_basis),
           safeguards = COALESCE($12, safeguards),
           adequacy_status = COALESCE($13, adequacy_status),
           assessment_source = COALESCE($14, assessment_source),
           assessment_version = COALESCE($15, assessment_version),
           review_due_at = COALESCE($16, review_due_at),
           last_reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $17
       RETURNING *`,
      [
        id,
        vName,
        destCountry,
        data_categories ? JSON.stringify(data_categories) : null,
        transfer_mechanism,
        hasScc,
        scc_document_url,
        sigStatus,
        ropa_activity_id,
        purpose,
        legal_basis,
        Array.isArray(safeguards) ? JSON.stringify(safeguards.map(String).filter(Boolean)) : null,
        adequacy_status,
        assessment_source,
        assessment_version,
        review_due_at,
        req.organization.id
      ]
    );
    
    const row = result.rows[0];
    const mapped = {
      ...row,
      provider_name: row.vendor_name,
      country: row.destination_country,
      has_scc: row.has_signed_scc === true,
      has_dpa: row.signature_status === 'SIGNED' || row.has_signed_scc === true
    };
    res.json(mapped);
  } catch (error: any) {
    console.error('Error updating international transfer:', error.message);
    res.status(500).json({ error: 'Error al actualizar la transferencia internacional.' });
  }
});

// DELETE /api/transfers/:id - Delete transfer record
router.delete('/:id', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const check = await db.query('SELECT 1 FROM international_transfers WHERE id = $1 AND organization_id = $2', [id, req.organization.id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de transferencia no encontrado o sin permisos.' });
    }

    await db.query('DELETE FROM international_transfers WHERE id = $1 AND organization_id = $2', [id, req.organization.id]);
    res.json({ message: 'Registro de transferencia eliminado exitosamente.' });
  } catch (error: any) {
    console.error('Error deleting international transfer:', error.message);
    res.status(500).json({ error: 'Error al eliminar el registro de transferencia.' });
  }
});

// GET /api/transfers/countries - List all adequate countries and reference notes
router.get('/countries', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query('SELECT * FROM adequate_countries_reference ORDER BY country_name ASC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching countries reference:', error.message);
    res.status(500).json({ error: 'Error al consultar la lista de países adecuados.' });
  }
});

// POST /api/transfers/generate-scc - Generate custom Model Contractual Clauses (SCC)
router.post('/generate-scc', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
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
