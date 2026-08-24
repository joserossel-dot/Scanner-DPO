# Especificación del servicio paquetizado para pymes

## 1. Propósito

Esta especificación define el producto y el servicio profesional necesario para
implementar y administrar un programa básico de cumplimiento de protección de
datos para empresas de hasta 100 trabajadores sujetas a la Ley N° 21.719.

La oferta combina:

1. Una plataforma SaaS para recopilar información, mantener registros, generar
   borradores, controlar tareas y conservar evidencias.
2. Una implementación inicial guiada.
3. Revisión y aprobación por abogado o DPO antes de entregar documentos.
4. Administración durante 12 meses, incluyendo la gestión de solicitudes
   ARCO+ y consultas de privacidad.

La plataforma apoya y documenta el cumplimiento. No sustituye la información
que debe entregar la empresa, la ejecución de controles dentro de sus sistemas
ni las decisiones jurídicas que requieren revisión profesional.

## 2. Cliente objetivo y admisibilidad

### 2.1 Perfil estándar

El paquete estándar está dirigido a una persona jurídica que:

- tenga hasta 100 trabajadores;
- opere principalmente en Chile;
- mantenga procesos de tratamiento simples o moderados;
- designe un responsable interno con capacidad de coordinar áreas y entregar
  antecedentes;
- acepte completar cuestionarios, validar inventarios y aprobar documentos;
- pueda atender requerimientos internos dentro de los plazos definidos en el
  servicio.

### 2.2 Resultado de admisibilidad

El onboarding debe producir una de estas decisiones:

- `STANDARD`: admisible para el paquete estándar;
- `STANDARD_WITH_ADDON`: admisible con un complemento cotizado;
- `SPECIAL_ASSESSMENT`: requiere evaluación especializada;
- `NOT_ELIGIBLE`: no admisible bajo la oferta paquetizada.

La decisión debe conservar preguntas, respuestas, fecha, evaluador, razones y
versión de las reglas utilizadas.

### 2.3 Derivación obligatoria

Se requiere evaluación separada cuando exista uno o más de estos factores:

- prestación de servicios de salud;
- educación o tratamiento relevante de datos de niños, niñas o adolescentes;
- uso de biometría para identificación, acceso o vigilancia;
- actividad financiera, bancaria, de seguros o equivalente;
- perfilamiento intensivo o decisiones automatizadas con efectos relevantes;
- tratamiento masivo o sistemático de categorías especiales de datos;
- monitoreo sistemático de personas a gran escala;
- varias sociedades, países o modelos complejos de corresponsabilidad;
- infraestructura o integraciones que impidan obtener un inventario confiable
  mediante el proceso estándar;
- necesidad probable de una EIPD completa;
- incidentes activos, litigios o procedimientos ante autoridades.

La derivación no debe diagnosticarse únicamente por el escaneo web. Debe
considerar las respuestas empresariales y la revisión profesional.

## 3. Alcance del paquete

### 3.1 Implementación inicial

La implementación comprende:

1. Evaluación de admisibilidad.
2. Alta de la organización y de sus responsables.
3. Escaneo web preliminar con limitaciones visibles.
4. Cuestionarios guiados por área.
5. Inventario de procesos, sistemas, repositorios y proveedores.
6. Identificación de titulares, datos, finalidades, fuentes y destinatarios.
7. Construcción de flujos y RoPA.
8. Evaluación preliminar de licitud, retención, transferencias y riesgos.
9. Plan de adecuación con responsables, prioridades y fechas.
10. Generación del paquete documental desde información confirmada.
11. Revisión profesional y control de observaciones.
12. Aprobación por el representante o responsable designado por el cliente.
13. Configuración de CMP, ARCO+, incidentes y capacitación cuando aplique.
14. Entrega de documentos descargables y expediente inicial.

### 3.2 Paquete documental mínimo

Según aplicabilidad, el servicio debe producir:

