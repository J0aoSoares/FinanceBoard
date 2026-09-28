CREATE FUNCTION "pg_temp"."project_name_key"(value TEXT) RETURNS TEXT AS $$
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
        FROM "projects"
       GROUP BY "pg_temp"."project_name_key"("name")
      HAVING count(*) > 1
    ) AS grouped;

  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Obras duplicadas impedem a migração. Unifique-as antes de continuar: %', duplicates;
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "nameKey" TEXT;

UPDATE "projects"
   SET "name" = btrim("name"),
       "nameKey" = "pg_temp"."project_name_key"("name");

ALTER TABLE "projects" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "projects_nameKey_key" ON "projects"("nameKey");
