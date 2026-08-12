import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPublic() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-left">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6 mb-6">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Política de Privacidad</h1>
            <p className="text-xs text-slate-400 mt-1">Conforme al Artículo 14 ter de la Ley N° 21.719</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-350 leading-relaxed text-justify">
          <p>
            Bienvenido a <strong>Scanner DPO</strong> (propiedad de PrivacyTech SpA). En cumplimiento con el <strong>Artículo 14 ter</strong> de la Ley N° 21.719 de Protección de Datos Personales, le informamos con total transparencia sobre las actividades de tratamiento de sus datos personales.
          </p>

          <div>
            <h2 className="text-base font-bold text-white mb-2">1. Responsable del Tratamiento</h2>
            <p>
              La persona jurídica encargada del tratamiento de sus datos personales es <strong>PrivacyTech SpA</strong>, domiciliada en Av. Apoquindo 4800, Las Condes, Santiago de Chile. Si desea realizar alguna consulta o requerimiento respecto a sus datos personales, puede escribir directamente a nuestro Delegado de Protección de Datos (DPO) a través de la casilla electrónica: <strong>privacidad@scannerdpo.cl</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">2. Categorías de Datos Recolectados</h2>
            <p>
              Para el correcto funcionamiento de nuestra plataforma de auditoría legal y SaaS, recolectamos:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li><strong>Datos de contacto corporativos:</strong> Nombre, correo electrónico de la empresa, nombre de la organización y RUT.</li>
              <li><strong>Datos analíticos técnicos:</strong> Dirección IP, tipo de navegador, registros de auditoría de consentimiento web y metadatos de dominios escaneados.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">3. Finalidades del Tratamiento</h2>
            <p>
              Sus datos son recopilados con las siguientes finalidades lícitas:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li>Prestación y mantenimiento de los servicios del software de escaneo y auditoría B2B.</li>
              <li>Envío de alertas preventivas de seguridad e incidentes de cumplimiento.</li>
              <li>Resguardo legal de la prueba de consentimiento exigida por el regulador.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">4. Transferencias y Destinatarios</h2>
            <p>
              Sus datos no son vendidos ni cedidos a terceras partes comerciales. Ocasionalmente, sus datos analíticos y técnicos se procesan a través de proveedores SaaS de almacenamiento e infraestructura cloud (ej. AWS) debidamente regularizados bajo contratos con cláusulas de procesamiento y acuerdos DPA (Art. 15 bis).
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">5. Plazos de Conservación</h2>
            <p>
              Los datos personales provistos para cuentas del panel se conservarán durante toda la relación contractual comercial y hasta un período de <strong>24 meses</strong> posterior al cese de actividades de la cuenta para auditorías y requerimientos de cumplimiento legal.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">6. Ejercicio de sus Derechos (ARCO+)</h2>
            <p>
              De acuerdo con la normativa legal chilena, usted tiene derecho a solicitar el <strong>Acceso, Rectificación, Supresión/Cancelación, Oposición, Portabilidad y Bloqueo Temporal</strong> de sus datos personales. Puede ejercer estos derechos de manera completamente gratuita utilizando nuestro formulario público de Derechos ARCO+ en esta plataforma o enviando una solicitud firmada al email del DPO provisto en la sección 1.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          Última actualización: {new Date().toLocaleDateString('es-CL')} • Scanner DPO Compliance
        </div>
      </div>
    </div>
  );
}
