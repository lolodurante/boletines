// Types
export type GradeLevel = "Destacado" | "Logrado" | "En proceso" | "En inicio" | "No evaluado"

export type EvaluationStatus = "Completo" | "En progreso" | "Sin iniciar"

export type ReportStatus =
  | "No listo"
  | "Listo para revisión"
  | "PDF generado"
  | "Requiere revisión"

export type PeriodStatus = "Activo" | "Cerrado" | "Próximo"

export interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  teacherDeadline: string
  status: PeriodStatus
}

export interface Course {
  id: string
  name: string
  studentCount: number
}

export interface Criterion {
  id: string
  name: string
  description?: string
}

export interface GradeCriteria {
  grade: string
  criteria: Criterion[]
}

export interface Subject {
  id: string
  name: string
  appliesTo: string[]
  criteriaByGrade: GradeCriteria[]
}

export interface Teacher {
  id: string
  name: string
  email: string
  isActive: boolean
}

export interface Student {
  id: string
  name: string
  courseId: string
  parentEmail: string | null
}

export interface Evaluation {
  id: string
  studentId: string
  courseId: string
  subjectId: string
  teacherId: string
  periodId: string
  status: EvaluationStatus
  lastUpdated: string
  grades: Record<string, GradeLevel>
  observation?: string
  studentObservation?: string
}

export interface ReportCard {
  id: string
  studentId: string
  periodId: string
  status: ReportStatus
  generatedDate?: string
  completedDate: string
  directorObservation?: string
  pdfUrl?: string
}

export interface CourseAssignment {
  teacherId: string
  courseId: string
  subjectId: string
  periodId: string
}

// Mock Data
export const periods: Period[] = [
  {
    id: "p1",
    name: "1° Trimestre 2025",
    startDate: "01/03/2025",
    endDate: "31/05/2025",
    teacherDeadline: "25/05/2025",
    status: "Cerrado"
  },
  {
    id: "p2",
    name: "2° Trimestre 2025",
    startDate: "01/08/2025",
    endDate: "30/10/2025",
    teacherDeadline: "15/10/2025",
    status: "Activo"
  },
  {
    id: "p3",
    name: "3° Trimestre 2025",
    startDate: "01/11/2025",
    endDate: "15/12/2025",
    teacherDeadline: "10/12/2025",
    status: "Próximo"
  }
]

export const courses: Course[] = [
  { id: "c1a", name: "1° A", studentCount: 18 },
  { id: "c1b", name: "1° B", studentCount: 17 },
  { id: "c2a", name: "2° A", studentCount: 16 },
  { id: "c2b", name: "2° B", studentCount: 18 },
  { id: "c3a", name: "3° A", studentCount: 15 },
  { id: "c3b", name: "3° B", studentCount: 16 },
  { id: "c4a", name: "4° A", studentCount: 17 },
  { id: "c4b", name: "4° B", studentCount: 15 },
  { id: "c5a", name: "5° A", studentCount: 16 },
  { id: "c6a", name: "6° A", studentCount: 18 }
]