- informe de diagnóstico y brechas;
- plan de adecuación;
- inventario y mapa simplificado de flujos;
- RoPA;
- matriz de bases de licitud;
- matriz de riesgos y controles;
- política de privacidad;
- política y aviso de cookies;
- política de retención, eliminación y anonimización;
- procedimiento ARCO+;
- procedimiento y playbook de incidentes;
- anexo laboral de protección de datos y confidencialidad;
- DPA para proveedores encargados;
- cláusulas para transferencias internacionales cuando correspondan;
- protocolo para categorías especiales cuando sea aplicable;
- plan y material de capacitación;
- acta o registro de revisión y aprobación profesional.

Cada documento debe registrar plantilla, versión normativa, datos de origen,
autor, revisor, aprobador, estado, vigencia, hash y versiones posteriores.

### 3.3 Documentos y firmas

El paquete entrega documentos descargables. La firma ocurre fuera de la
plataforma.

La plataforma debe permitir registrar para cada documento:

- estado `DRAFT`, `IN_REVIEW`, `APPROVED`, `DELIVERED`, `PENDING_SIGNATURE`,
  `SIGNED`, `REPLACED` o `EXPIRED`;
- fecha y responsable de la descarga;
- persona o contraparte a quien se envió;
- fecha de firma declarada;
- copia firmada cargada como evidencia;
- vigencia y próxima revisión.

Registrar un documento como firmado no equivale a verificar jurídicamente la
firma. Debe conservarse la evidencia aportada por el cliente.

## 4. Administración durante 12 meses

### 4.1 Operación mensual

- gestionar solicitudes ARCO+ y consultas de privacidad;
- controlar vencimientos, tareas y observaciones pendientes;
- revisar incidentes registrados y escalarlos al cliente;
- realizar seguimiento de anexos y evidencias faltantes;
- registrar nuevos tratamientos, sistemas o proveedores informados;
- emitir un resumen operativo para el responsable del cliente.

### 4.2 Revisión trimestral

- confirmar cambios en procesos, sistemas, bases y proveedores;
- revisar RoPA, flujos, transferencias y reglas de retención;
- verificar el avance del plan de adecuación;
- revisar el funcionamiento declarado del CMP;
- revisar responsables, permisos y contactos;
- actualizar el expediente de evidencias.

### 4.3 Revisión anual

- ejecutar un nuevo diagnóstico web;
- actualizar cuestionarios e inventarios;
- actualizar documentos afectados;
- realizar revisión profesional;
- ejecutar una campaña anual de capacitación;
- emitir informe anual y plan del siguiente período.

## 5. Servicio administrado ARCO+

### 5.1 Flujo obligatorio

```text
recepción
  -> acuse de recibo
  -> verificación de identidad
  -> clasificación y validación de alcance
  -> cálculo de plazo y prioridad
  -> solicitud de antecedentes a responsables internos
  -> consolidación y revisión
  -> aprobación del cliente cuando corresponda
  -> respuesta al titular
  -> ejecución confirmada por el cliente
  -> evidencias y cierre
```

### 5.2 Responsabilidad operacional

El equipo del servicio puede recibir, coordinar, preparar y responder
solicitudes dentro del mandato contratado. El cliente continúa siendo el
responsable del tratamiento y debe ejecutar búsquedas, rectificaciones,
bloqueos, eliminaciones o exportaciones dentro de sus propios sistemas, salvo
que exista una integración y autorización específica.

### 5.3 Expediente de una solicitud

Cada caso debe conservar:

- identidad y datos de contacto del solicitante;
- canal, fecha y contenido original;
- evidencias y resultado de la verificación de identidad;
- derecho ejercido, alcance y sistemas potencialmente involucrados;
- plazo legal e hitos internos;
- responsables y tareas por área;
- comunicaciones enviadas y recibidas;
- datos localizados y decisiones adoptadas;
- revisión profesional y aprobación requerida;
- respuesta final y evidencia de entrega;
- confirmación de acciones ejecutadas en sistemas;
- fecha, razón y responsable del cierre.

Los datos utilizados para verificar identidad deben minimizarse, protegerse y
conservarse conforme a una regla aprobada.

### 5.4 Escalamiento

Se deriva a atención especializada una solicitud que:

