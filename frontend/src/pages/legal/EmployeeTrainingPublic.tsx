import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, BookOpen, AlertCircle, CheckCircle, RefreshCw, Award } from 'lucide-react';

interface TrainingMaterials {
  client_id: string;
  presentation_url: string;
  policy_text: string;
}

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
      const parts = hostname.split('.');
      const sub = parts[0];
      if (sub.endsWith('-dashboard')) {
        const baseSub = sub.replace('-dashboard', '-api');
        return `https://${baseSub}.onrender.com`;
      }
    }
  }
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

const QUIZ_QUESTIONS = [
  {
    question: "1. ¿Qué tipo de datos requieren consentimiento previo y expreso del titular bajo la ley?",
    options: [
      "A) Datos de navegación pública y cookies esenciales",
      "B) Datos sensibles (salud, biometría, origen étnico, orientación sexual)",
      "C) Datos estadísticos agregados y anonimizados"
    ],
    correctIndex: 1
  },
  {
    question: "2. ¿Cuál es el canal de atención para que un usuario ejerza sus derechos de Acceso, Rectificación, Cancelación u Oposición?",
    options: [
      "A) Canal ARCO+ habilitado oficialmente",
      "B) Las redes sociales corporativas",
      "C) El correo de soporte general sin bitácora"
    ],
    correctIndex: 0
  },
  {
    question: "3. ¿Qué medida es prioritaria en caso de una brecha o vulneración de seguridad de datos de la empresa?",
    options: [
      "A) Silenciar el incidente y esperar a resolverlo internamente sin registrar",
      "B) Registrar el incidente en la bitácora oficial y notificar a la autoridad y titulares afectados",
      "C) Eliminar los respaldos y registros históricos de la base de datos"
    ],
    correctIndex: 1
  },
  {
    question: "4. ¿Cuál es la función del Delegado de Protección de Datos (DPO)?",
    options: [
      "A) Crear y lanzar campañas publicitarias de la empresa",
      "B) Supervisar el cumplimiento normativo y asesorar a la organización en protección de datos",
      "C) Administrar las contraseñas de las cuentas de correo electrónico"
    ],
    correctIndex: 1
  },
  {
    question: "5. ¿Es legal compartir bases de datos de clientes con terceras empresas sin consentimiento explícito?",
    options: [
      "A) Sí, siempre que sean socios comerciales de confianza",
      "B) No, está estrictamente prohibido sin base legal legítima o consentimiento previo y explícito",
      "C) Sí, para cualquier fin comercial o publicitario"
    ],
    correctIndex: 1
  }
];

