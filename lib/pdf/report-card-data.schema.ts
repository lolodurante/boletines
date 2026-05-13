import { z } from "zod"

export const reportCardPdfDataSchema = z.object({
  student: z.object({
    fullName: z.string().min(1),
    grade: z.string().min(1),
    division: z.string().min(1),
  }),
  period: z.object({
    name: z.string().min(1),
  }),
  subjects: z.array(z.object({
    subjectName: z.string().min(1),
    teacherName: z.string().min(1),
    criteria: z.array(z.object({
      name: z.string().min(1),
      gradeLabel: z.string().min(1),
      observation: z.string().optional(),
    })).min(1),
  })).min(1),
  directorObservation: z.string().optional(),
  branding: z.object({
    logoUrl: z.string().optional(),
    primaryColor: z.string().min(1),
    secondaryColor: z.string().min(1),
  }),
})

export type ReportCardPdfData = z.infer<typeof reportCardPdfDataSchema>
