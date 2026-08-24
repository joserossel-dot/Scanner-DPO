-- Repair users created after the original tenancy backfill ran.
-- The migration is intentionally conservative: it never reactivates revoked or
-- suspended memberships and grants owner only for organizations created by the user.

INSERT INTO organizations (name, legal_name, slug, created_by)
SELECT u.company_name, u.company_name, 'repair-' || u.id::text, u.id
FROM users u
WHERE u.default_organization_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organization_memberships om
    WHERE om.user_id = u.id AND om.status = 'active'
  )
  AND NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.created_by = u.id
  )
ON CONFLICT (slug) DO NOTHING;

-- A creator owns the organization it provisioned. Add only missing memberships;
-- existing non-active memberships remain untouched because of the unique key.
INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
SELECT o.id, o.created_by, 'active', CURRENT_TIMESTAMP
FROM organizations o
WHERE o.created_by IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Select a stable active default. Prefer an organization created by the user,
-- then the oldest membership, so reruns always make the same choice.
UPDATE users u
SET default_organization_id = (
  SELECT om.organization_id
  FROM organization_memberships om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = u.id AND om.status = 'active'
  ORDER BY (o.created_by = u.id) DESC, om.created_at ASC, om.id ASC
  LIMIT 1
)
WHERE u.default_organization_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM organization_memberships om
    WHERE om.user_id = u.id AND om.status = 'active'
  );

-- Grant owner only on an active membership for an organization created by that
-- same user. This avoids privilege escalation in organizations owned by others.
INSERT INTO membership_roles (membership_id, role_id)
SELECT om.id, r.id
FROM organization_memberships om
JOIN organizations o
  ON o.id = om.organization_id AND o.created_by = om.user_id
JOIN roles r ON r.code = 'organization_owner'
WHERE om.status = 'active'
ON CONFLICT (membership_id, role_id) DO NOTHING;
