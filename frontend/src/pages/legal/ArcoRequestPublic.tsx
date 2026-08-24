import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { API_BASE } from '../../lib/api';

export default function ArcoRequestPublic() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [requestType, setRequestType] = useState('');
  const [details, setDetails] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedPolicy) {
      setErrorMsg('Debe aceptar la política de privacidad para proceder.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessData(null);

    const payload = {
      domain: window.location.hostname,
      requesterName: name,
      requesterEmail: email,
      requestType,
      details
    };

    console.log('🛡️ [ARCO+ Request] Enviando solicitud pública:', payload);

    try {
      const response = await fetch(`${API_BASE}/api/arco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData(data);
        // Clear fields
        setName('');
        setEmail('');
        setRequestType('');
        setDetails('');
        setAcceptedPolicy(false);
      } else {
        const errData = await response.json();
        setErrorMsg(errData.error || 'Error al enviar la solicitud.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al procesar el requerimiento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center text-left">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white uppercase tracking-wider">Derechos ARCO+</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Formulario Público de Requerimientos • Ley N° 21.719</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs rounded-lg font-semibold">
            {errorMsg}
          </div>
        )}

        {successData ? (
          <div className="bg-emerald-950/20 border border-emerald-900/40 p-5 rounded-xl space-y-3.5 text-center">
            <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={24} />
            </div>
            <div className="text-left space-y-2 text-xs">
              <h4 className="font-bold text-white text-center text-sm">¡Solicitud Registrada con Éxito!</h4>
              <p className="text-slate-400 leading-relaxed text-justify">
                Su requerimiento ha sido ingresado en la bitácora técnica de cumplimiento de Scanner DPO. 
              </p>
              <div className="bg-slate-950 p-3 rounded border border-slate-850 font-mono text-[10px] text-indigo-400 mt-2 space-y-1">
                <div><strong>Tipo:</strong> {successData.requestType}</div>
                <div><strong>Plazo Legal de Respuesta:</strong> {new Date(successData.dueDate).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><strong>ID Solicitud:</strong> {successData.id}</div>
              </div>
            </div>
            <button
              onClick={() => setSuccessData(null)}
              className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
            >
              Registrar Otra Solicitud
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nombre Completo</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                placeholder="Juan Pérez"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                placeholder="juan.perez@email.cl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Derecho que desea Ejercer</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                value={requestType}
                onChange={e => setRequestType(e.target.value)}
                required
              >
                <option value="">-- Seleccione un Derecho --</option>
                <option value="Acceso">Acceso (Conocer qué datos tratamos)</option>
                <option value="Rectificación">Rectificación (Modificar datos erróneos)</option>
                <option value="Cancelación">Cancelación / Supresión (Eliminar datos)</option>
                <option value="Oposición">Oposición (Denegar tratamiento específico)</option>
                <option value="Bloqueo">Bloqueo Temporal (Suspensión por 2 días hábiles)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Detalles de su Solicitud</label>
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                rows={4}
                placeholder="Describa el motivo y los datos personales sobre los que ejerce el derecho..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                required
              />
            </div>

            <div className="flex items-start gap-2.5 pt-2 select-none">
              <input
                type="checkbox"
                id="pt-arco-agree"
                checked={acceptedPolicy}
                onChange={e => setAcceptedPolicy(e.target.checked)}
                className="rounded border-slate-800 text-indigo-650 focus:ring-0 bg-slate-950 w-4 h-4 mt-0.5"
                required
              />
              <label htmlFor="pt-arco-agree" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                Acepto de forma expresa e informada la <a href="/privacidad" target="_blank" className="text-indigo-400 underline">Política de Privacidad</a> de la plataforma.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 loader" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>Enviar Solicitud al DPO de Scanner</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
