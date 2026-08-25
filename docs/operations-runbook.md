# Operación y despliegue

## Objetivo

Este procedimiento separa la validación técnica del despliegue de la evaluación jurídica. Un despliegue saludable confirma disponibilidad, conectividad e aislamiento básico de rutas. No certifica cumplimiento de la Ley 21.719.

## Dependencias obligatorias

El backend de producción requiere `DATABASE_URL`, `JWT_SECRET` de al menos 32 caracteres, `REDIS_URL`, `DASHBOARD_ORIGIN` y `NODE_ENV=production`. PostgreSQL conserva el expediente y Redis coordina el límite de solicitudes entre instancias.

No se deben compartir PostgreSQL ni Redis entre staging y producción. Si se comparte Redis temporalmente, los límites de solicitudes de ambos ambientes se interfieren y staging puede afectar disponibilidad productiva. La instancia gratuita sin persistencia tampoco es un registro de auditoría.

## Previo al despliegue

1. Ejecutar `npm ci`, `npm run build`, `npm test` y `npm run test:operations`.
2. Ejecutar `bash scripts/test-tenant-migration.sh` con PostgreSQL disponible.
3. Confirmar que el commit a desplegar es el aprobado por CI.
4. Crear respaldo verificable de PostgreSQL y registrar su identificador, fecha, responsable y procedimiento de restauración probado.
5. Confirmar que producción tiene almacenamiento, Redis y secretos propios.

El arranque ejecuta únicamente migraciones versionadas. La migración 001 representa el esquema heredado de forma aditiva y permite inicializar una base vacía o registrar esa base sobre una instalación anterior sin borrar filas. Los cambios futuros de esquema deben añadirse como un archivo SQL nuevo y nunca incorporarse a `initDb`.

RLS tampoco está activo en producción por diseño: la migración 005 instala políticas, pero el archivo 006 de activación es sólo un ejemplo y las rutas no abren transacciones con `SET LOCAL app.organization_id`. Las rutas nuevas filtran por organización en la aplicación, pero la base de datos aún no constituye una segunda barrera ante una consulta defectuosa. No se debe declarar aislamiento multiempresa completo hasta migrar todas las consultas, usar un rol PostgreSQL no propietario y activar RLS con una prueba de regresión por ruta.

La adopción segura de RLS se realiza por etapas. Primero, cada operación empresarial debe usar `withOrganizationTransaction`, que abre una transacción en un único cliente PostgreSQL y establece el contexto local resuelto desde la membresía autenticada. Segundo, las pruebas deben cubrir lectura y escritura de cada ruta con dos organizaciones. Tercero, se comprueba que no existan filas empresariales sin `organization_id`. Cuarto, se configura un rol de aplicación no propietario y un rol separado para migraciones. Sólo entonces se revisa y ejecuta 006, primero en staging y después en producción. La activación no debe automatizarse mientras quede una ruta incompatible.

## Verificación posterior

La comprobación es de solo lectura y no crea empresas ni expedientes:

```bash
VERIFY_API_URL=https://api.example.cl \
VERIFY_DASHBOARD_URL=https://app.example.cl \
npm run verify:deployment
```

Comprueba salud, CORS, carga del frontend y que rutas empresariales rechacen acceso sin token. Después se debe ejecutar el flujo E2E únicamente en staging, nunca en producción.

## Registros que deben conservarse

Para cada despliegue se debe conservar commit, ejecución CI, despliegue Render, migraciones aplicadas, operador, hora, resultado del smoke test, respaldo previo e incidentes. Para la operación del servicio también se requieren retención definida, exportación, restauración, rectificación y eliminación trazable de expedientes, evidencias, solicitudes de derechos, consentimientos, incidentes y versiones documentales.

`schema_migrations` prueba qué scripts fueron aplicados, pero no reemplaza un historial de cambios de cada registro ni prueba la integridad de evidencias. Las tablas operativas deben incorporar actor, organización, fecha y motivo de cada cambio, con eventos inmutables o un historial equivalente.

## Condiciones para detener un despliegue

Detener si falla CI, falta una variable obligatoria, el respaldo no es verificable, aparece una migración no registrada, `/health` no responde `ok`, CORS no autoriza exactamente el dashboard o una ruta protegida responde sin autenticación. No revertir una migración destructivamente: mantener la versión anterior disponible y aplicar una migración correctiva revisada.
