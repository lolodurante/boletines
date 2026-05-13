import type {
  AcademicPeriod,
  CourseAssignment,
  Evaluation,
  EvaluationCriterion,
  EvaluationGrade,
  GradingScale,
  ReportCard,
  Student,
  Subject,
  Teacher,
  User,
} from "@/types/domain"

const now = new Date("2026-03-01T12:00:00.000Z")

export const mockUsers: User[] = [
  { id: "user-director", name: "Mariana Acosta", email: "direccion@labarden.edu.ar", role: "DIRECTOR", createdAt: now, updatedAt: now },
  { id: "user-teacher-1", name: "Laura Fernandez", email: "laura.fernandez@labarden.edu.ar", role: "TEACHER", createdAt: now, updatedAt: now },
  { id: "user-teacher-2", name: "Carlos Medina", email: "carlos.medina@labarden.edu.ar", role: "TEACHER", createdAt: now, updatedAt: now },
]

export const mockTeachers: Teacher[] = [
  { id: "teacher-1", userId: "user-teacher-1", assignedCourses: ["3-A", "4-A"] },
  { id: "teacher-2", userId: "user-teacher-2", assignedCourses: ["3-A"] },
]

export const mockStudents: Student[] = [
  { id: "student-1", firstName: "Martina", lastName: "Garcia", grade: "3", division: "A", familyEmail: "garcia.familia@gmail.com", status: "ACTIVE" },
  { id: "student-2", firstName: "Joaquin", lastName: "Martinez", grade: "3", division: "A", status: "ACTIVE" },
  { id: "student-3", firstName: "Renata", lastName: "Nunez", grade: "4", division: "A", familyEmail: "nunez.padres@gmail.com", status: "ACTIVE" },
]

export const mockSubjects: Subject[] = [
  { id: "subject-lengua", name: "Lengua", type: "ESPANOL", gradeRange: ["1", "2", "3", "4", "5", "6"], active: true },
  { id: "subject-matematica", name: "Matematica", type: "ESPANOL", gradeRange: ["1", "2", "3", "4", "5", "6"], active: true },
  { id: "subject-ingles", name: "Ingles", type: "INGLES", gradeRange: ["1", "2", "3", "4", "5", "6"], active: true },
]

export const mockCriteria: EvaluationCriterion[] = [
  { id: "criterion-mat-1", subjectId: "subject-matematica", name: "Resolucion de problemas", description: "Resuelve problemas adecuados al grado.", gradeRange: ["3", "4", "5", "6"], active: true },
  { id: "criterion-mat-2", subjectId: "subject-matematica", name: "Calculo", description: "Aplica estrategias de calculo.", gradeRange: ["3", "4", "5", "6"], active: true },
  { id: "criterion-len-1", subjectId: "subject-lengua", name: "Comprension lectora", description: "Comprende textos del periodo.", gradeRange: ["1", "2", "3"], active: true },
]

export const mockGradingScales: GradingScale[] = [
  {
    id: "scale-primary-1-3",
    name: "Escala primer ciclo",
    gradeFrom: 1,
    gradeTo: 3,
    levels: [
      { id: "level-destacado", label: "Destacado", value: "DESTACADO", order: 1 },
      { id: "level-logrado", label: "Logrado", value: "LOGRADO", order: 2 },
      { id: "level-proceso", label: "En proceso", value: "EN_PROCESO", order: 3 },
    ],
  },
  {
    id: "scale-primary-4-6",
    name: "Escala segundo ciclo",
    gradeFrom: 4,
    gradeTo: 6,
    levels: [
      { id: "level-sobresaliente", label: "Sobresaliente", value: "SOBRESALIENTE", order: 1 },
      { id: "level-muy-bueno", label: "Muy bueno", value: "MUY_BUENO", order: 2 },
      { id: "level-suficiente", label: "Suficiente", value: "SUFICIENTE", order: 3 },
    ],
  },
]

export const mockPeriods: AcademicPeriod[] = [
  { id: "period-2026-t1", name: "1er trimestre 2026", type: "TRIMESTER", startDate: new Date("2026-03-01"), dueDate: new Date("2026-05-25"), status: "ACTIVE" },
]

export const mockAssignments: CourseAssignment[] = [
  { id: "assignment-1", teacherId: "teacher-1", subjectId: "subject-matematica", grade: "3", division: "A", periodId: "period-2026-t1" },
  { id: "assignment-2", teacherId: "teacher-2", subjectId: "subject-lengua", grade: "3", division: "A", periodId: "period-2026-t1" },
  { id: "assignment-3", teacherId: "teacher-2", subjectId: "subject-ingles", grade: "3", division: "A", periodId: "period-2026-t1" },
]

export const mockEvaluations: Evaluation[] = [
  { id: "evaluation-1", studentId: "student-1", teacherId: "teacher-1", subjectId: "subject-matematica", periodId: "period-2026-t1", status: "SUBMITTED", submittedAt: now, generalObservation: "Buen progreso." },
  { id: "evaluation-2", studentId: "student-1", teacherId: "teacher-2", subjectId: "subject-lengua", periodId: "period-2026-t1", status: "SUBMITTED", submittedAt: now },
  { id: "evaluation-3", studentId: "student-2", teacherId: "teacher-1", subjectId: "subject-matematica", periodId: "period-2026-t1", status: "SUBMITTED", submittedAt: now },
  { id: "evaluation-4", studentId: "student-1", teacherId: "teacher-2", subjectId: "subject-ingles", periodId: "period-2026-t1", status: "DRAFT", submittedAt: now },
]

export const mockEvaluationGrades: EvaluationGrade[] = [
  { id: "grade-1", evaluationId: "evaluation-1", criterionId: "criterion-mat-1", scaleLevelId: "level-logrado" },
  { id: "grade-2", evaluationId: "evaluation-1", criterionId: "criterion-mat-2", scaleLevelId: "level-proceso" },
  { id: "grade-3", evaluationId: "evaluation-2", criterionId: "criterion-len-1", scaleLevelId: "level-destacado" },
]

export const mockReportCards: ReportCard[] = [
  { id: "report-1", studentId: "student-1", periodId: "period-2026-t1", type: "ESPANOL", status: "READY_FOR_REVIEW", pdfStatus: "PENDING" },
  { id: "report-2", studentId: "student-2", periodId: "period-2026-t1", type: "ESPANOL", status: "BLOCKED_MISSING_EMAIL", pdfStatus: "SKIPPED" },
  { id: "report-3", studentId: "student-3", periodId: "period-2026-t1", type: "ESPANOL", status: "NOT_READY", pdfStatus: "PENDING" },
]