export default function EmployeeTrainingPublic() {
  const { clientId } = useParams<{ clientId: string }>();
  const [materials, setMaterials] = useState<TrainingMaterials | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null, null]);
  const [declarationAccepted, setDeclarationAccepted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Result states
  const [result, setResult] = useState<{
    success: boolean;
    score: number;
    status: string;
    passed: boolean;
  } | null>(null);

  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/training/materials/${clientId || 'localhost'}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      } else {
        setError('No se pudieron cargar los materiales de capacitación.');
      }
    } catch (e) {
      console.error(e);
      setError('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [clientId]);

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    const updated = [...answers];
    updated[qIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !employeeEmail) {
      alert('Por favor ingrese su nombre y correo.');
      return;
    }
    if (answers.some(a => a === null)) {
      alert('Por favor responda las 5 preguntas del cuestionario.');
      return;
    }
    if (!declarationAccepted) {
      alert('Debe aceptar la declaración jurada obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/training/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId || 'localhost',
          employee_name: employeeName,
          employee_email: employeeEmail,
          declaration_accepted: declarationAccepted,
          answers: answers
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al enviar la capacitación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers([null, null, null, null, null]);
    setDeclarationAccepted(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-emerald-450" size={32} />
          <p className="text-sm text-slate-400">Cargando módulo de capacitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
          <AlertCircle className="text-rose-500 mx-auto" size={48} />
          <h2 className="text-lg font-bold">Error</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button 
            onClick={fetchMaterials}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 md:px-8 text-left">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header portal */}
        <div className="flex items-center gap-3 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <Shield className="text-emerald-450" size={32} />
          <div>
            <h1 className="text-xl font-bold text-white">Certificación en Protección de Datos</h1>
            <p className="text-xs text-slate-400">
              Complete los materiales de estudio y rinda la evaluación obligatoria de cumplimiento corporativo.
            </p>
          </div>
        </div>

        {result ? (
          /* Result view */
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-6">
            {result.passed ? (
              <>
                <Award className="text-emerald-450 mx-auto animate-bounce" size={64} />
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">¡Capacitación Aprobada!</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Felicitaciones, ha obtenido un puntaje de <strong className="text-emerald-450">{result.score}/5</strong>. Su constancia ha sido registrada de forma inalterable para auditorías de cumplimiento de su empresa.
                  </p>
                </div>
                <div className="inline-block px-4 py-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-450 rounded-xl text-xs font-bold font-mono">
                  Estado: Aprobado (Certificado)
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="text-rose-500 mx-auto" size={64} />
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Evaluación No Aprobada</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Su puntaje es de <strong className="text-rose-500">{result.score}/5</strong> (Mínimo requerido: 4/5). Le recomendamos revisar los materiales de estudio nuevamente e intentar la evaluación.
                  </p>
                </div>
                <div className="inline-block px-4 py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-500 rounded-xl text-xs font-bold font-mono">
                  Estado: Pendiente (Cuestionario reprobado)
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Volver a Intentar Cuestionario
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Training materials & Form */
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Identity */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-mono text-xs">1</span>
                Identificación de Colaborador
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Juan Pérez Silva"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 block">Correo Institucional</label>
                  <input
                    type="email"
                    required
                    placeholder="juan.perez@empresa.cl"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value.trim())}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-xl p-2.5 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Read Materials */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-mono text-xs">2</span>
                Materiales de Capacitación
              </h2>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Revise la presentación explicativa y lea detenidamente las directrices de cumplimiento corporativo sobre el tratamiento legítimo de datos.
              </p>

              {materials?.presentation_url && materials.presentation_url.includes('google.com') ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 flex items-center justify-center text-slate-500">
                  <div className="text-center p-4 space-y-2">
                    <BookOpen className="mx-auto text-slate-650" size={36} />
                    <p className="text-xs font-bold text-slate-400">Presentación Explicativa de Privacidad</p>
                    <p className="text-[10px] max-w-sm">Material multimedia interactivo. Por favor lea las directrices escritas a continuación.</p>
                  </div>
                </div>
              ) : null}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <h3 className="text-xs font-bold text-emerald-450 flex items-center gap-1.5">
                  <BookOpen size={13} />
                  Directrices Internas y Ley N° 21.719
                </h3>
                <pre className="text-xs text-slate-350 leading-relaxed font-sans whitespace-pre-wrap select-none text-left">
                  {materials?.policy_text}
                </pre>
              </div>
            </div>

            {/* Step 3: Interactive Quiz */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-mono text-xs">3</span>
                Cuestionario de Evaluación
              </h2>
              
              <div className="space-y-6">
                {QUIZ_QUESTIONS.map((q, qIndex) => (
                  <div key={qIndex} className="space-y-2.5 p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
                    <p className="text-xs font-bold text-white leading-relaxed">{q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIndex) => (
                        <div 
                          key={optIndex}
                          onClick={() => handleSelectAnswer(qIndex, optIndex)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${answers[qIndex] === optIndex ? 'bg-emerald-950/20 border-emerald-500 text-white' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900/30'}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${answers[qIndex] === optIndex ? 'border-emerald-500' : 'border-slate-600'}`}>
                            {answers[qIndex] === optIndex && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Declaration & Submit */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-mono text-xs">4</span>
                Declaración y Firma Electrónica
              </h2>
              
              <div 
                onClick={() => setDeclarationAccepted(!declarationAccepted)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${declarationAccepted ? 'bg-emerald-955/20 border-emerald-500 text-white' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'}`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${declarationAccepted ? 'border-emerald-500 bg-emerald-600 text-slate-950' : 'border-slate-600 bg-slate-950'}`}>
                  {declarationAccepted && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className="text-xs font-bold leading-relaxed">
                  Declaro haber leído la normativa de protección de datos, comprendido las directrices internas de la organización y me comprometo a cumplir el resguardo legal de la información.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition-all shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Procesando Certificación...</span>
                    </>
                  ) : (
                    <span>Enviar Cuestionario y Registrar Capacitación</span>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
