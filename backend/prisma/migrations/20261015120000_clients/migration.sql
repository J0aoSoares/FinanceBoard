-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('ENGINEER', 'FINANCE', 'PURCHASING', 'ADMINISTRATIVE', 'OTHER');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "referenceContactId" TEXT,
ALTER COLUMN "clientName" DROP NOT NULL;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "personType" "PersonType" NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" TEXT,
    "municipalRegistration" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "streetNumber" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "ContactRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_key" ON "clients"("document");

-- CreateIndex
CREATE INDEX "clients_nameKey_idx" ON "clients"("nameKey");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_referenceContactId_fkey" FOREIGN KEY ("referenceContactId") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_phone_or_email" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);
CREATE UNIQUE INDEX "client_contacts_primary_per_role" ON "client_contacts"("clientId", "role") WHERE "isPrimary";
