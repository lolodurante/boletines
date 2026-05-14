"use client"

import { AdaptedStudentsManager } from "@/components/adapted-students-manager"
import { PageHeader } from "@/components/page-header"

export default function AdaptacionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Adaptaciones curriculares"
        description="Gestioná los criterios de evaluación personalizados para cada alumno"
        breadcrumbs={[
          { label: "Psicopedagoga" },
          { label: "Adaptaciones curriculares" },
        ]}
      />
      <AdaptedStudentsManager />
    </div>
  )
}