- involucre litigio, autoridad o conflicto material;
- afecte a un número significativo de titulares;
- requiera interpretar excepciones complejas;
- involucre datos sensibles, biometría o menores fuera del estándar;
- no pueda resolverse por falta de colaboración o acceso del cliente;
- requiera desarrollo o integración no contratada.

## 6. Responsabilidades

### 6.1 Proveedor del servicio

- mantener la plataforma y sus controles de acceso;
- facilitar onboarding, registros, documentos y evidencias;
- coordinar revisiones profesionales;
- administrar casos ARCO+ y consultas según mandato;
- mantener trazabilidad de actuaciones y comunicaciones;
- alertar sobre vencimientos y antecedentes faltantes;
- aplicar control de versiones normativas y documentales;
- proteger la información recibida y limitar accesos por función;
- devolver o eliminar información al terminar el servicio según contrato.

### 6.2 Cliente

- entregar información completa y correcta;
- designar representante, coordinador y responsables por área;
- validar inventarios, flujos, bases jurídicas y documentos;
- responder requerimientos internos dentro del SLA acordado;
- ejecutar medidas técnicas y cambios en sus sistemas;
- aprobar respuestas que requieran su decisión;
- firmar, distribuir y conservar documentos descargados;
- informar cambios, proveedores, incidentes y nuevos tratamientos;
- mantener accesos y controles internos adecuados.

### 6.3 Abogado o DPO revisor

- revisar conclusiones jurídicas y documentos aplicables;
- registrar observaciones y condiciones de aprobación;
- aprobar, rechazar o solicitar información adicional;
- derivar casos complejos fuera del paquete;
- mantener trazabilidad de la versión normativa utilizada.

## 7. Exclusiones

El paquete estándar no incluye:

- pentesting, investigación forense o contención técnica de incidentes;
- implementación de IAM, cifrado, respaldos o arquitectura de seguridad;
- descubrimiento directo dentro de bases de datos o repositorios internos;
- desarrollo de scripts de eliminación o anonimización;
- cambios en sistemas biométricos o sistemas core;
- firma electrónica o representación de validez de firmas;
- litigios, reclamaciones o representación ante autoridades;
- certificaciones, auditorías de certificación o garantías de resultado;
- integraciones personalizadas no incluidas expresamente;
- tratamientos complejos derivados durante admisibilidad o revisión.

Las exclusiones deben mostrarse en la propuesta, contrato, onboarding e informe
final, junto con las derivaciones recomendadas.

## 8. Trazabilidad de las 17 actividades

| ID | Actividad | Resultado del paquete | Automatización esperada | Intervención profesional o del cliente |
|---:|---|---|---|---|
| 1 | Diagnóstico inicial | Informe y plan de brechas | Escaneo, cuestionarios, consolidación | Validación empresarial y priorización profesional |
| 2 | Presupuesto y recursos | Plan de recursos y responsables | Plantilla y catálogo de acciones | Costos, aprobación y asignación del cliente |
| 3 | Flujos e inventario | Inventario, mapa y RoPA | Cuestionarios, plantillas y relaciones | Confirmación por áreas y responsables |
| 4 | Bases de licitud | Matriz razonada y aprobada | Sugerencias y controles de completitud | Revisión jurídica y aprobación |
| 5 | Consentimiento | CMP, configuración y registros | Widget, logs y pruebas técnicas | Instalación, contenidos y validación del cliente |
| 6 | Categorías especiales | Protocolo o derivación | Detección preliminar y reglas de admisibilidad | Revisión especializada y cambios en sistemas |
| 7 | Políticas y avisos | Documentos aprobados y publicados | Generación desde datos confirmados | Revisión, aprobación y publicación |
| 8 | ARCO+ | Canal, procedimiento y casos trazables | Intake, plazos, tareas y comunicaciones | Búsqueda y ejecución en sistemas del cliente |
| 9 | Retención y supresión | Política y matriz de retención | Catálogo, calendario y alertas | Ejecución y evidencia del cliente |
| 10 | Contratos laborales y RIOHS | Anexo laboral descargable | Generación y control de estado | Revisión, firma y trámites del cliente |
| 11 | Medidas técnicas | Evaluación básica y plan | Cuestionarios y observaciones web | Implementación, pruebas y certificación externa |
| 12 | Incidentes | Playbook, registro y borradores | Workflow, alertas y documentos | Contención, análisis y decisión del cliente |
| 13 | EIPD | Triage y derivación o evaluación simplificada | Cuestionario y umbrales versionados | Evaluación completa y aprobación profesional |
| 14 | Proveedores | Inventario y evaluación estándar | Cuestionarios, scoring y alertas | Evidencias y decisiones de compras/DPO |
| 15 | DPA | Anexos descargables y controlados | Generación desde proveedor y tratamiento | Negociación, revisión y firma |
| 16 | Transferencias | Registro, evaluación y cláusulas | Identificación, reglas y borradores | Validación jurídica y firma |
| 17 | Capacitación | Campaña, evaluación y evidencia | Contenido, quiz, alertas y reportes | Participación y seguimiento del cliente |

