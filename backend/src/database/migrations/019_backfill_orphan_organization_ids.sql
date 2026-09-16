-- Prerequisito para activar RLS (migración 006): ninguna tabla de tenant
-- puede tener filas con organization_id nulo, porque esas filas se vuelven
-- invisibles bajo cualquier política de aislamiento. Reutiliza exactamente
-- el mismo patrón de backfill que 005_organizations_and_tenant_isolation.sql.
--
-- Nota: ropa_inventory tenía filas nuevas naciendo con organization_id nulo
-- por un bug en backend/src/services/ropaDraftService.ts (createRopaDraft no
-- recibía ni insertaba organization_id). Ese bug se corrige en el mismo
-- commit que esta migración; esta migración solo repara los datos ya viejos.
UPDATE audit_reports t SET organization_id = u.default_organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE ropa_inventory t SET organization_id = u.default_organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

-- site_configs debe repararse antes que consent_logs y training_materials,
-- que dependen de su organization_id para el join por dominio.
UPDATE site_configs t SET organization_id = u.default_organization_id
  FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;

UPDATE consent_logs t SET organization_id = sc.organization_id
  FROM site_configs sc WHERE t.domain = sc.domain AND t.organization_id IS NULL;

UPDATE training_materials t SET organization_id = sc.organization_id
  FROM site_configs sc WHERE t.client_id = sc.domain AND t.organization_id IS NULL;

-- Cualquier fila que aún quede sin organization_id después de este backfill
-- (por ejemplo, un user_id huérfano cuyo dueño fue borrado) queda registrada
-- aquí para revisión manual en vez de fallar silenciosamente o bloquear la
-- migración.
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT
    (SELECT count(*) FROM audit_reports WHERE organization_id IS NULL) +
    (SELECT count(*) FROM consent_logs WHERE organization_id IS NULL) +
    (SELECT count(*) FROM ropa_inventory WHERE organization_id IS NULL) +
    (SELECT count(*) FROM site_configs WHERE organization_id IS NULL) +
    (SELECT count(*) FROM training_materials WHERE organization_id IS NULL)
  INTO remaining;

  IF remaining > 0 THEN
    RAISE WARNING 'Quedan % filas sin organization_id tras el backfill automático. Revisar manualmente antes de activar RLS (migración 006).', remaining;
  END IF;
END $$;