export const subjects: Subject[] = [
  { 
    id: "s1", 
    name: "Lengua", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [
        { id: "l1a", name: "Reconocimiento de letras", description: "Identifica letras del abecedario" },
        { id: "l1b", name: "Lectura de palabras", description: "Lee palabras simples con ayuda" },
        { id: "l1c", name: "Escritura inicial", description: "Escribe su nombre y palabras conocidas" }
      ]},
      { grade: "2°", criteria: [
        { id: "l2a", name: "Lectura fluida", description: "Lee oraciones con fluidez" },
        { id: "l2b", name: "Comprensión de textos cortos", description: "Comprende textos breves" },
        { id: "l2c", name: "Producción de oraciones", description: "Escribe oraciones simples" }
      ]},
      { grade: "3°", criteria: [
        { id: "l3a", name: "Comprensión lectora", description: "Comprende textos de mediana complejidad" },
        { id: "l3b", name: "Producción escrita", description: "Redacta párrafos coherentes" },
        { id: "l3c", name: "Expresión oral", description: "Se expresa con claridad" }
      ]},
      { grade: "4°", criteria: [
        { id: "l4a", name: "Análisis de textos", description: "Analiza estructura y contenido de textos" },
        { id: "l4b", name: "Redacción de textos", description: "Produce textos con introducción, desarrollo y cierre" },
        { id: "l4c", name: "Argumentación oral", description: "Expone ideas con argumentos" }
      ]},
      { grade: "5°", criteria: [
        { id: "l5a", name: "Interpretación crítica", description: "Interpreta textos identificando intención del autor" },
        { id: "l5b", name: "Textos expositivos", description: "Redacta textos expositivos y narrativos" },
        { id: "l5c", name: "Debate y exposición", description: "Participa en debates estructurados" }
      ]},
      { grade: "6°", criteria: [
        { id: "l6a", name: "Comprensión avanzada", description: "Analiza textos literarios y no literarios" },
        { id: "l6b", name: "Producción avanzada", description: "Escribe ensayos y textos argumentativos" },
        { id: "l6c", name: "Comunicación efectiva", description: "Comunica ideas complejas con precisión" }
      ]}
    ]
  },
  { 
    id: "s2", 
    name: "Matemática", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [
        { id: "m1a", name: "Conteo", description: "Cuenta hasta 100" },
        { id: "m1b", name: "Sumas y restas simples", description: "Realiza operaciones hasta 20" }
      ]},
      { grade: "2°", criteria: [
        { id: "m2a", name: "Operaciones básicas", description: "Suma y resta hasta 100" },
        { id: "m2b", name: "Problemas simples", description: "Resuelve problemas de un paso" }
      ]},
      { grade: "3°", criteria: [
        { id: "m3a", name: "Resolución de problemas", description: "Resuelve problemas de varios pasos" },
        { id: "m3b", name: "Cálculo", description: "Domina multiplicación y división" },
        { id: "m3c", name: "Razonamiento lógico", description: "Aplica lógica en situaciones matemáticas" }
      ]},
      { grade: "4°", criteria: [
        { id: "m4a", name: "Fracciones", description: "Opera con fracciones simples" },
        { id: "m4b", name: "Geometría", description: "Calcula perímetros y áreas" }
      ]},
      { grade: "5°", criteria: [
        { id: "m5a", name: "Decimales y fracciones", description: "Opera con decimales y fracciones equivalentes" },
        { id: "m5b", name: "Proporcionalidad", description: "Aplica regla de tres y porcentajes" }
      ]},
      { grade: "6°", criteria: [
        { id: "m6a", name: "Álgebra inicial", description: "Resuelve ecuaciones simples" },
        { id: "m6b", name: "Geometría avanzada", description: "Calcula volúmenes y áreas de sólidos" }
      ]}
    ]
  },
  { 
    id: "s3", 
    name: "Ciencias Naturales", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "cn1a", name: "Observación del entorno", description: "Observa y describe seres vivos" }]},
      { grade: "2°", criteria: [{ id: "cn2a", name: "Clasificación", description: "Clasifica seres vivos y objetos" }]},
      { grade: "3°", criteria: [
        { id: "cn3a", name: "Observación", description: "Observa fenómenos con atención al detalle" },
        { id: "cn3b", name: "Experimentación", description: "Realiza experimentos simples" },
        { id: "cn3c", name: "Conceptos", description: "Comprende conceptos básicos de ciencias" }
      ]},
      { grade: "4°", criteria: [{ id: "cn4a", name: "Método científico", description: "Aplica pasos del método científico" }]},
      { grade: "5°", criteria: [{ id: "cn5a", name: "Investigación", description: "Investiga temas con fuentes diversas" }]},
      { grade: "6°", criteria: [{ id: "cn6a", name: "Análisis científico", description: "Analiza fenómenos con rigor" }]}
    ]
  },
  { 
    id: "s4", 
    name: "Ciencias Sociales", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "cs1a", name: "Familia y comunidad", description: "Reconoce roles familiares" }]},
      { grade: "2°", criteria: [{ id: "cs2a", name: "Barrio y ciudad", description: "Conoce espacios de su entorno" }]},
      { grade: "3°", criteria: [
        { id: "cs3a", name: "Comprensión histórica", description: "Comprende hechos históricos básicos" },
        { id: "cs3b", name: "Geografía", description: "Ubica lugares en mapas" },
        { id: "cs3c", name: "Ciudadanía", description: "Reconoce derechos y deberes" }
      ]},
      { grade: "4°", criteria: [{ id: "cs4a", name: "Historia argentina", description: "Conoce períodos de historia nacional" }]},
      { grade: "5°", criteria: [{ id: "cs5a", name: "América Latina", description: "Conoce historia y geografía regional" }]},
      { grade: "6°", criteria: [{ id: "cs6a", name: "Historia mundial", description: "Relaciona hechos locales y globales" }]}
    ]
  },
  { 
    id: "s5", 
    name: "Formación Ética y Ciudadana", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "fe1a", name: "Convivencia básica", description: "Respeta turnos y comparte" }]},
      { grade: "2°", criteria: [{ id: "fe2a", name: "Normas de convivencia", description: "Cumple acuerdos del aula" }]},
      { grade: "3°", criteria: [
        { id: "fe3a", name: "Participación", description: "Participa en actividades grupales" },
        { id: "fe3b", name: "Valores", description: "Practica valores como respeto y solidaridad" },
        { id: "fe3c", name: "Convivencia", description: "Resuelve conflictos dialogando" }
      ]},
      { grade: "4°", criteria: [{ id: "fe4a", name: "Derechos del niño", description: "Conoce y defiende sus derechos" }]},
      { grade: "5°", criteria: [{ id: "fe5a", name: "Participación democrática", description: "Participa en decisiones grupales" }]},
      { grade: "6°", criteria: [{ id: "fe6a", name: "Ciudadanía responsable", description: "Actúa con responsabilidad social" }]}
    ]
  },
  { 
    id: "s6", 
    name: "Arte", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "ar1a", name: "Exploración plástica", description: "Experimenta con materiales" }]},
      { grade: "2°", criteria: [{ id: "ar2a", name: "Técnicas básicas", description: "Usa técnicas simples de dibujo" }]},
      { grade: "3°", criteria: [
        { id: "ar3a", name: "Creatividad", description: "Crea obras originales" },
        { id: "ar3b", name: "Técnica", description: "Aplica técnicas artísticas" },
        { id: "ar3c", name: "Expresión", description: "Expresa emociones a través del arte" }
      ]},
      { grade: "4°", criteria: [{ id: "ar4a", name: "Composición", description: "Organiza elementos visuales" }]},
      { grade: "5°", criteria: [{ id: "ar5a", name: "Estilos artísticos", description: "Reconoce diferentes estilos" }]},
      { grade: "6°", criteria: [{ id: "ar6a", name: "Proyecto artístico", description: "Desarrolla proyectos completos" }]}
    ]
  },
  { 
    id: "s7", 
    name: "Educación Física", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "ef1a", name: "Motricidad básica", description: "Corre, salta y lanza" }]},
      { grade: "2°", criteria: [{ id: "ef2a", name: "Coordinación", description: "Coordina movimientos" }]},
      { grade: "3°", criteria: [
        { id: "ef3a", name: "Motricidad", description: "Ejecuta movimientos con precisión" },
        { id: "ef3b", name: "Deportes", description: "Practica deportes básicos" },
        { id: "ef3c", name: "Trabajo en equipo", description: "Coopera en actividades grupales" }
      ]},
      { grade: "4°", criteria: [{ id: "ef4a", name: "Deportes colectivos", description: "Participa en deportes de equipo" }]},
      { grade: "5°", criteria: [{ id: "ef5a", name: "Reglas deportivas", description: "Conoce y aplica reglamentos" }]},
      { grade: "6°", criteria: [{ id: "ef6a", name: "Vida saludable", description: "Comprende importancia del ejercicio" }]}
    ]
  },
  { 
    id: "s8", 
    name: "Música", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "mu1a", name: "Canto", description: "Canta canciones infantiles" }]},
      { grade: "2°", criteria: [{ id: "mu2a", name: "Ritmo básico", description: "Sigue ritmos simples" }]},
      { grade: "3°", criteria: [
        { id: "mu3a", name: "Ritmo", description: "Mantiene el ritmo en canciones" },
        { id: "mu3b", name: "Expresión musical", description: "Se expresa a través de la música" },
        { id: "mu3c", name: "Apreciación", description: "Escucha y aprecia diferentes géneros" }
      ]},
      { grade: "4°", criteria: [{ id: "mu4a", name: "Instrumentos", description: "Toca instrumentos simples" }]},
      { grade: "5°", criteria: [{ id: "mu5a", name: "Lectura musical", description: "Lee notación musical básica" }]},
      { grade: "6°", criteria: [{ id: "mu6a", name: "Creación musical", description: "Crea composiciones simples" }]}
    ]
  },
  { 
    id: "s9", 
    name: "Inglés", 
    appliesTo: ["1°", "2°", "3°", "4°", "5°", "6°"],
    criteriaByGrade: [
      { grade: "1°", criteria: [{ id: "in1a", name: "Vocabulario inicial", description: "Conoce palabras básicas" }]},
      { grade: "2°", criteria: [{ id: "in2a", name: "Frases simples", description: "Comprende y usa frases cortas" }]},
      { grade: "3°", criteria: [
        { id: "in3a", name: "Comprensión", description: "Comprende instrucciones simples" },
        { id: "in3b", name: "Expresión oral", description: "Pronuncia palabras correctamente" },
        { id: "in3c", name: "Vocabulario", description: "Amplía vocabulario básico" }
      ]},
      { grade: "4°", criteria: [{ id: "in4a", name: "Conversación", description: "Mantiene diálogos simples" }]},
      { grade: "5°", criteria: [{ id: "in5a", name: "Lectura en inglés", description: "Lee textos cortos" }]},
      { grade: "6°", criteria: [{ id: "in6a", name: "Escritura en inglés", description: "Redacta textos simples" }]}
    ]
  }
]

