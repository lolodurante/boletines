ALTER TABLE "subjects" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Initialize order from current alphabetical sort
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY name ASC) - 1 AS rn
  FROM subjects
  WHERE active = true
)
UPDATE subjects SET "order" = ranked.rn FROM ranked WHERE subjects.id = ranked.id;
