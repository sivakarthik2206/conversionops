-- Add new enum values only (no usage in same transaction - PostgreSQL limitation)
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "WorkspaceStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