export const teachers: Teacher[] = [
  { id: "t1", name: "Laura Fernández", email: "laura.fernandez@labarden.edu.ar", isActive: true },
  { id: "t2", name: "Carlos Medina", email: "carlos.medina@labarden.edu.ar", isActive: true },
  { id: "t3", name: "Ana Roldán", email: "ana.roldan@labarden.edu.ar", isActive: true },
  { id: "t4", name: "Pablo Torres", email: "pablo.torres@labarden.edu.ar", isActive: true },
  { id: "t5", name: "Cecilia López", email: "cecilia.lopez@labarden.edu.ar", isActive: true }
]

export const students: Student[] = [
  // 3° A students
  { id: "st1", name: "García, Martina", courseId: "c3a", parentEmail: "garcia.familia@gmail.com" },
  { id: "st2", name: "López, Bruno", courseId: "c3a", parentEmail: "lopez.padres@gmail.com" },
  { id: "st3", name: "Rodríguez, Valentina", courseId: "c3a", parentEmail: "rodriguez.casa@gmail.com" },
  { id: "st4", name: "Martínez, Joaquín", courseId: "c3a", parentEmail: null },
  { id: "st5", name: "González, Sofía", courseId: "c3a", parentEmail: "gonzalez.familia@gmail.com" },
  { id: "st6", name: "Fernández, Mateo", courseId: "c3a", parentEmail: "fernandez.hogar@gmail.com" },
  { id: "st7", name: "Sánchez, Emma", courseId: "c3a", parentEmail: "sanchez.padres@gmail.com" },
  { id: "st8", name: "Pérez, Tomás", courseId: "c3a", parentEmail: "perez.familia@gmail.com" },
  { id: "st9", name: "Gómez, Isabella", courseId: "c3a", parentEmail: "gomez.casa@gmail.com" },
  { id: "st10", name: "Díaz, Santiago", courseId: "c3a", parentEmail: "diaz.hogar@gmail.com" },
  { id: "st11", name: "Romero, Lucía", courseId: "c3a", parentEmail: "romero.padres@gmail.com" },
  { id: "st12", name: "Alvarez, Benjamín", courseId: "c3a", parentEmail: null },
  { id: "st13", name: "Torres, Mía", courseId: "c3a", parentEmail: "torres.familia@gmail.com" },
  { id: "st14", name: "Ruiz, Facundo", courseId: "c3a", parentEmail: "ruiz.casa@gmail.com" },
  { id: "st15", name: "Acosta, Catalina", courseId: "c3a", parentEmail: "acosta.hogar@gmail.com" },
  // 1° A students
  { id: "st16", name: "Herrera, Lucas", courseId: "c1a", parentEmail: "herrera.familia@gmail.com" },
  { id: "st17", name: "Medina, Camila", courseId: "c1a", parentEmail: "medina.padres@gmail.com" },
  { id: "st18", name: "Flores, Thiago", courseId: "c1a", parentEmail: "flores.casa@gmail.com" },
  { id: "st19", name: "Vargas, Alma", courseId: "c1a", parentEmail: "vargas.hogar@gmail.com" },
  { id: "st20", name: "Castro, Felipe", courseId: "c1a", parentEmail: null },
  // 2° A students
  { id: "st21", name: "Morales, Delfina", courseId: "c2a", parentEmail: "morales.familia@gmail.com" },
  { id: "st22", name: "Ortiz, Bautista", courseId: "c2a", parentEmail: "ortiz.padres@gmail.com" },
  { id: "st23", name: "Silva, Olivia", courseId: "c2a", parentEmail: "silva.casa@gmail.com" },
  // 4° A students
  { id: "st24", name: "Molina, Agustín", courseId: "c4a", parentEmail: "molina.familia@gmail.com" },
  { id: "st25", name: "Núñez, Renata", courseId: "c4a", parentEmail: "nunez.padres@gmail.com" },
]

