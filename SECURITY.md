# Seguridad

## Reporte responsable

No publique credenciales, datos personales ni detalles explotables en un issue
público. Use el canal privado definido por la organización operadora antes de
habilitar producción.

## Despliegue

- Use secretos aleatorios y distintos por ambiente.
- Restrinja los orígenes CORS a dominios conocidos.
- Valide el certificado TLS de PostgreSQL.
- Ejecute la aplicación con un rol de base de datos sin privilegios de esquema.
- Aplique migraciones con un rol separado y controlado.
- Active aislamiento por organización y pruebe accesos cruzados.
- Deshabilite rutas de prueba, datos de demostración y logs sensibles.
- Configure límites de solicitudes, observabilidad y alertas.

## Alcance jurídico

Un resultado automatizado no equivale a certificación jurídica. Las
interpretaciones, políticas y contratos requieren información confirmada,
revisión humana, aprobación y conservación de evidencia.
