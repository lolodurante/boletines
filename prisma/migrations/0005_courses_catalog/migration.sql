CREATE TABLE "courses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grade" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courses_grade_division_key" ON "courses"("grade", "division");
CREATE INDEX "courses_active_idx" ON "courses"("active");

INSERT INTO "courses" ("grade", "division", "updated_at")
SELECT DISTINCT "grade", "division", CURRENT_TIMESTAMP
FROM (
  SELECT "grade", "division" FROM "students"
  UNION
  SELECT "grade", "division" FROM "course_assignments"
) source
ON CONFLICT ("grade", "division") DO NOTHING;