export const courseAssignments: CourseAssignment[] = [
  // Laura Fernández - Matemática
  { teacherId: "t1", courseId: "c3a", subjectId: "s2", periodId: "p2" },
  { teacherId: "t1", courseId: "c4a", subjectId: "s2", periodId: "p2" },
  { teacherId: "t1", courseId: "c5a", subjectId: "s2", periodId: "p2" },
  // Carlos Medina - Lengua
  { teacherId: "t2", courseId: "c3a", subjectId: "s1", periodId: "p2" },
  { teacherId: "t2", courseId: "c2a", subjectId: "s1", periodId: "p2" },
  // Ana Roldán - Ciencias
  { teacherId: "t3", courseId: "c3a", subjectId: "s3", periodId: "p2" },
  { teacherId: "t3", courseId: "c3a", subjectId: "s4", periodId: "p2" },
  // Pablo Torres - Educación Física
  { teacherId: "t4", courseId: "c1a", subjectId: "s7", periodId: "p2" },
  { teacherId: "t4", courseId: "c2a", subjectId: "s7", periodId: "p2" },
  { teacherId: "t4", courseId: "c3a", subjectId: "s7", periodId: "p2" },
  // Cecilia López - Arte y Música
  { teacherId: "t5", courseId: "c3a", subjectId: "s6", periodId: "p2" },
  { teacherId: "t5", courseId: "c3a", subjectId: "s8", periodId: "p2" },
]

