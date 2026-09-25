ALTER TABLE "receivables" ADD COLUMN     "competence" TIMESTAMP(3),
ADD COLUMN     "grossAmount" DECIMAL(12,2),
ADD COLUMN     "netAmount" DECIMAL(12,2),
ADD COLUMN     "number" TEXT;

UPDATE "receivables"
   SET "competence" = date_trunc('month', "issueDate"),
       "grossAmount" = "amount",
       "netAmount" = "amount";

ALTER TABLE "receivables" ALTER COLUMN "competence" SET NOT NULL,
ALTER COLUMN "grossAmount" SET NOT NULL,
ALTER COLUMN "netAmount" SET NOT NULL;

CREATE TABLE "receivable_withholdings" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_withholdings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "receivable_withholdings_receivableId_type_key" ON "receivable_withholdings"("receivableId", "type");

CREATE INDEX "receivables_companyId_competence_idx" ON "receivables"("companyId", "competence");

CREATE UNIQUE INDEX "receivables_companyId_number_key" ON "receivables"("companyId", "number");

ALTER TABLE "receivable_withholdings" ADD CONSTRAINT "receivable_withholdings_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
