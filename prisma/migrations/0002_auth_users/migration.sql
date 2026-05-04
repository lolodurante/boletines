CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

ALTER TABLE "users"
  ADD COLUMN "auth_user_id" TEXT,
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");
CREATE INDEX "users_status_idx" ON "users"("status");
