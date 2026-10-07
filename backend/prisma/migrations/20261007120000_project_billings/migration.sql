-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_billings" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "retainageAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retainagePercent" DECIMAL(5,2),
    "netAmount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "bankId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retainage_releases" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retainage_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_code_key" ON "banks"("code");

-- CreateIndex
CREATE INDEX "project_billings_companyId_dueDate_idx" ON "project_billings"("companyId", "dueDate");

-- CreateIndex
CREATE INDEX "project_billings_companyId_paymentDate_idx" ON "project_billings"("companyId", "paymentDate");

-- CreateIndex
CREATE INDEX "project_billings_projectId_idx" ON "project_billings"("projectId");

-- CreateIndex
CREATE INDEX "project_billings_bankId_idx" ON "project_billings"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "project_billings_companyId_number_key" ON "project_billings"("companyId", "number");

-- CreateIndex
CREATE INDEX "retainage_releases_projectId_companyId_idx" ON "retainage_releases"("projectId", "companyId");

-- CreateIndex
CREATE INDEX "retainage_releases_companyId_returnDate_idx" ON "retainage_releases"("companyId", "returnDate");

-- CreateIndex
CREATE INDEX "retainage_releases_bankId_idx" ON "retainage_releases"("bankId");

-- AddForeignKey
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retainage_releases" ADD CONSTRAINT "retainage_releases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retainage_releases" ADD CONSTRAINT "retainage_releases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retainage_releases" ADD CONSTRAINT "retainage_releases_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_retainage_range" CHECK ("retainageAmount" >= 0 AND "retainageAmount" < "amount");
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_net_amount" CHECK ("netAmount" = "amount" - "retainageAmount");
ALTER TABLE "project_billings" ADD CONSTRAINT "project_billings_payment_with_bank" CHECK (("paymentDate" IS NULL) = ("bankId" IS NULL));
ALTER TABLE "retainage_releases" ADD CONSTRAINT "retainage_releases_amount_positive" CHECK ("amount" > 0);

INSERT INTO "banks" ("id", "name", "code") VALUES
    ('bank_341', 'Itaú', '341'),
    ('bank_001', 'Banco do Brasil', '001'),
    ('bank_033', 'Santander', '033')
ON CONFLICT ("code") DO NOTHING;
