"use client"

import { AdaptedStudentsManager } from "@/components/adapted-students-manager"
import { PageHeader } from "@/components/page-header"

export default function AlumnosAdaptadosPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alumnos con adaptación curricular"
        description="Gestioná los alumnos que tienen criterios de evaluación personalizados"
        breadcrumbs={[
          { label: "Director" },
          { label: "Configuración", href: "/director/configuracion" },
          { label: "Alumnos con adaptación" },
        ]}
      />
      <AdaptedStudentsManager />
    </div>
  )
}
