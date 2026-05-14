import {
  courses,
  courseAssignments,
  currentTeacher,
  directorUser,
  evaluations,
  getActivePeriod,
  getCourseById,
  getStudentsByCourse,
  getSubjectById,
  getTeacherById,
  periods,
  reportCards,
  students,
  subjects,
  teachers,
  type EvaluationStatus,
  type GradeLevel,
  type ReportCardType,
  type ReportStatus,
} from "@/lib/data"

export interface DirectorEvaluationRow {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  status: EvaluationStatus
  lastUpdated: string
  grades: Record<string, string>
}

export interface DirectorReportCardData {
  id: string
  studentId: string
  studentName: string
  periodId: string
  periodName: string
  reportType: ReportCardType
  courseId: string
  courseName: string
  completedDate: string
  status: ReportStatus
  parentEmail: string | null
  directorObservation?: string
  hasPdf: boolean
  pdfDownloadUrl?: string
  grades: Array<{
    subjectName: string
    teacherId: string
    teacherName: string
    criteria: Array<{ name: string; grade: GradeLevel }>
    observation?: string
    specialValue?: string
    numericGrade?: number
  }>
}

export interface ReportHistoryRow {
  id: string
  studentId: string
  studentName: string
  reportType: ReportCardType
  courseName: string
  periodName: string
  generatedDate: string | null
  status: ReportStatus
  hasPdf: boolean
  pdfDownloadUrl?: string
}

export interface TeacherPerformanceRow {
  id: string
  name: string
  courses: number
  students: number
  completionRate: number
  onTime: boolean
  lastActivity: string
}

export interface AdaptedStudent {
  id: string
  name: string
  courseId: string
  parentEmail: string | null
}

export interface PlatformData {
  directorUser: typeof directorUser
  currentTeacher: typeof currentTeacher
  periods: typeof periods
  courses: typeof courses
  subjects: typeof subjects
  teachers: typeof teachers
  students: typeof students
  adaptedStudents: AdaptedStudent[]
  reportCards: typeof reportCards
  courseAssignments: typeof courseAssignments
  evaluations: typeof evaluations
  directorEvaluationRows: DirectorEvaluationRow[]
  directorReportCards: DirectorReportCardData[]
  reportHistory: ReportHistoryRow[]
  teacherPerformance: TeacherPerformanceRow[]
  gradeDistribution: Array<{ subject: string; logrado: number; enProceso: number; enInicio: number }>
  evaluationStatusDistribution: Array<{ name: EvaluationStatus; value: number; fill: string }>
  gradeScales: Array<{ gradeFrom: number; gradeTo: number; labels: string[] }>
}

function courseNameForStudent(studentId: string) {
  const student = students.find((item) => item.id === studentId)
  return student ? (getCourseById(student.courseId)?.name ?? "—") : "—"
}

function buildDirectorEvaluationRows(): DirectorEvaluationRow[] {
  return evaluations.map((evaluation) => {
    const student = students.find((item) => item.id === evaluation.studentId)
    const teacher = getTeacherById(evaluation.teacherId)
    const subject = getSubjectById(evaluation.subjectId)
    const course = getCourseById(evaluation.courseId)

    return {
      id: evaluation.id,
      studentId: evaluation.studentId,
      studentName: student?.name ?? "Desconocido",
      courseId: evaluation.courseId,
      courseName: course?.name ?? "—",
      teacherId: evaluation.teacherId,
      teacherName: teacher?.name ?? "—",
      subjectId: evaluation.subjectId,
      subjectName: subject?.name ?? "—",
      status: evaluation.status,
      lastUpdated: evaluation.lastUpdated,
      grades: evaluation.grades,
    }
  })
}

function buildDirectorReportCards(): DirectorReportCardData[] {
  return reportCards.map((reportCard) => {
    const student = students.find((item) => item.id === reportCard.studentId)
    const period = periods.find((item) => item.id === reportCard.periodId)
    const relatedEvaluations = evaluations.filter(
      (evaluation) =>
        evaluation.studentId === reportCard.studentId &&
        evaluation.periodId === reportCard.periodId &&
        getSubjectById(evaluation.subjectId)?.reportType === reportCard.reportType,
    )
    const printableEvaluations = relatedEvaluations.filter(
      (evaluation) => getSubjectById(evaluation.subjectId)?.entryKind !== "TEACHER_OBSERVATION",
    )

    return {
      id: reportCard.id,
      studentId: reportCard.studentId,
      studentName: student?.name ?? "Desconocido",
      periodId: reportCard.periodId,
      periodName: period?.name ?? "—",
      reportType: reportCard.reportType,
      courseId: student?.courseId ?? "",
      courseName: student ? (getCourseById(student.courseId)?.name ?? "—") : "—",
      completedDate: reportCard.completedDate,
      status: reportCard.status,
      parentEmail: student?.parentEmail ?? null,
      hasPdf: Boolean(reportCard.pdfUrl),
      pdfDownloadUrl: reportCard.pdfUrl ? reportCard.pdfDownloadUrl : undefined,
      grades: printableEvaluations.map((evaluation) => ({
        subjectName: getSubjectById(evaluation.subjectId)?.name ?? "—",
        teacherId: evaluation.teacherId,
        teacherName: getTeacherById(evaluation.teacherId)?.name ?? "—",
          criteria: Object.entries(evaluation.grades).map(([name, grade]) => ({ name, grade })),
          observation: evaluation.observation,
          specialValue: evaluation.specialValue,
          numericGrade: evaluation.numericGrade,
        })),
    }
  })
}

