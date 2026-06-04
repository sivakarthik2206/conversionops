-- Add FREE and TRIAL to WorkspaceStatus enum
-- PostgreSQL requires creating a new type and migrating data

-- Add new enum values (PostgreSQL allows adding to enum)
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'TRIAL';

-- Update default for Workspace.status to FREE
ALTER TABLE "Workspace" ALTER COLUMN "status" SET DEFAULT 'FREE';

-- Rename stripeCustomerId/stripeSubscriptionId column aliases for Paddle
-- (keeping same column names to avoid data migration, adding comments instead)
COMMENT ON COLUMN "Workspace"."stripeCustomerId" IS 'Reused for Paddle customer ID';
COMMENT ON COLUMN "Workspace"."stripeSubscriptionId" IS 'Reused for Paddle subscription ID';
