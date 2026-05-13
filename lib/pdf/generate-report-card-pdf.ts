import { reportCardPdfDataSchema, type ReportCardPdfData } from "./report-card-data.schema"

export interface GeneratedPdf {
  fileName: string
  buffer: Buffer
  url: string
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 28
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const TOP_Y = PAGE_HEIGHT - MARGIN
const BOTTOM_Y = MARGIN
const DEFAULT_LEVELS = ["DESTACADO", "AVANZADO", "ALCANZADO", "EN PROCESO", "NO ALCANZÓ LOS OBJETIVOS"]

type Font = "regular" | "bold"

interface PdfPage {
  commands: string[]
  y: number
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeLabel(value: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

function escapePdfText(value: string) {
  return normalizeText(value)
    .replace(/[^\x20-\xFF]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function textWidth(value: string, fontSize: number) {
  return normalizeText(value).length * fontSize * 0.5
}

function wrapText(value: string, maxWidth: number, fontSize: number) {
  const words = normalizeText(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (textWidth(next, fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function rect(x: number, y: number, width: number, height: number, fill?: string) {
  const fillCommand = fill ? `${fill} rg ${x} ${y} ${width} ${height} re f` : ""
  return ["q", fillCommand, "0 0 0 RG", "0.7 w", `${x} ${y} ${width} ${height} re S`, "Q"].filter(Boolean).join("\n")
}

function text(value: string, x: number, y: number, options: { size?: number; font?: Font; align?: "left" | "center" } = {}) {
  const size = options.size ?? 10
  const font = options.font === "bold" ? "F2" : "F1"
  const textX = options.align === "center" ? x - textWidth(value, size) / 2 : x
  return `BT /${font} ${size} Tf 1 0 0 1 ${textX.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(value)}) Tj ET`
}

function addWrappedText(page: PdfPage, value: string, x: number, y: number, maxWidth: number, options: { size?: number; font?: Font } = {}) {
  const size = options.size ?? 10
  wrapText(value, maxWidth, size).forEach((line, index) => {
    page.commands.push(text(line, x, y - index * (size + 3), { size, font: options.font }))
  })
}

function addPage(pages: PdfPage[]): PdfPage {
  const page: PdfPage = { commands: [], y: TOP_Y }
  pages.push(page)
  return page
}

function addDocumentHeader(page: PdfPage, data: ReportCardPdfData) {
  const period = normalizeText(data.period.name).toUpperCase()
  const course = `${data.student.grade}${data.student.division ? ` ${data.student.division}` : ""}`

  page.commands.push(rect(MARGIN, page.y - 28, CONTENT_WIDTH, 28))
  page.commands.push(text(`COLEGIO LABARDÉN - BOLETÍN ${period}`, PAGE_WIDTH / 2, page.y - 18, {
    size: 13,
    font: "bold",
    align: "center",
  }))
  page.y -= 28

  page.commands.push(rect(MARGIN, page.y - 25, CONTENT_WIDTH, 25))
  page.commands.push(text(`NOMBRE DEL ALUMNO: ${data.student.fullName}`, MARGIN + 8, page.y - 17, { size: 11, font: "bold" }))
  page.commands.push(text(`CURSO: ${course}`, PAGE_WIDTH - MARGIN - 115, page.y - 17, { size: 11, font: "bold" }))
  page.y -= 25
}

function getLevelLabels(data: ReportCardPdfData) {
  const found = new Map(DEFAULT_LEVELS.map((level) => [normalizeLabel(level), level]))

  for (const subject of data.subjects) {
    for (const criterion of subject.criteria) {
      const label = normalizeLabel(criterion.gradeLabel)
      if (!found.has(label)) found.set(label, label)
    }
  }

  return Array.from(found.values())
}

function addTableHeader(page: PdfPage, levelLabels: string[]) {
  const indicatorWidth = levelLabels.length <= 5 ? 245 : 220
  const levelWidth = (CONTENT_WIDTH - indicatorWidth) / levelLabels.length
  const rowHeight = 37

  page.commands.push(rect(MARGIN, page.y - rowHeight, indicatorWidth, rowHeight, "0.93 0.93 0.93"))
  page.commands.push(text("Indicadores de logro en las áreas", MARGIN + indicatorWidth / 2, page.y - 22, {
    size: 10,
    font: "bold",
    align: "center",
  }))

  levelLabels.forEach((label, index) => {
    const x = MARGIN + indicatorWidth + index * levelWidth
    page.commands.push(rect(x, page.y - rowHeight, levelWidth, rowHeight, "0.93 0.93 0.93"))
    wrapText(label, levelWidth - 8, 8).slice(0, 3).forEach((line, lineIndex) => {
      page.commands.push(text(line, x + levelWidth / 2, page.y - 13 - lineIndex * 10, {
        size: 8,
        font: "bold",
        align: "center",
      }))
    })
  })

  page.y -= rowHeight
}

function ensureSpace(pages: PdfPage[], minHeight: number, data: ReportCardPdfData, levelLabels: string[]) {
  let page = pages[pages.length - 1]
  if (!page) page = addPage(pages)
  if (page.y - minHeight >= BOTTOM_Y) return page

  page = addPage(pages)
  addDocumentHeader(page, data)
  addTableHeader(page, levelLabels)
  return page
}

function addSubjectSection(page: PdfPage, subjectName: string, teacherName: string) {
  const height = 24
  page.commands.push(rect(MARGIN, page.y - height, CONTENT_WIDTH, height, "0.82 0.82 0.82"))
  page.commands.push(text(subjectName.toUpperCase(), MARGIN + 8, page.y - 16, { size: 10, font: "bold" }))
  page.commands.push(text(`DOCENTE: ${teacherName}`, PAGE_WIDTH - MARGIN - 190, page.y - 16, { size: 9, font: "bold" }))
  page.y -= height
}

function getCriterionRowHeight(criterion: ReportCardPdfData["subjects"][number]["criteria"][number], levelLabels: string[]) {
  const indicatorWidth = levelLabels.length <= 5 ? 245 : 220
  const observation = criterion.observation ? ` Observación: ${criterion.observation}` : ""
  return Math.max(28, wrapText(`${criterion.name}${observation}`, indicatorWidth - 12, 9).length * 12 + 10)
}

function addCriterionRow(
  page: PdfPage,
  criterion: ReportCardPdfData["subjects"][number]["criteria"][number],
  levelLabels: string[],
) {
  const indicatorWidth = levelLabels.length <= 5 ? 245 : 220
  const levelWidth = (CONTENT_WIDTH - indicatorWidth) / levelLabels.length
  const observation = criterion.observation ? ` Observación: ${criterion.observation}` : ""
  const label = `${criterion.name}${observation}`
  const rowHeight = getCriterionRowHeight(criterion, levelLabels)
  const topY = page.y

  page.commands.push(rect(MARGIN, topY - rowHeight, indicatorWidth, rowHeight))
  addWrappedText(page, label, MARGIN + 6, topY - 14, indicatorWidth - 12, { size: 9 })

  levelLabels.forEach((level, index) => {
    const x = MARGIN + indicatorWidth + index * levelWidth
    page.commands.push(rect(x, topY - rowHeight, levelWidth, rowHeight))
    if (normalizeLabel(criterion.gradeLabel) === normalizeLabel(level)) {
      page.commands.push(text("X", x + levelWidth / 2, topY - rowHeight / 2 - 4, {
        size: 13,
        font: "bold",
        align: "center",
      }))
    }
  })

  page.y -= rowHeight
}

function addObservationRow(page: PdfPage, label: string, value: string) {
  const textValue = `${label}: ${value}`
  const rowHeight = Math.max(28, wrapText(textValue, CONTENT_WIDTH - 12, 9).length * 12 + 10)

  page.commands.push(rect(MARGIN, page.y - rowHeight, CONTENT_WIDTH, rowHeight))
  addWrappedText(page, textValue, MARGIN + 6, page.y - 14, CONTENT_WIDTH - 12, { size: 9, font: "bold" })
  page.y -= rowHeight
}

function createPdfBuffer(data: ReportCardPdfData) {
  const pages: PdfPage[] = []
  let page = addPage(pages)
  const levelLabels = getLevelLabels(data)

  addDocumentHeader(page, data)
  addTableHeader(page, levelLabels)

  for (const subject of data.subjects) {
    page = ensureSpace(pages, 60, data, levelLabels)
    addSubjectSection(page, subject.subjectName, subject.teacherName)

    for (const criterion of subject.criteria) {
      page = ensureSpace(pages, getCriterionRowHeight(criterion, levelLabels), data, levelLabels)
      addCriterionRow(page, criterion, levelLabels)
    }
  }

  if (data.directorObservation) {
    page = ensureSpace(pages, 42, data, levelLabels)
    addObservationRow(page, "Observación", data.directorObservation)
  }

  const pageObjectIds: number[] = []
  const contentObjects = pages.map((pdfPage) => pdfPage.commands.join("\n"))
  for (const [index] of contentObjects.entries()) {
    pageObjectIds.push(5 + index * 2)
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ]

  contentObjects.forEach((content, index) => {
    const pageObjectId = pageObjectIds[index]!
    const contentObjectId = pageObjectId + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    )
    objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`)
  })

  const header = "%PDF-1.4\n"
  let body = ""
  const offsets = [0]

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(header + body, "latin1"))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(header + body, "latin1")
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n")

  return Buffer.from(header + body + xref, "latin1")
}

export async function generateReportCardPdf(data: ReportCardPdfData): Promise<GeneratedPdf> {
  const parsed = reportCardPdfDataSchema.parse(data)
  const buffer = createPdfBuffer(parsed)
  const fileName = `boletin-${sanitizeFilePart(parsed.student.fullName) || "alumno"}.pdf`

  return {
    fileName,
    buffer,
    url: `data:application/pdf;base64,${buffer.toString("base64")}`,
  }
}
