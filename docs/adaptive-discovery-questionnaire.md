# Cuestionario adaptativo de descubrimiento empresarial

## Objetivo

Obtener los hechos necesarios para construir el inventario de tratamientos y evaluar brechas sin exigir que el cliente conozca conceptos jurídicos o técnicos. El sistema pregunta cómo trabaja la empresa y transforma las respuestas en borradores de procesos, flujos, tareas y evidencia pendiente.

El cuestionario no determina por sí solo que una base de licitud es correcta ni que la empresa cumple. Propone candidatos y exige confirmación y evidencia antes de aprobar entregables.

## Principios de experiencia

1. Preguntar por actividades conocidas, no por artículos o bases jurídicas.
2. Mostrar una pregunta principal por pantalla y el motivo de la pregunta.
3. Ofrecer siempre `Sí`, `No`, `No sé` y, cuando corresponda, `No aplica`.
4. Convertir `No sé` en una tarea dirigida al área o responsable adecuado.
5. Reutilizar organización, trabajadores, industria, responsables, sistemas y proveedores ya informados.
6. Autocompletar hallazgos del escáner web, sin convertirlos en hechos confirmados.
7. Separar `declarado por cliente`, `detectado automáticamente`, `inferido`, `confirmado` y `respaldado por evidencia`.
8. Pedir detalles adicionales sólo cuando una respuesta activa una rama relevante.
9. Permitir guardar, delegar una sección y continuar después.
10. Mostrar cobertura y pendientes, no una certificación automática.

## Etapa 1: contexto de la empresa

| Pregunta en lenguaje cotidiano | Resultado estructurado | Uso posterior |
|---|---|---|
| ¿Qué vende o qué servicios presta? | industria, productos y finalidades principales | alcance, plantillas y procesos sugeridos |
| ¿Cuántas personas trabajan y en cuántas ubicaciones? | trabajadores, unidades, ubicaciones | alcance y responsables por área |
| ¿Atienden personas en Chile, otros países o ambos? | ámbito territorial y países | aplicabilidad y transferencias |
| ¿Sus clientes son personas, empresas o ambos? | categorías de titulares | avisos, derechos y RoPA |
| ¿Trabajan habitualmente con niños o adolescentes? | activador de categoría especial | rama reforzada y evaluación separada |
| ¿Existe una persona que coordine privacidad, tecnología y solicitudes de clientes? | responsables y brechas de gobierno | política, tareas y aprobaciones |

## Etapa 2: selección de actividades cotidianas

El cliente selecciona tarjetas que describen su operación:

- Buscar y contratar trabajadores.
- Pagar remuneraciones y administrar beneficios.
- Controlar asistencia, acceso o seguridad.
- Captar interesados y hacer marketing.
- Vender, contratar y cobrar.
- Emitir facturas y llevar contabilidad.
- Prestar el servicio o entregar el producto.
- Atender consultas, reclamos y garantías.
- Grabar llamadas, reuniones o videovigilancia.
- Administrar proveedores y trabajadores externos.
- Operar sitio web, tienda, aplicación o redes sociales.
- Crear cuentas, perfiles o programas de fidelización.
- Evaluar crédito, riesgo, fraude o comportamiento.
- Realizar estudios, estadísticas o analítica.
- Otra actividad que use información sobre personas.

Cada tarjeta seleccionada crea un borrador de actividad de tratamiento. Las no seleccionadas se conservan como `no declaradas`, no como inexistentes.

## Etapa 3: microcuestionario por actividad

### Personas y datos

- ¿Sobre qué personas se guarda información?
- ¿Qué información se utiliza? Se ofrecen ejemplos contextualizados y búsqueda.
- ¿Incluye salud, biometría, menores, geolocalización, situación económica, afiliación sindical, origen étnico, opiniones políticas, creencias, vida sexual, orientación o identidad de género?
- ¿Se crean perfiles, puntajes o decisiones automáticas que puedan afectar a la persona?

### Origen y finalidad

- ¿La información la entrega la persona, la genera la empresa, llega desde un proveedor o se obtiene de una fuente pública?
- ¿Para qué se usa concretamente?
- ¿Se usa después para algo distinto a lo informado inicialmente?
- ¿Qué ocurriría si la persona no entrega esos datos?

La respuesta a la última pregunta ayuda a proponer contrato o medida precontractual, obligación legal, interés legítimo o consentimiento como candidato. La decisión jurídica permanece pendiente de revisión.

### Herramientas y acceso