export const evaluations: Evaluation[] = [
  // Matemática 3° A - Laura Fernández (parcialmente completo)
  {
    id: "e1",
    studentId: "st1",
    courseId: "c3a",
    subjectId: "s2",
    teacherId: "t1",
    periodId: "p2",
    status: "Completo",
    lastUpdated: "hace 2 días",
    grades: {
      "Resolución de problemas": "Logrado",
      "Cálculo": "En proceso",
      "Razonamiento lógico": "Logrado"
    },
    observation: "Martina muestra buen progreso en matemática."
  },
  {
    id: "e2",
    studentId: "st2",
    courseId: "c3a",
    subjectId: "s2",
    teacherId: "t1",
    periodId: "p2",
    status: "En progreso",
    lastUpdated: "hace 1 día",
    grades: {
      "Resolución de problemas": "En proceso",
      "Cálculo": "No evaluado",
      "Razonamiento lógico": "No evaluado"
    }
  },
  {
    id: "e3",
    studentId: "st3",
    courseId: "c3a",
    subjectId: "s2",
    teacherId: "t1",
    periodId: "p2",
    status: "Completo",
    lastUpdated: "hace 3 días",
    grades: {
      "Resolución de problemas": "Logrado",
      "Cálculo": "Logrado",
      "Razonamiento lógico": "Logrado"
    },
    observation: "Excelente desempeño."
  },
  // Lengua 3° A - Carlos Medina
  {
    id: "e4",
    studentId: "st1",
    courseId: "c3a",
    subjectId: "s1",
    teacherId: "t2",
    periodId: "p2",
    status: "Completo",
    lastUpdated: "hace 1 día",
    grades: {
      "Comprensión lectora": "Logrado",
      "Producción escrita": "Logrado",
      "Expresión oral": "En proceso"
    }
  },
]

