CREATE FUNCTION "pg_temp"."supplier_name_key"(value TEXT) RETURNS TEXT AS $$
  SELECT lower(btrim(regexp_replace(
    translate(
      value,
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝýÿ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy'
    ),
    '\s+', ' ', 'g'
  )))
$$ LANGUAGE SQL IMMUTABLE;

DO $$
DECLARE
  duplicates TEXT;
BEGIN
  SELECT string_agg(names, '; ')
    INTO duplicates
    FROM (
      SELECT string_agg(format('"%s"', "name"), ', ' ORDER BY "name") AS names
        FROM "suppliers"
       GROUP BY "pg_temp"."supplier_name_key"("name")
      HAVING count(*) > 1
    ) AS grouped;

  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Fornecedores duplicados impedem a migração. Unifique-os antes de continuar: %', duplicates;
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "nameKey" TEXT;

UPDATE "suppliers"
   SET "name" = btrim("name"),
       "nameKey" = "pg_temp"."supplier_name_key"("name");

ALTER TABLE "suppliers" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_nameKey_key" ON "suppliers"("nameKey");