- ¿Dónde se registra o guarda? Ejemplos: planilla, correo, archivador, software, nube, teléfono o aplicación.
- ¿Qué equipos o áreas pueden verlo o modificarlo?
- ¿Se comparte con contadores, proveedores tecnológicos, empresas relacionadas, bancos, aseguradoras, organismos públicos u otros terceros?
- ¿Algún proveedor o servidor está fuera de Chile?

### Conservación y eliminación

- ¿Cuándo deja de ser necesario?
- ¿Existe obligación legal, contrato, garantía, juicio o deuda que obligue a conservarlo?
- ¿Qué sucede después: eliminación, anonimización, bloqueo, archivo o no se sabe?
- ¿También se elimina de respaldos, correos, planillas y proveedores?

### Seguridad y evidencia

- ¿Quién autoriza accesos y quién los retira?
- ¿Usan cuentas individuales, doble factor, cifrado, respaldos y registro de accesos?
- ¿Cómo informan pérdidas, envíos equivocados o accesos no autorizados?
- ¿Qué documento o registro permite comprobar la respuesta?

## Etapa 4: ramas de mayor riesgo

| Activador | Preguntas adicionales mínimas |
|---|---|
| Salud o perfil biológico | finalidad sanitaria o excepción aplicable, fuente, acceso restringido, prohibiciones sectoriales, evidencia |
| Biometría | sistema usado, finalidad específica, duración, derechos, alternativa disponible, consentimiento o excepción |
| Niños y adolescentes | edades, representante, autorización, interés superior, contenido dirigido a menores, medidas reforzadas |
| Geolocalización | precisión, frecuencia, finalidad, duración, tercero receptor, información entregada al titular |
| Situación económica, financiera o comercial | fuente, exactitud, actualización, prescripción, comunicación a terceros y eliminación automática |
| Perfilamiento o decisiones automatizadas | lógica general, datos utilizados, efecto para la persona, revisión humana, posibilidad de impugnar |
| Videovigilancia o grabaciones | zonas o canales, audio, finalidad, señalización o aviso, acceso, plazo y entrega a terceros |
| Transferencia internacional | proveedor, países, servicio, categorías de datos, mecanismo, salvaguardas, subencargados y ubicación de respaldos |
| Tratamiento masivo o monitoreo sistemático | volumen, frecuencia, alcance, combinación de fuentes, impacto y necesidad de evaluación separada |

## Etapa 5: validación colaborativa

El cliente recibe una ficha por actividad con lenguaje simple:

- Qué personas aparecen.
- Qué datos se utilizan.
- Para qué se utilizan.
- De dónde vienen.
- En qué herramientas están.
- Quién accede.
- Con quién se comparten y en qué países.
- Cuánto tiempo se conservan y cómo se eliminan.
- Responsable del proceso y responsable técnico.
- Base de licitud propuesta, con explicación y estado pendiente.
- Controles y evidencia disponibles.
- Preguntas sin respuesta y tareas asignadas.

La actividad sólo pasa a `confirmada` cuando están completos los hechos mínimos, el dueño del proceso valida su operación y las conclusiones jurídicas requeridas han sido revisadas.

## Matriz de reutilización

| Información confirmada | Destinos automáticos |
|---|---|
| Organización y contacto | políticas, avisos, anexos, canal de derechos y dossier |
| Personas, datos, finalidad y origen | RoPA, aviso de privacidad, respuesta de acceso y evaluación de minimización |
| Base y racional | matriz de licitud, avisos, registro de consentimiento y revisión legal |
| Sistemas y accesos | mapa de flujo, seguridad, incidentes, derechos y eliminación |
| Proveedores, países y transferencias | anexos de encargados, transferencias y plan contractual |
| Conservación y eliminación | política, calendario y evidencia de eliminación |
| Riesgos y controles | matriz de riesgos, evaluación de impacto y plan de implementación |
| Responsables y evidencia | tareas, aprobaciones, expediente y revisión periódica |

## Criterio de mínima fricción

La primera sesión debe poder completarse en 20 a 30 minutos y producir un mapa preliminar. El detalle se obtiene después mediante ramas, delegación por área, importación de proveedores y sistemas, revisión de documentos y confirmación profesional. No se debe obligar a una persona a responder de una sola vez preguntas que pertenecen a Recursos Humanos, Finanzas, Operaciones y Tecnología.

## Fuentes oficiales

- Ley 21.719, publicada el 13 de diciembre de 2024 y con vigencia diferida al 1 de diciembre de 2026.
- Ley 19.628, texto con modificaciones y vigencia diferida al 1 de diciembre de 2026.

Estas fuentes deben mantenerse en el catálogo normativo versionado. Las reglas derivadas quedan sujetas a revisión cuando la Agencia emita instrucciones generales o cambie la normativa aplicable.
