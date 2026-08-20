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
export async function sendImplementationRequestAlert(userId, userEmail, companyName, findingId, description, effort) {
    const subject = `🛠️ Solicitud de Ayuda para Implementación: ${companyName}`;
    const html = `
    <h1>Nueva Solicitud de Ayuda para Implementación</h1>
    <p><strong>Empresa:</strong> ${companyName}</p>
    <p><strong>ID Usuario:</strong> ${userId}</p>
    <p><strong>Email del Usuario:</strong> ${userEmail}</p>
    <p><strong>ID del Hallazgo:</strong> ${findingId}</p>
    <p><strong>Descripción del Hallazgo:</strong> ${description}</p>
    <p><strong>Esfuerzo Estimado:</strong> ${effort}</p>
    <p><em>El equipo de PrivacyTech debe contactar a este cliente dentro de las próximas 24-48 horas para coordinar la remediación técnica.</em></p>
  `;
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Scanner DPO Alerts <alerts@privacytech.cl>',
                to: ADMIN_EMAIL,
                subject,
                html
            });
            console.log(`[EmailService] Alerta de ayuda para implementación enviada con Resend para ${companyName}`);
        }
        catch (err) {
            console.error(`[EmailService] Error enviando correo de ayuda para implementación con Resend:`, err.message);
        }
    }
    else {
        console.log(`[EmailService] [SIMULACIÓN] Alerta de ayuda para implementación para ${companyName} (User ID: ${userId}, Finding ID: ${findingId}, Esfuerzo: ${effort})`);
    }
}
export async function sendPasswordResetEmail(toEmail, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const subject = 'Recupera tu contraseña — Scanner DPO';
    const html = `
    <h1>Recuperación de contraseña</h1>
    <p>Recibimos una solicitud para restablecer tu contraseña para tu cuenta de Scanner DPO.</p>
    <p><a href="${resetUrl}">Haz clic aquí para crear una nueva contraseña</a></p>
    <p>Este enlace expira en 1 hora. Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>
  `;
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Scanner DPO <noreply@privacytech.cl>',
                to: toEmail,
                subject,
                html
            });
            console.log(`[EmailService] Correo de recuperación enviado con Resend para ${toEmail}`);
        }
        catch (err) {
            console.error(`[EmailService] Error enviando correo de recuperación con Resend:`, err.message);
            throw err;
        }
    }
    else {
        console.log(`[EmailService] [SIMULACIÓN] Link de recuperación: ${resetUrl}`);
    }
}
