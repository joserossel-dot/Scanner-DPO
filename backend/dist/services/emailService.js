import { Resend } from 'resend';
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const ADMIN_EMAIL = 'admin@privacytech.cl';
export async function sendLeadAlert(domain, email, score) {
    const subject = `🚨 Nuevo Lead de Alto Valor Detectado: ${domain}`;
    const html = `
    <h1>Nuevo Lead capturado en el Escáner Gratuito</h1>
    <p><strong>Dominio:</strong> ${domain}</p>
    <p><strong>Email de contacto:</strong> ${email}</p>
    <p><strong>Score de Privacidad detectado:</strong> ${score}%</p>
    <p><em>Acceda al Superadmin Dashboard para gestionar este prospecto.</em></p>
  `;
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Scanner DPO Alerts <alerts@privacytech.cl>',
                to: ADMIN_EMAIL,
                subject,
                html
            });
            console.log(`[EmailService] Alerta de lead enviada con Resend para ${domain}`);
        }
        catch (err) {
            console.error(`[EmailService] Error enviando correo de lead con Resend:`, err.message);
        }
    }
    else {
        console.log(`[EmailService] [SIMULACIÓN] Alerta de lead para ${domain}: ${email} (Score: ${score}%)`);
    }
}
export async function sendTenantActivationAlert(userId, companyName, score) {
    const subject = `🚀 Inquilino Activo - Inventario RoPA Confirmado: ${companyName}`;
    const html = `
    <h1>Inquilino ha completado su Onboarding</h1>
    <p><strong>ID Usuario:</strong> ${userId}</p>
    <p><strong>Nombre Empresa:</strong> ${companyName}</p>
    <p><strong>Score de Cumplimiento Calculado:</strong> ${score}%</p>
    <p><em>El cliente está listo para recibir soporte DPA/SCC u ofertas avanzadas del DPO Suite.</em></p>
  `;
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Scanner DPO Alerts <alerts@privacytech.cl>',
                to: ADMIN_EMAIL,
                subject,
                html
            });
            console.log(`[EmailService] Alerta de activación enviada con Resend para ${companyName}`);
        }
        catch (err) {
            console.error(`[EmailService] Error enviando correo de activación con Resend:`, err.message);
        }
    }
    else {
        console.log(`[EmailService] [SIMULACIÓN] Alerta de activación para ${companyName} (User ID: ${userId}, Score: ${score}%)`);
    }
}
