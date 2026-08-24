export interface TransactionClient {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

export async function provisionOrganizationForUser(
  client: TransactionClient,
  userId: string,
  companyName: string
): Promise<string> {
  const organization = await client.query(
    `INSERT INTO organizations (name, legal_name, slug, created_by)
     VALUES ($1, $1, $2, $3)
     RETURNING id`,
    [companyName, `org-${userId}`, userId]
  );
  const organizationId = organization.rows[0]?.id;
  if (!organizationId) throw new Error('Organization provisioning did not return an id.');

  const membership = await client.query(
    `INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
     VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
     RETURNING id`,
    [organizationId, userId]
  );
  const membershipId = membership.rows[0]?.id;
  if (!membershipId) throw new Error('Organization membership provisioning did not return an id.');

  await client.query(
    `INSERT INTO membership_roles (membership_id, role_id)
     SELECT $1, id FROM roles WHERE code = 'organization_owner'`,
    [membershipId]
  );
  await client.query(
    'UPDATE users SET default_organization_id = $1 WHERE id = $2',
    [organizationId, userId]
  );

  return organizationId;
}
