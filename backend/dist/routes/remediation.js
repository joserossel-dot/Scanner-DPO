import { Router } from 'express';
import cors from 'cors';
import { generateContractText } from '../services/contractBuilder.js';
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
// Protect all routes
router.use(authenticateToken);
// POST /api/remediation/generate-contract
router.post('/generate-contract', adminCors, async (req, res) => {
    try {
        const data = req.body;
        if (!data.clientName || !data.clientRut || !data.vendorName || !data.contractType) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios en la petición.' });
        }
        const htmlContent = generateContractText(data);
        res.json({
            success: true,
            contractType: data.contractType,
            htmlContent
        });
    }
    catch (error) {
        console.error('Error generating contract document:', error.message);
        res.status(500).json({ error: 'Error interno al redactar el contrato: ' + error.message });
    }
});
export default router;