export const reportCards: ReportCard[] = [
  {
    id: "rc1",
    studentId: "st1",
    periodId: "p2",
    status: "Listo para revisión",
    completedDate: "hace 3 horas"
  },
  {
    id: "rc2",
    studentId: "st3",
    periodId: "p2",
    status: "Listo para revisión",
    completedDate: "hace 5 horas"
  },
  {
    id: "rc3",
    studentId: "st4",
    periodId: "p2",
    status: "Listo para revisión",
    completedDate: "hace 2 horas"
  },
  {
    id: "rc4",
    studentId: "st5",
    periodId: "p2",
    status: "PDF generado",
    completedDate: "hace 1 día",
    generatedDate: "hace 1 día"
  },
  {
    id: "rc5",
    studentId: "st6",
    periodId: "p2",
    status: "Requiere revisión",
    completedDate: "hace 4 horas"
  },
]

// Helper functions
export function getStudentById(id: string) {
  return students.find(s => s.id === id)
}

export function getCourseById(id: string) {
  return courses.find(c => c.id === id)
}

export function getSubjectById(id: string) {
  return subjects.find(s => s.id === id)
}

export function getCriteriaForGrade(subjectId: string, grade: string): Criterion[] {
  const subject = getSubjectById(subjectId)
  if (!subject) return []
  const gradeCriteria = subject.criteriaByGrade.find(gc => gc.grade === grade)
  return gradeCriteria?.criteria || []
}

export function getTeacherById(id: string) {
  return teachers.find(t => t.id === id)
}

export function getPeriodById(id: string) {
  return periods.find(p => p.id === id)
}

export function getActivePeriod() {
  return periods.find(p => p.status === "Activo")
}

export function getStudentsByCourse(courseId: string) {
  return students.filter(s => s.courseId === courseId)
}

export function getTeacherAssignments(teacherId: string, periodId: string) {
  return courseAssignments.filter(a => a.teacherId === teacherId && a.periodId === periodId)
}

export function getEvaluationsForCourseSubject(courseId: string, subjectId: string, periodId: string) {
  return evaluations.filter(e => e.courseId === courseId && e.subjectId === subjectId && e.periodId === periodId)
}

export function getCourseProgress(courseId: string, periodId: string) {
  const courseStudents = getStudentsByCourse(courseId)
  const courseEvaluations = evaluations.filter(e => e.courseId === courseId && e.periodId === periodId)
  const completedCount = courseEvaluations.filter(e => e.status === "Completo").length
  const totalRequired = courseStudents.length * subjects.length // Simplified
  return {
    completed: completedCount,
    total: totalRequired,
    percentage: totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0
  }
}

// Director user
export const directorUser = {
  name: "María González",
  role: "Directora",
  email: "maria.gonzalez@labarden.edu.ar"
}

// Current teacher (for demo)
export const currentTeacher = teachers[0]! // Laura Fernández

// Grade scales
export const gradeScale1to3: GradeLevel[] = ["Logrado", "En proceso", "En inicio", "No evaluado"]
export const gradeScale4to6: GradeLevel[] = ["Destacado", "Logrado", "En proceso", "En inicio", "No evaluado"]

export function getGradeScale(grade: string): GradeLevel[] {
  const gradeNum = parseInt(grade.charAt(0))
  return gradeNum >= 4 ? gradeScale4to6 : gradeScale1to3
}
