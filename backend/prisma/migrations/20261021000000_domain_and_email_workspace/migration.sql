-- AlterTable: add domain and email workspace fields to projects
ALTER TABLE "projects"
ADD COLUMN "domainName" TEXT,
ADD COLUMN "domainStatus" TEXT DEFAULT 'none',
ADD COLUMN "domainProvider" TEXT,
ADD COLUMN "domainRegisteredAt" TIMESTAMP(3),
ADD COLUMN "emailStatus" TEXT DEFAULT 'none',
ADD COLUMN "emailUsers" JSONB;
