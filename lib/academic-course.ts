export function courseIdFromParts(grade: string, division: string) {
  return `c${grade.trim().toLowerCase()}${division.trim().toLowerCase()}`
}

export function courseNameFromParts(grade: string, division: string) {
  return `${grade.trim()}° ${division.trim().toUpperCase()}`
}

export function coursePartsFromId(courseId: string) {
  const match = /^c(.+)([a-z])$/i.exec(courseId)
  if (!match) return null

  return {
    grade: match[1]!,
    division: match[2]!.toUpperCase(),
  }
}

