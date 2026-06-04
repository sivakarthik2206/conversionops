-- Set workspace status default now that enum values are committed
ALTER TABLE "Workspace" ALTER COLUMN "status" SET DEFAULT 'FREE';

-- Update any existing rows with NULL status
UPDATE "Workspace" SET "status" = 'ACTIVE' WHERE "status" IS NULL OR "status" = '';
