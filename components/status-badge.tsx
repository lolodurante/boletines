"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Clock, 
  Minus, 
  FileText,
  AlertCircle, 
  Pencil 
} from "lucide-react"
import type { EvaluationStatus, ReportStatus, PeriodStatus } from "@/lib/data"

interface StatusBadgeProps {
  status: EvaluationStatus | ReportStatus | PeriodStatus
  className?: string
}

const statusConfig: Record<string, { 
  bg: string
  text: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  "Completo": { bg: "bg-success text-success-foreground", text: "Completo", icon: CheckCircle2 },
  "En progreso": { bg: "bg-warning text-warning-foreground", text: "En progreso", icon: Clock },
  "Sin iniciar": { bg: "bg-muted text-muted-foreground", text: "Sin iniciar", icon: Minus },
  "No listo": { bg: "bg-muted text-muted-foreground", text: "No listo", icon: Minus },
  "Listo para revisión": { bg: "bg-accent text-accent-foreground", text: "Listo para revisión", icon: CheckCircle2 },
  "PDF generado": { bg: "bg-success text-success-foreground", text: "PDF generado", icon: FileText },
  "Requiere revisión": { bg: "bg-destructive text-destructive-foreground", text: "Requiere revisión", icon: AlertCircle },
  "Borrador": { bg: "bg-muted text-muted-foreground", text: "Borrador", icon: Pencil },
  "Activo": { bg: "bg-success text-success-foreground", text: "Activo", icon: CheckCircle2 },
  "Cerrado": { bg: "bg-muted text-muted-foreground", text: "Cerrado", icon: Minus },
  "Próximo": { bg: "bg-accent text-accent-foreground", text: "Próximo", icon: Clock },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig["Sin iniciar"]!
  const Icon = config.icon

  return (
    <Badge 
      variant="secondary" 
      className={cn(config.bg, "gap-1", className)}
    >
      <Icon className="size-3" />
      {config.text}
    </Badge>
  )
}
