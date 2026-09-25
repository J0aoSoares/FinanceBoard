ALTER TABLE "bills" ADD COLUMN     "description" TEXT,
ADD COLUMN     "digitableLine" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "installmentLabel" TEXT,
ADD COLUMN     "installmentNumber" INTEGER;

UPDATE "bills" SET "description" = "documentNumber";

ALTER TABLE "bills" ALTER COLUMN "description" SET NOT NULL;

CREATE TABLE "bill_groups" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bills_groupId_installmentLabel_key" ON "bills"("groupId", "installmentLabel");

ALTER TABLE "bills" ADD CONSTRAINT "bills_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "bill_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
