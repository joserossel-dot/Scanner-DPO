import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function CookiesPolicyPublic() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-left">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6 mb-6">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Política de Cookies</h1>
            <p className="text-xs text-slate-400 mt-1">Gobernanza y transparencia de archivos de rastreo</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-350 leading-relaxed text-justify">
          <p>
            En <strong>Scanner DPO</strong>, implementamos el principio de licitud y autodeterminación informativa. Le informamos detalladamente qué cookies utilizamos en nuestro sitio web, para qué fines, y cómo puede configurar o desactivar las mismas en concordancia con el Art. 12 de la normativa vigente.
          </p>

          <div>
            <h2 className="text-base font-bold text-white mb-2">1. ¿Qué es una Cookie?</h2>
            <p>
              Una cookie es un pequeño archivo de texto que un sitio web descarga en su computadora, dispositivo móvil o cualquier terminal cuando nos visita. Se utiliza de manera predeterminada para recordar sus preferencias técnicas de inicio de sesión o recopilar métricas agregadas de comportamiento.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">2. Clasificación de Cookies Utilizadas</h2>
            <div className="space-y-3 mt-3">
              <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-lg">
                <h4 className="font-bold text-white text-xs">A. Cookies Técnicas / Esenciales <span className="text-[10px] text-indigo-400 uppercase font-black ml-2 bg-indigo-950 px-2 py-0.5 rounded">Requerido</span></h4>
                <p className="text-slate-400 mt-1 text-xs">
                  Necesarias exclusivamente para habilitar la navegación segura, el control de accesos e identificar si el usuario ya ha manifestado su aceptación o rechazo al banner de cookies. No se pueden desactivar.
                </p>
              </div>

              <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-lg">
                <h4 className="font-bold text-white text-xs">B. Cookies Analíticas y Estadísticas <span className="text-[10px] text-amber-500 uppercase font-black ml-2 bg-amber-950/40 px-2 py-0.5 rounded">Opcional</span></h4>
                <p className="text-slate-400 mt-1 text-xs">
                  Nos permiten cuantificar el volumen de visitas y las páginas más solicitadas en la Landing Page comercial para optimizar la experiencia técnica. Estos scripts se mantienen bloqueados preventivamente mediante el widget DPO hasta obtener su aprobación lícita.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">3. Configuración y Revocación del Consentimiento</h2>
            <p>
              Usted puede revocar o modificar sus preferencias de consentimiento en cualquier momento presionando el escudo azul flotante ubicado en la parte inferior izquierda de nuestra plataforma. Su navegador registrará de forma inmediata las nuevas preferencias, bloqueando los scripts que no desee ejecutar.
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