function buildReportHistory(): ReportHistoryRow[] {
  return reportCards.map((reportCard) => ({
    id: reportCard.id,
    studentId: reportCard.studentId,
    studentName: students.find((student) => student.id === reportCard.studentId)?.name ?? "Desconocido",
    reportType: reportCard.reportType,
    courseName: courseNameForStudent(reportCard.studentId),
    periodName: periods.find((period) => period.id === reportCard.periodId)?.name ?? "—",
    generatedDate: reportCard.generatedDate ?? null,
    status: reportCard.status,
    hasPdf: Boolean(reportCard.pdfUrl),
    pdfDownloadUrl: reportCard.pdfUrl ? reportCard.pdfDownloadUrl : undefined,
  }))
}

function buildTeacherPerformance(): TeacherPerformanceRow[] {
  return teachers.map((teacher) => {
    const assignments = courseAssignments.filter((assignment) => assignment.teacherId === teacher.id)
    const assignedCourseIds = new Set(assignments.map((assignment) => assignment.courseId))
    const assignedStudents = students.filter((student) => assignedCourseIds.has(student.courseId)).length
    const teacherEvaluations = evaluations.filter((evaluation) => evaluation.teacherId === teacher.id)
    const completed = teacherEvaluations.filter((evaluation) => evaluation.status === "Completo").length
    const completionRate = teacherEvaluations.length === 0 ? 0 : Math.round((completed / teacherEvaluations.length) * 100)

    return {
      id: teacher.id,
      name: teacher.name,
      courses: assignedCourseIds.size,
      students: assignedStudents,
      completionRate,
      onTime: completionRate >= 75,
      lastActivity: teacherEvaluations[0]?.lastUpdated ?? "—",
    }
  })
}

function buildGradeDistribution() {
  return subjects.slice(0, 6).map((subject) => {
    const subjectEvaluations = evaluations.filter((evaluation) => evaluation.subjectId === subject.id)
    const grades = subjectEvaluations.flatMap((evaluation) => Object.values(evaluation.grades))

    return {
      subject: subject.name,
      logrado: grades.filter((grade) => grade === "Logrado" || grade === "Destacado").length,
      enProceso: grades.filter((grade) => grade === "En proceso").length,
      enInicio: grades.filter((grade) => grade === "En inicio").length,
    }
  })
}

function buildEvaluationStatusDistribution() {
  const statuses: EvaluationStatus[] = ["Completo", "En progreso", "Sin iniciar"]
  const fills = {
    Completo: "var(--color-success)",
    "En progreso": "var(--color-warning)",
    "Sin iniciar": "var(--color-muted)",
  }

  return statuses.map((status) => ({
    name: status,
    value: evaluations.filter((evaluation) => evaluation.status === status).length,
    fill: fills[status],
  }))
}

export const initialPlatformData: PlatformData = {
  directorUser,
  currentTeacher,
  periods,
  courses,
  subjects,
  teachers,
  students,
  adaptedStudents: [],
  reportCards,
  courseAssignments,
  evaluations,
  directorEvaluationRows: buildDirectorEvaluationRows(),
  directorReportCards: buildDirectorReportCards(),
  reportHistory: buildReportHistory(),
  teacherPerformance: buildTeacherPerformance(),
  gradeDistribution: buildGradeDistribution(),
  evaluationStatusDistribution: buildEvaluationStatusDistribution(),
  gradeScales: [],
}

export function getInitialPlatformData() {
  return initialPlatformData
}

export const emptyPlatformData: PlatformData = {
  directorUser: {
    name: "",
    role: "Director",
    email: "",
  },
  currentTeacher: {
    id: "",
    name: "",
    email: "",
    isActive: false,
  },
  periods: [],
  courses: [],
  subjects: [],
  teachers: [],
  students: [],
  adaptedStudents: [],
  reportCards: [],
  courseAssignments: [],
  evaluations: [],
  directorEvaluationRows: [],
  directorReportCards: [],
  reportHistory: [],
  teacherPerformance: [],
  gradeDistribution: [],
  evaluationStatusDistribution: [],
  gradeScales: [],
}

export function getEmptyPlatformData() {
  return emptyPlatformData
}
