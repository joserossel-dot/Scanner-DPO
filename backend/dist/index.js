import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDb } from './database/db.js';
import apiRouter from './routes/api.js';
import transfersRouter from './routes/transfers.js';
import incidentsRouter from './routes/incidents.js';
import reportsRouter from './routes/reports.js';
import remediationRouter from './routes/remediation.js';
import authRouter from './routes/auth.js';
import dpoSuiteRouter from './routes/dpoSuite.js';
import ropaRouter from './routes/ropa.js';
import aiRouter from './routes/ai.js';
import adminRouter from './routes/admin.js';
// Load environment variables
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
// API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', apiRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/remediation', remediationRouter);
app.use('/api/dpo', dpoSuiteRouter);
app.use('/api/ropa', ropaRouter);
app.use('/api/ai', aiRouter);
// Serve the compiled Frontend Dashboard from the frontend workspace
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));
// Serve the compiled Widget from the widget workspace (build target)
const widgetDistPath = path.resolve(__dirname, '../../widget/dist');
app.use('/sdk', cors(), express.static(widgetDistPath));
// Fallback mapping: also serve direct from /widget.js for simplicity of embedding
app.get('/widget.js', cors(), (req, res) => {
    res.sendFile(path.join(widgetDistPath, 'widget.js'), (err) => {
        if (err) {
            // If not built yet, we can serve a placeholder or send a 404
            res.status(404).send('Widget script not found. Build the widget workspace first using: npm run build -w widget');
        }
    });
});
// Host a mock client website to demonstrate compliance audits and CMP widget loading
app.get('/mock-site/index.html', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Commerce Demo Chile - Sitio de Prueba</title>
    
    <!-- MOCK COOKIES / TRACKING SCRIPTS (Para probar el escáner y bloqueo del CMP) -->
    <!-- Script 1: Google Analytics (Simulado) -->
    <script>
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
        ga('create', 'UA-XXXXX-Y', 'auto');
        ga('send', 'pageview');
        console.log("[Analytics] Script de Google Analytics ejecutándose de inmediato.");
    </script>
    
    <!-- Script 2: Meta Pixel (Simulado) -->
    <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '123456789');
        fbq('track', 'PageView');
        console.log("[Meta Pixel] Script de Meta Pixel ejecutándose de inmediato.");
    </script>

    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 600px;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        h1 { color: #2563eb; font-size: 24px; margin-top: 0; }
        .form-group {
            margin-bottom: 15px;
        }
        label { display: block; font-weight: 600; margin-bottom: 5px; font-size: 14px; }
        input[type="text"], input[type="email"], textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            box-sizing: border-box;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin: 15px 0;
        }
        .checkbox-group input { margin-right: 10px; }
        button {
            background-color: #2563eb;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            width: 100%;
        }
        button:hover { background-color: #1d4ed8; }
        .footer-links {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            font-size: 13px;
        }
        .footer-links a { color: #4b5563; text-decoration: underline; margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Tienda Virtual - Demo de Cumplimiento</h1>
        <p>Este sitio web simula un e-commerce corporativo con scripts de seguimiento activos y un formulario de suscripción.</p>
        
        <form id="contactForm" onsubmit="event.preventDefault(); alert('Datos enviados (simulación)');">
            <div class="form-group">
                <label for="name">Nombre Completo</label>
                <input type="text" id="name" required placeholder="Juan Pérez">
            </div>
            
            <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input type="email" id="email" required placeholder="juan.perez@email.cl">
            </div>

            <!-- CASILLA INCLUMPLIMIENTO: Pre-marcada (Opt-out en vez de Opt-in) -->
            <div class="checkbox-group">
                <input type="checkbox" id="newsletter" checked>
                <label for="newsletter" style="display:inline; font-weight: normal; font-size: 13px;">
                    Acepto recibir correos comerciales de ofertas y promociones (Casilla Pre-marcada).
                </label>
            </div>

            <button type="submit">Registrarse</button>
        </form>

        <div class="footer-links">
            <!-- Falta enlace explícito a política de privacidad para forzar fallo en auditoría -->
            <a href="#" onclick="alert('Enlace simulado sin página real de política')">Contacto</a> | 
            <a href="#">Términos de Servicio</a>
        </div>
    </div>

    <!-- INTEGRACIÓN DEL WIDGET CMP DE PRIVACYTECH (Chile Ley 21.719) -->
    <!-- En un entorno real se inyecta esta única línea -->
    <script src="/widget.js" async></script>
</body>
</html>
  `);
});
// Start Server
async function startServer() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 SaaS Backend running at http://localhost:${PORT}`);
        console.log(`🌐 Mock Site for audits: http://localhost:${PORT}/mock-site/index.html`);
        console.log(`📦 Widget loaded at: http://localhost:${PORT}/widget.js`);
        console.log(`====================================================`);
    });
}
startServer();
