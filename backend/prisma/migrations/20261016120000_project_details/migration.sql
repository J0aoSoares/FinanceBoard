-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "details" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "expectedEndDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "zipCode" TEXT;

