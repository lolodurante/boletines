"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GradeLevel } from "@/lib/data"

interface GradeBadgeProps {
  grade: GradeLevel
  className?: string
}

const gradeConfig: Record<GradeLevel, string> = {
  "Destacado": "bg-accent text-accent-foreground",
  "Logrado": "bg-success text-success-foreground",
  "En proceso": "bg-warning text-warning-foreground",
  "En inicio": "bg-destructive text-destructive-foreground",
  "No evaluado": "bg-muted text-muted-foreground"
}

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(gradeConfig[grade], className)}
    >
      {grade}
    </Badge>
  )
}
