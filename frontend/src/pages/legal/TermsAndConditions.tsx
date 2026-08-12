import React from 'react';
import { Award } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-left">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6 mb-6">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Términos y Condiciones</h1>
            <p className="text-xs text-slate-400 mt-1">Acuerdo de uso de la plataforma SaaS Scanner DPO</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-350 leading-relaxed text-justify">
          <p>
            Al registrarse y utilizar el software de <strong>Scanner DPO</strong>, usted suscribe el presente acuerdo comercial vinculante con PrivacyTech SpA, aceptando las condiciones descritas a continuación.
          </p>

          <div>
            <h2 className="text-base font-bold text-white mb-2">1. Objeto del Servicio</h2>
            <p>
              Scanner DPO provee una herramienta de software como servicio (SaaS) orientada al escaneo automático, diagnóstico legal preventivo de cookies y generador de anexos normativos de conformidad con la Ley N° 21.719 en Chile. La plataforma provee sugerencias técnicas y plantillas estandarizadas, pero no constituye asesoría jurídica formal de un bufete de abogados.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">2. Propiedad Intelectual y Licencia</h2>
            <p>
              PrivacyTech SpA concede una licencia de uso limitada, no exclusiva e intransferible para acceder al Panel DPO. Queda estrictamente prohibida la copia del código fuente del widget de consentimiento, la descompilación del motor de escaneo y cualquier reventa comercial de los reportes de cumplimiento sin autorización expresa.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">3. Responsabilidad de la Empresa Cliente</h2>
            <p>
              El inquilino (empresa cliente) es el único responsable de la veracidad de los datos provistos en los cuestionarios de diagnóstico, de la firma real de los DPAs emitidos y de responder en tiempo y forma a los tickets ARCO+ ingresados por sus visitantes.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">4. Limitación de Responsabilidad</h2>
            <p>
              Scanner DPO busca mitigar la exposición de su empresa frente a requerimientos y multas fiscales de la Agencia. No obstante, PrivacyTech SpA no asume responsabilidad directa por multas, amonestaciones o sanciones administrativas cursadas por el regulador debido al uso negligente de la herramienta por parte de los operadores de la empresa.
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
