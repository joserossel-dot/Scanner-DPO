-- Adds mandatory email verification to user registration. Without this,
-- anyone can register with an email address they do not own (including a
-- third party's corporate domain), since no confirmation step exists.
--
-- is_verified gates login (see backend/src/routes/auth.ts): accounts with
-- is_verified = FALSE cannot authenticate until they click the link sent to
-- verification_token. superadmin accounts are exempt since they are
-- provisioned directly by an operator, outside the public registration flow.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token)
  WHERE verification_token IS NOT NULL;

-- Accounts that existed before this migration were created without any
-- verification step; do not retroactively lock them out.
UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE;
