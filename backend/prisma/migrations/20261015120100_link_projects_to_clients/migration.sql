CREATE EXTENSION IF NOT EXISTS unaccent;

WITH named AS (
    SELECT
        lower(regexp_replace(btrim(unaccent("clientName")), '\s+', ' ', 'g')) AS key,
        regexp_replace(btrim("clientName"), '\s+', ' ', 'g') AS name,
        "createdAt"
    FROM "projects"
    WHERE "clientId" IS NULL AND "clientName" IS NOT NULL AND btrim("clientName") <> ''
),
firsts AS (
    SELECT DISTINCT ON (key) key, name
    FROM named
    ORDER BY key, "createdAt" ASC
)
INSERT INTO "clients" ("id", "name", "nameKey", "updatedAt")
SELECT 'client_' || md5(key), name, key, CURRENT_TIMESTAMP
FROM firsts
ON CONFLICT ("id") DO NOTHING;

UPDATE "projects"
SET "clientId" = 'client_' || md5(lower(regexp_replace(btrim(unaccent("clientName")), '\s+', ' ', 'g')))
WHERE "clientId" IS NULL AND "clientName" IS NOT NULL AND btrim("clientName") <> '';
