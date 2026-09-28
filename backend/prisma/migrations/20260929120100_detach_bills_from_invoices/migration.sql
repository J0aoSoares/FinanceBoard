UPDATE "bills" AS b
   SET "dueDate" = i."dueDate",
       "status" = i."status",
       "paymentDate" = i."paymentDate",
       "invoiceId" = NULL
  FROM "invoices" AS i
 WHERE b."invoiceId" = i."id";
