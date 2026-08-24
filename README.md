# Scanner DPO

Scanner DPO es una plataforma de apoyo para descubrir, documentar y gestionar
tratamientos de datos personales en organizaciones sujetas a la normativa
chilena. Combina observaciones automatizadas de sitios web con información
declarada y revisada por responsables de la organización.

## Alcance del producto

La plataforma busca cubrir progresivamente:

1. Descubrimiento técnico del sitio web.
2. Inventario de organizaciones, procesos, sistemas, proveedores y datos.
3. Mapa de actividades y flujos de tratamiento.
4. Registro de actividades de tratamiento (RoPA).
5. Evaluación de riesgos y planes de remediación.
6. Gestión de derechos, consentimientos, incidentes y transferencias.
7. Generación, revisión, aprobación y versionado de documentos.
8. Expediente de evidencias y revisiones periódicas.

## Limitaciones importantes

El escaneo web es una observación técnica automatizada. Por sí solo no determina
la licitud de un tratamiento ni acredita el cumplimiento integral de una
organización. Las conclusiones jurídicas y los documentos generados deben ser
revisados y aprobados por personas autorizadas con información empresarial
confirmada.

El crawler actual procesa HTML estático. No ejecuta JavaScript ni observa por sí
solo el comportamiento completo de cookies, almacenamiento o solicitudes de red
antes y después de las decisiones de consentimiento.

## Estructura

- `backend`: API Express, servicios de diagnóstico y PostgreSQL.
- `frontend`: aplicación React para administración y operación.
- `widget`: componente CMP instalable en sitios de clientes.
- `scratch`: verificaciones históricas no consideradas una suite oficial.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- PostgreSQL compatible con `pg`.

## Configuración local

Copie `.env.example` como `.env` y complete las variables requeridas. Nunca
almacene secretos reales en el repositorio.

```sh
npm ci
npm run build
npm test
```

Para desarrollo:

```sh
npm run dev:backend
npm run dev:frontend
npm run dev:widget
```

## Criterios de seguridad

- Ningún correo concede privilegios administrativos automáticamente.
- Toda información empresarial debe quedar asociada a una organización.
- Las rutas privadas deben validar autenticación, membresía y permisos.
- Las migraciones de esquema deben ser explícitas, versionadas e idempotentes.
- Los diagnósticos deben separar observación, evidencia e interpretación.
- Los cambios regulatorios deben gestionarse mediante reglas versionadas.

Consulte [SECURITY.md](SECURITY.md) antes de desplegar o reportar una
vulnerabilidad.
