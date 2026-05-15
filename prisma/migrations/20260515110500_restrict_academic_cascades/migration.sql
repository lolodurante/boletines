-- Prevent accidental hard deletes from cascading into academic history.
-- Application flows use soft deletes / archival status for these records.

ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_fkey";
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_criteria" DROP CONSTRAINT "evaluation_criteria_subject_id_fkey";
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adapted_criteria" DROP CONSTRAINT "adapted_criteria_student_id_fkey";
ALTER TABLE "adapted_criteria" ADD CONSTRAINT "adapted_criteria_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adapted_criteria" DROP CONSTRAINT "adapted_criteria_subject_id_fkey";
ALTER TABLE "adapted_criteria" ADD CONSTRAINT "adapted_criteria_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_teacher_id_fkey";
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_subject_id_fkey";
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_period_id_fkey";
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_period_id_fkey"
  FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_student_id_fkey";
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_teacher_id_fkey";
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_subject_id_fkey";
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_period_id_fkey";
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_id_fkey"
  FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluation_grades" DROP CONSTRAINT "evaluation_grades_evaluation_id_fkey";
ALTER TABLE "evaluation_grades" ADD CONSTRAINT "evaluation_grades_evaluation_id_fkey"
  FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adapted_evaluation_grades" DROP CONSTRAINT "adapted_evaluation_grades_evaluation_id_fkey";
ALTER TABLE "adapted_evaluation_grades" ADD CONSTRAINT "adapted_evaluation_grades_evaluation_id_fkey"
  FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report_cards" DROP CONSTRAINT "report_cards_student_id_fkey";
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report_cards" DROP CONSTRAINT "report_cards_period_id_fkey";
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_period_id_fkey"
  FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
