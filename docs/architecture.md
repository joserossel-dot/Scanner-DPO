# Arquitectura objetivo

## Principios

1. La organización es la frontera de aislamiento, no el usuario.
2. Un tratamiento confirmado es la fuente central de diagnósticos y documentos.
3. Una observación automatizada no es una conclusión jurídica.
4. Toda conclusión debe apuntar a evidencia, regla, versión y aprobador.
5. Los cambios de esquema y normativa son explícitos y versionados.

## Núcleo de dominio

```text
organization
  organization_membership
  business_unit
  person_and_role
  business_process
    processing_activity
      data_subject_category
      personal_data_category
      data_source
      processing_purpose
      legal_basis_assessment
      system_or_repository
      recipient_or_processor
      international_transfer
      retention_and_deletion_rule
      risk_and_control
      evidence
      review_and_approval
```

Los módulos de políticas, contratos, solicitudes, incidentes, consentimientos y
capacitación deben referenciar estas entidades. No deben mantener copias
divergentes de la misma información empresarial.

## Canal de diagnóstico

```text
captura -> observación -> evidencia -> información pendiente
        -> regla normativa versionada -> interpretación preliminar
        -> revisión humana -> conclusión aprobada -> tarea o documento
```

Cada ejecución debe conservar URL, fecha, método, limitaciones, páginas
visitadas, artefactos capturados y versión del motor.

## Separación operacional

- El rol de migración administra el esquema.
- El rol de aplicación opera con privilegios mínimos y aislamiento activo.
- Las rutas validan autenticación, organización, membresía y permiso.
- Los trabajos de escaneo operan fuera del proceso HTTP cuando aumente su carga.
- Los documentos publicados son versiones aprobadas, no salidas temporales.