## 9. Modelo funcional objetivo

El núcleo debe mantener una única fuente empresarial confirmada:

```text
organization
  -> legal_entity_and_contacts
  -> business_unit
  -> person_role_and_responsibility
  -> business_process
     -> processing_activity
        -> data_subject_category
        -> personal_data_category
        -> data_source
        -> purpose
        -> legal_basis_assessment
        -> system_repository_or_database
        -> internal_recipient
        -> processor_or_provider
        -> international_transfer
        -> retention_and_deletion_rule
        -> risk_and_control
        -> evidence
        -> review_and_approval
```

Los documentos, solicitudes, incidentes, consentimientos, capacitaciones,
tareas y revisiones deben referenciar estas entidades. No deben conservar
copias independientes y divergentes de los mismos datos.

### 9.1 Entidades adicionales requeridas

- `service_engagement`: implementación y período administrado;
- `eligibility_assessment`: admisibilidad y derivaciones;
- `task`: responsable, SLA, dependencia, prioridad y evidencia;
- `evidence`: origen, fecha, integridad, vigencia y acceso;
- `review`: revisor, decisión, observaciones y versión;
- `document`: tipo, plantilla, estado, aprobación y vigencia;
- `document_signature_status`: contraparte, estado y evidencia aportada;
- `data_subject_request`: expediente ARCO+;
- `consultation`: consulta, respuesta y fundamento;
- `vendor_assessment`: cuestionario, evidencia, riesgo y decisión;
- `training_campaign`: población, asignación, resultado y certificado;
- `periodic_review`: mensual, trimestral o anual;
- `regulatory_rule`: fuente, artículo, vigencia, interpretación y aprobador.

## 10. Roles y permisos mínimos

- `client_representative`: aprueba entregables y respuestas relevantes;
- `client_coordinator`: coordina áreas y antecedentes;
- `process_owner`: confirma procesos y ejecuta tareas;
- `client_technical_owner`: ejecuta acciones en sistemas;
- `service_consultant`: administra onboarding, tareas y revisiones;
- `legal_reviewer`: revisa y aprueba contenido jurídico;
- `arco_operator`: gestiona solicitudes y comunicaciones;
- `security_incident_manager`: opera el registro de incidentes;
- `platform_admin`: administra la plataforma sin acceso empresarial por
  defecto.

Los permisos deben aplicarse por organización y por función. Toda acción
relevante debe conservar actor, organización, fecha, operación y resultado.

## 11. Estados del servicio

```text
LEAD
  -> ELIGIBILITY_REVIEW
  -> ACCEPTED | SPECIAL_ASSESSMENT | REJECTED
  -> ONBOARDING
  -> DISCOVERY
  -> VALIDATION
  -> REMEDIATION_PLAN
  -> DOCUMENT_REVIEW
  -> CLIENT_APPROVAL
  -> INITIAL_DELIVERY
  -> MANAGED_SERVICE_ACTIVE
  -> ANNUAL_REVIEW
  -> RENEWED | CLOSED
```

