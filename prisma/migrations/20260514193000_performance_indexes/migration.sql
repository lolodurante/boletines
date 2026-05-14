-- Speed up director dashboards, report-card generation, and teacher submission checks.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "course_assignments_period_course_idx"
  ON "course_assignments" ("period_id", "grade", "division");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "course_assignments_period_course_subject_idx"
  ON "course_assignments" ("period_id", "grade", "division", "subject_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "evaluations_period_student_status_idx"
  ON "evaluations" ("period_id", "student_id", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "evaluations_period_teacher_subject_idx"
  ON "evaluations" ("period_id", "teacher_id", "subject_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "report_cards_status_period_type_idx"
  ON "report_cards" ("status", "period_id", "type");
