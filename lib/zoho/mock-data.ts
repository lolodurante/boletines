import type { ZohoAssignment, ZohoStudent, ZohoTeacher } from "./types"

export const mockZohoStudents: ZohoStudent[] = [
  { id: "z-st-001", firstName: "Martina", lastName: "Garcia", grade: "3", division: "A", familyEmail: "garcia.familia@gmail.com" },
  { id: "z-st-002", firstName: "Joaquin", lastName: "Martinez", grade: "3", division: "A" },
  { id: "z-st-003", firstName: "Renata", lastName: "Nunez", grade: "4", division: "A", familyEmail: "nunez.padres@gmail.com" },
]

export const mockZohoTeachers: ZohoTeacher[] = [
  { id: "z-t-001", name: "Laura Fernandez", email: "laura.fernandez@labarden.edu.ar" },
  { id: "z-t-002", name: "Carlos Medina", email: "carlos.medina@labarden.edu.ar" },
]

export const mockZohoAssignments: ZohoAssignment[] = [
  { id: "z-a-001", teacherZohoId: "z-t-001", subjectName: "Matematica", grade: "3", division: "A" },
  { id: "z-a-002", teacherZohoId: "z-t-002", subjectName: "Lengua", grade: "3", division: "A" },
]
