ALTER TABLE "Workspace" ALTER COLUMN "status" SET DEFAULT 'FREE';
UPDATE "Workspace" SET "status" = 'ACTIVE' WHERE "status" IS NULL;