No se debe declarar completada una etapa mientras existan campos críticos sin
confirmar, revisiones obligatorias pendientes o derivaciones sin resolver.

## 12. Roadmap de implementación

### P0. Producto mínimo vendible

1. Evaluación versionada de admisibilidad.
2. Perfil completo de organización, responsables y áreas.
3. Núcleo de procesos, sistemas, datos, proveedores y flujos.
4. Migración del RoPA actual al núcleo empresarial.
5. Tareas, responsables, fechas, evidencias y aprobaciones.
6. Workflow ARCO+ administrado.
7. Repositorio documental por organización.
8. Generadores faltantes: anexo laboral, retención, ARCO+ e incidentes.
9. Panel de consultor y revisor profesional.
10. Calendario mensual, trimestral y anual.
11. Expediente exportable.
12. Pruebas de aislamiento, permisos y trazabilidad.

### P1. Operación repetible

1. Inventario y evaluación de proveedores.
2. Campañas, asignaciones y certificados de capacitación.
3. Control de documentos pendientes de firma.
4. Triage de EIPD y derivación.
5. Alertas, recordatorios y escalamiento.
6. Plantillas por actividad empresarial.
7. Revisiones trimestrales guiadas.
8. Reporte ejecutivo y métricas del servicio.

### P2. Automatización e integraciones

1. Escaneo web con navegador real y evidencia antes/después del consentimiento.
2. Instalación y verificación automatizada del CMP.
3. Integraciones con correo, CMS y almacenamiento documental.
4. Conectores opcionales para sistemas empresariales.
5. Firma electrónica como complemento, no como requisito del paquete inicial.
6. Integraciones de incidentes y ticketing.

## 13. Criterios de aceptación del P0

El producto mínimo vendible se considera listo solo si:

1. Una empresa admisible puede completar onboarding sin intervención técnica.
2. Toda empresa queda aislada por organización y los permisos se prueban.
3. Cada tratamiento conecta responsables, sistemas, datos, finalidad, licitud,
   proveedores, retención, riesgo y evidencia.
4. Ningún documento se entrega como aprobado sin revisión profesional
   registrada.
5. Los documentos se regeneran desde datos confirmados y conservan versiones.
6. Un caso ARCO+ puede recorrer el flujo completo con tareas, comunicaciones,
   aprobación, respuesta y cierre.
7. La plataforma identifica y deriva casos fuera del paquete.
8. El calendario genera las actividades de los 12 meses.
9. El expediente exportado identifica documentos, versiones, responsables,
   aprobaciones, tareas y evidencias.
10. Las limitaciones técnicas y jurídicas permanecen visibles en diagnósticos y
    documentos.
11. Existen pruebas automatizadas del flujo empresarial y de los casos de
    aislamiento más relevantes.
12. No quedan reglas jurídicas críticas codificadas sin fuente, vigencia,
    versión y responsable de revisión.

## 14. Indicadores del servicio

Los indicadores deben medir operación y trazabilidad, no prometer cumplimiento
jurídico automático:

- porcentaje de inventario confirmado;
- tratamientos con responsable, licitud, retención y evidencia completa;
- documentos revisados, aprobados, entregados y pendientes de firma;
- solicitudes ARCO+ abiertas, dentro de plazo, escaladas y cerradas;
- tiempo de respuesta interno por área;
- tareas vencidas y bloqueadas;
- proveedores evaluados y pendientes;
- colaboradores asignados, capacitados y aprobados;
- revisiones mensuales, trimestrales y anuales ejecutadas;
- cambios materiales incorporados al expediente.

## 15. Condiciones de salida y renovación

Al concluir los 12 meses se debe:

1. cerrar o transferir casos activos;
2. emitir un informe anual;
3. entregar el expediente exportable;
4. documentar pendientes y riesgos aceptados;
5. definir devolución, conservación o eliminación de información;
6. registrar renovación, cierre o transición a otro proveedor.

La renovación debe iniciar una nueva revisión anual y conservar la trazabilidad
de períodos anteriores.
