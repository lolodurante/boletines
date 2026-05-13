import { prisma } from "@/lib/db/client"
import { courseIdFromParts, courseNameFromParts } from "@/lib/academic-course"
import { getEmptyPlatformData, type PlatformData } from "@/lib/presentation-data"
import { logWarning } from "@/lib/logger"
import type { EvaluationStatus, GradeLevel, ReportStatus } from "@/lib/data"
import type { CurrentAuthUser } from "@/lib/auth/current-user"

function hasConfiguredDatabase() {
  const url = process.env.DATABASE_URL
  return Boolean(url && !url.includes("localhost:5432/boletines_labarden"))
}

export async function getPlatformData(authUser?: CurrentAuthUser): Promise<PlatformData> {
  if (!hasConfiguredDatabase()) {
    return getEmptyPlatformData()
  }

  try {
    const [students, users, teachers, subjects, periods, assignments, reportCards, evaluations, gradingScales] = await Promise.all([
      prisma.student.findMany({ orderBy: [{ grade: "asc" }, { division: "asc" }, { lastName: "asc" }] }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
      prisma.subject.findMany({
        where: { active: true },
        include: { criteria: { where: { active: true } } },
        orderBy: { order: "asc" },
      }),
      prisma.academicPeriod.findMany({ orderBy: { startDate: "asc" } }),
      prisma.courseAssignment.findMany({ orderBy: [{ grade: "asc" }, { division: "asc" }] }),
      prisma.reportCard.findMany({ include: { student: true, period: true }, orderBy: { updatedAt: "desc" } }),
      prisma.evaluation.findMany({
        include: {
          student: true,
          teacher: { include: { user: true } },
          subject: true,
          period: true,
          grades: { include: { criterion: true, scaleLevel: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.gradingScale.findMany({
        include: { levels: { orderBy: { order: "asc" } } },
        orderBy: { gradeFrom: "asc" },
      }),
    ])
    const courses = await prisma.course.findMany({
      where: { active: true },
      orderBy: [{ grade: "asc" }, { division: "asc" }],
    }).catch((error: unknown) => {
      logWarning("Could not load courses catalog; deriving courses from students and assignments", {
        reason: error instanceof Error ? error.message : "Unknown courses query error",
      })
      return []
    })

    const activeStudents = students.filter((student) => student.status === "ACTIVE")
    const mappedStudents: PlatformData["students"] = activeStudents.map((student) => ({
      id: student.id,
      name: `${student.lastName}, ${student.firstName}`,
      courseId: courseIdFromParts(student.grade, student.division),
      parentEmail: student.familyEmail,
    }))
    const activeCourseRecords = courses.length > 0
      ? courses
      : Array.from(
          new Map(
            [...activeStudents, ...assignments].map((item) => {
              const id = courseIdFromParts(item.grade, item.division)
              return [id, { grade: item.grade, division: item.division }]
            }),
          ).values(),
        )
    const mappedCourses: PlatformData["courses"] = activeCourseRecords.map((course) => ({
      id: courseIdFromParts(course.grade, course.division),
      name: courseNameFromParts(course.grade, course.division),
      studentCount: activeStudents.filter((student) => student.grade === course.grade && student.division === course.division).length,
    }))
    const mappedTeachers: PlatformData["teachers"] = teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      isActive: teacher.user.status === "ACTIVE",
    }))
    const mappedSubjects: PlatformData["subjects"] = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      reportType: subject.type,
      entryKind: subject.entryKind,
      hasNumericGrade: subject.hasNumericGrade,
      appliesTo: subject.gradeRange.map((grade) => `${grade}°`),
      criteriaByGrade: subject.gradeRange.map((grade) => ({
        grade: `${grade}°`,
        criteria: subject.criteria
          .filter((criterion) => criterion.gradeRange.includes(grade))
          .map((criterion) => ({ id: criterion.id, name: criterion.name, description: criterion.description })),
      })),
    }))
    const mappedPeriods: PlatformData["periods"] = periods.map((period) => ({
      id: period.id,
      name: period.name,
      startDate: period.startDate.toLocaleDateString("es-AR"),
      endDate: period.dueDate.toLocaleDateString("es-AR"),
      teacherDeadline: (period.teacherDeadline ?? period.dueDate).toLocaleDateString("es-AR"),
      status: period.status === "ACTIVE" ? "Activo" : period.status === "CLOSED" ? "Cerrado" : "Próximo",
    }))
    const mappedAssignments: PlatformData["courseAssignments"] = assignments.map((assignment) => ({
      teacherId: assignment.teacherId,
      courseId: courseIdFromParts(assignment.grade, assignment.division),
      subjectId: assignment.subjectId,
      periodId: assignment.periodId,
    }))
    const mapReportStatus = (status: string): ReportStatus => {
      if (status === "NOT_READY") return "No listo"
      if (status === "READY_FOR_REVIEW") return "Listo para revisión"
      if (status === "APPROVED") return "PDF generado"
      if (status === "SENT") return "PDF generado"
      if (status === "NEEDS_REVISION") return "Requiere revisión"
      if (status === "BLOCKED_MISSING_EMAIL") return "No listo"
      return "No listo"
    }
    const mappedReportCards: PlatformData["reportCards"] = reportCards.map((reportCard) => ({
      id: reportCard.id,
      studentId: reportCard.studentId,
      periodId: reportCard.periodId,
      reportType: reportCard.type,
      status: mapReportStatus(reportCard.status),
      completedDate: reportCard.updatedAt.toLocaleDateString("es-AR"),
      generatedDate: reportCard.pdfUrl ? reportCard.updatedAt.toLocaleDateString("es-AR") : undefined,
      directorObservation: reportCard.directorObservation ?? undefined,
      pdfUrl: reportCard.pdfUrl ?? undefined,
    }))
    const mapEvaluationStatus = (status: string): EvaluationStatus => {
      if (status === "APPROVED" || status === "SUBMITTED") return "Completo"
      if (status === "DRAFT" || status === "NEEDS_REVISION") return "En progreso"
      return "Sin iniciar"
    }
    const mappedEvaluations: PlatformData["evaluations"] = evaluations.map((evaluation) => ({
      id: evaluation.id,
      studentId: evaluation.studentId,
      courseId: courseIdFromParts(evaluation.student.grade, evaluation.student.division),
      subjectId: evaluation.subjectId,
      teacherId: evaluation.teacherId,
      periodId: evaluation.periodId,
      status: mapEvaluationStatus(evaluation.status),
      lastUpdated: evaluation.updatedAt.toLocaleDateString("es-AR"),
      grades: Object.fromEntries(
        evaluation.grades.map((grade) => [grade.criterion.name, grade.scaleLevel.label as GradeLevel]),
      ),
      observation: evaluation.generalObservation ?? undefined,
      specialValue: evaluation.specialValue ?? undefined,
      numericGrade: evaluation.numericGrade ?? undefined,
    }))
    const directorEvaluationRows: PlatformData["directorEvaluationRows"] = mappedEvaluations.map((evaluation) => ({
      id: evaluation.id,
      studentId: evaluation.studentId,
      studentName: mappedStudents.find((student) => student.id === evaluation.studentId)?.name ?? "Desconocido",
      courseId: evaluation.courseId,
      courseName: mappedCourses.find((course) => course.id === evaluation.courseId)?.name ?? "—",
      teacherId: evaluation.teacherId,
      teacherName: mappedTeachers.find((teacher) => teacher.id === evaluation.teacherId)?.name ?? "—",
      subjectId: evaluation.subjectId,
      subjectName: mappedSubjects.find((subject) => subject.id === evaluation.subjectId)?.name ?? "—",
      status: evaluation.status,
      lastUpdated: evaluation.lastUpdated,
      grades: evaluation.grades,
    }))
    const directorReportCards: PlatformData["directorReportCards"] = mappedReportCards.map((reportCard) => {
      const student = mappedStudents.find((item) => item.id === reportCard.studentId)
      const period = mappedPeriods.find((item) => item.id === reportCard.periodId)
      const relatedEvaluations = mappedEvaluations.filter(
        (evaluation) =>
          evaluation.studentId === reportCard.studentId &&
          evaluation.periodId === reportCard.periodId &&
          mappedSubjects.find((subject) => subject.id === evaluation.subjectId)?.reportType === reportCard.reportType,
      )
      const printableEvaluations = relatedEvaluations.filter(
        (evaluation) =>
          mappedSubjects.find((subject) => subject.id === evaluation.subjectId)?.entryKind !== "TEACHER_OBSERVATION",
      )

      return {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: student?.name ?? "Desconocido",
        periodId: reportCard.periodId,
        periodName: period?.name ?? "—",
        reportType: reportCard.reportType,
        courseId: student?.courseId ?? "",
        courseName: mappedCourses.find((course) => course.id === student?.courseId)?.name ?? "—",
        completedDate: reportCard.completedDate,
        status: reportCard.status,
        parentEmail: student?.parentEmail ?? null,
        directorObservation: reportCard.directorObservation ?? undefined,
        pdfUrl: reportCard.pdfUrl,
        grades: printableEvaluations.map((evaluation) => ({
          subjectName: mappedSubjects.find((subject) => subject.id === evaluation.subjectId)?.name ?? "—",
          teacherId: evaluation.teacherId,
          teacherName: mappedTeachers.find((teacher) => teacher.id === evaluation.teacherId)?.name ?? "—",
          criteria: Object.entries(evaluation.grades).map(([name, grade]) => ({ name, grade })),
          observation: evaluation.observation,
          specialValue: evaluation.specialValue,
          numericGrade: evaluation.numericGrade,
        })),
      }
    })
    const reportHistory: PlatformData["reportHistory"] = mappedReportCards.map((reportCard) => {
      const student = mappedStudents.find((item) => item.id === reportCard.studentId)
      return {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: student?.name ?? "Desconocido",
        reportType: reportCard.reportType,
        courseName: mappedCourses.find((course) => course.id === student?.courseId)?.name ?? "—",
        periodName: mappedPeriods.find((period) => period.id === reportCard.periodId)?.name ?? "—",
        generatedDate: reportCard.generatedDate ?? null,
        status: reportCard.status,
        pdfUrl: reportCard.pdfUrl,
      }
    })
    const activePeriodRecord = periods.find((period) => period.status === "ACTIVE") ?? periods[0]
    const teacherPerformance: PlatformData["teacherPerformance"] = mappedTeachers.map((teacher) => {
      const teacherAssignments = mappedAssignments.filter((assignment) => assignment.teacherId === teacher.id)
      const assignedCourseIds = new Set(teacherAssignments.map((assignment) => assignment.courseId))
      const teacherEvaluations = mappedEvaluations.filter((evaluation) => evaluation.teacherId === teacher.id)
      const completed = teacherEvaluations.filter((evaluation) => evaluation.status === "Completo").length
      const completionRate = teacherEvaluations.length === 0 ? 0 : Math.round((completed / teacherEvaluations.length) * 100)
      const rawTeacherEvaluations = evaluations.filter((evaluation) => evaluation.teacherId === teacher.id)
      const lastEvaluation = rawTeacherEvaluations[0]
      const deadline = activePeriodRecord?.teacherDeadline ?? activePeriodRecord?.dueDate
      const onTime = completionRate === 100 && Boolean(lastEvaluation && deadline && lastEvaluation.updatedAt <= deadline)

      return {
        id: teacher.id,
        name: teacher.name,
        courses: assignedCourseIds.size,
        students: mappedStudents.filter((student) => assignedCourseIds.has(student.courseId)).length,
        completionRate,
        onTime,
        lastActivity: teacherEvaluations[0]?.lastUpdated ?? "—",
      }
    })
    const gradeDistribution: PlatformData["gradeDistribution"] = mappedSubjects.map((subject) => {
      const grades = mappedEvaluations
        .filter((evaluation) => evaluation.subjectId === subject.id)
        .flatMap((evaluation) => Object.values(evaluation.grades))

      return {
        subject: subject.name,
        logrado: grades.filter((grade) => grade === "Logrado" || grade === "Destacado").length,
        enProceso: grades.filter((grade) => grade === "En proceso").length,
        enInicio: grades.filter((grade) => grade === "En inicio").length,
      }
    })
    const statusFills: Record<EvaluationStatus, string> = {
      Completo: "var(--color-success)",
      "En progreso": "var(--color-warning)",
      "Sin iniciar": "var(--color-muted)",
    }
    const evaluationStatusDistribution: PlatformData["evaluationStatusDistribution"] = (["Completo", "En progreso", "Sin iniciar"] as EvaluationStatus[]).map((status) => ({
      name: status,
      value: mappedEvaluations.filter((evaluation) => evaluation.status === status).length,
      fill: statusFills[status],
    }))

    const isTeacherUser = authUser?.role === "TEACHER" && Boolean(authUser.teacherId)
    const currentTeacher = isTeacherUser && authUser?.teacherId
      ? mappedTeachers.find((teacher) => teacher.id === authUser.teacherId)
      : mappedTeachers[0]
    const filteredAssignments = isTeacherUser && authUser?.teacherId
      ? mappedAssignments.filter((assignment) => assignment.teacherId === authUser.teacherId)
      : mappedAssignments
    const filteredEvaluations = isTeacherUser && authUser?.teacherId
      ? mappedEvaluations.filter((evaluation) => evaluation.teacherId === authUser.teacherId)
      : mappedEvaluations
    const teacherCourseIds = new Set(filteredAssignments.map((assignment) => assignment.courseId))
    const teacherSubjectIds = new Set(filteredAssignments.map((assignment) => assignment.subjectId))
    const teacherStudentIds = new Set(
      mappedStudents.filter((student) => teacherCourseIds.has(student.courseId)).map((student) => student.id),
    )
    const scopedStudents = isTeacherUser
      ? mappedStudents.filter((student) => teacherStudentIds.has(student.id))
      : mappedStudents
    const scopedCourses = isTeacherUser
      ? mappedCourses.filter((course) => teacherCourseIds.has(course.id))
      : mappedCourses
    const scopedSubjects = isTeacherUser
      ? mappedSubjects.filter((subject) => teacherSubjectIds.has(subject.id))
      : mappedSubjects
    const scopedTeachers = isTeacherUser && currentTeacher ? [currentTeacher] : mappedTeachers
    const scopedReportCards = isTeacherUser
      ? mappedReportCards.filter((reportCard) => teacherStudentIds.has(reportCard.studentId))
      : mappedReportCards
    const scopedTeacherPerformance = isTeacherUser && currentTeacher
      ? teacherPerformance.filter((teacher) => teacher.id === currentTeacher.id)
      : teacherPerformance
    const scopedGradeDistribution = scopedSubjects.map((subject) => {
      const grades = filteredEvaluations
        .filter((evaluation) => evaluation.subjectId === subject.id)
        .flatMap((evaluation) => Object.values(evaluation.grades))

      return {
        subject: subject.name,
        logrado: grades.filter((grade) => grade === "Logrado" || grade === "Destacado").length,
        enProceso: grades.filter((grade) => grade === "En proceso").length,
        enInicio: grades.filter((grade) => grade === "En inicio").length,
      }
    })
    const scopedEvaluationStatusDistribution = (["Completo", "En progreso", "Sin iniciar"] as EvaluationStatus[]).map((status) => ({
      name: status,
      value: filteredEvaluations.filter((evaluation) => evaluation.status === status).length,
      fill: statusFills[status],
    }))

    return {
      directorUser: users.find((user) => user.role === "DIRECTOR")
        ? {
            name: users.find((user) => user.role === "DIRECTOR")!.name,
            email: users.find((user) => user.role === "DIRECTOR")!.email,
            role: "Director",
          }
        : getEmptyPlatformData().directorUser,
      currentTeacher: currentTeacher ?? getEmptyPlatformData().currentTeacher,
      periods: mappedPeriods,
      courses: scopedCourses,
      subjects: scopedSubjects,
      teachers: scopedTeachers,
      students: scopedStudents,
      reportCards: scopedReportCards,
      courseAssignments: filteredAssignments,
      evaluations: filteredEvaluations,
      directorEvaluationRows: isTeacherUser ? [] : directorEvaluationRows,
      directorReportCards: isTeacherUser ? [] : directorReportCards,
      reportHistory: isTeacherUser ? [] : reportHistory,
      teacherPerformance: scopedTeacherPerformance,
      gradeDistribution: scopedGradeDistribution,
      evaluationStatusDistribution: scopedEvaluationStatusDistribution,
      gradeScales: gradingScales.map((scale) => ({
        gradeFrom: scale.gradeFrom,
        gradeTo: scale.gradeTo,
        labels: scale.levels.map((level) => level.label),
      })),
    }
  } catch (error) {
    logWarning("Falling back to empty platform data", {
      reason: error instanceof Error ? error.message : "Unknown database error",
    })
    return getEmptyPlatformData()
  }
}
