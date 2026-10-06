-- A NF pode chegar depois do boleto: número e emissão da NF passam a ser opcionais.
ALTER TABLE "bills" ALTER COLUMN "documentNumber" DROP NOT NULL;
ALTER TABLE "bills" ALTER COLUMN "issueDate" DROP NOT NULL;
