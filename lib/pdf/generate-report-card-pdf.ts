import fs from "node:fs"
import path from "node:path"
import { inflateSync, deflateSync } from "node:zlib"
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

const HEADER_LOGO_HEIGHT = 130
const HEADER_NO_LOGO_HEIGHT = 50
const STUDENT_ROW_HEIGHT = 25

type Font = "regular" | "bold"

interface PdfPage {
  commands: string[]
  y: number
}

interface LogoData {
  streamBuffer: Buffer  // ready-to-embed bytes (JPEG or deflate-compressed RGB)
  width: number
  height: number
  filter: "DCTDecode" | "FlateDecode"
  decodeParms?: string
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeText(value: string) {
  return value
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeLabel(value: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

function paeth(a: number, b: number, c: number) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function loadPng(buffer: Buffer): LogoData | null {
  // Verify PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) if (buffer[i] !== sig[i]) return null

  let offset = 8
  let width = 0, height = 0, colorType = 0
  const idatChunks: Buffer[] = []

  while (offset + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii")
    const data = buffer.subarray(offset + 8, offset + 8 + len)
    offset += 12 + len

    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      // bitDepth = data[8]  (assumed 8)
      colorType = data[9]!
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data))
    } else if (type === "IEND") break
  }

  if (!width || !height || !idatChunks.length) return null

  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : null
  if (!channels) return null

  const raw = inflateSync(Buffer.concat(idatChunks))
  const stride = width * channels
  const recon = Buffer.alloc(height * stride)
  const rgb = Buffer.alloc(height * width * 3)

  for (let y = 0; y < height; y++) {
    const f = raw[y * (1 + stride)]!
    const base = y * (1 + stride) + 1
    const dst = y * stride

    for (let x = 0; x < stride; x++) {
      const r = raw[base + x]!
      const a = x >= channels ? recon[dst + x - channels]! : 0
      const b = y > 0 ? recon[(y - 1) * stride + x]! : 0
      const c = y > 0 && x >= channels ? recon[(y - 1) * stride + x - channels]! : 0
      recon[dst + x] = f === 0 ? r : f === 1 ? (r + a) & 0xFF : f === 2 ? (r + b) & 0xFF
        : f === 3 ? (r + ((a + b) >> 1)) & 0xFF : (r + paeth(a, b, c)) & 0xFF
    }

    for (let x = 0; x < width; x++) {
      const s = dst + x * channels
      const d = (y * width + x) * 3
      rgb[d] = recon[s]!
      rgb[d + 1] = recon[s + 1]!
      rgb[d + 2] = recon[s + 2]!
    }
  }

  // Re-compress as deflate with PNG None filter (simpler, compatible with Predictor 15)
  const rows = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    rows[y * (1 + width * 3)] = 0  // filter None
    rgb.copy(rows, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3)
  }
  const streamBuffer = deflateSync(rows)

  return {
    streamBuffer,
    width,
    height,
    filter: "FlateDecode",
    decodeParms: `<< /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${width} >>`,
  }
}

function loadJpeg(buffer: Buffer): LogoData | null {
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null
  let i = 2
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xFF) { i++; continue }
    const marker = buffer[i + 1]
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3) {
      const height = (buffer[i + 5]! << 8) | buffer[i + 6]!
      const width = (buffer[i + 7]! << 8) | buffer[i + 8]!
      return { streamBuffer: buffer, width, height, filter: "DCTDecode" }
    }
    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01) { i += 2; continue }
    i += 2 + ((buffer[i + 2]! << 8) | buffer[i + 3]!)
  }
  return null
}

function loadLogo(): LogoData | null {
  for (const name of ["logo-labarden.png", "logo-labarden.jpg"]) {
    try {
      const buf = fs.readFileSync(path.join(process.cwd(), "public", name))
      const logo = name.endsWith(".png") ? loadPng(buf) : loadJpeg(buf)
      if (logo) return logo
    } catch { continue }
  }
  return null
}

function addDocumentHeader(page: PdfPage, data: ReportCardPdfData, logo: LogoData | null) {
  const period = normalizeText(data.period.name).toUpperCase()
  const course = `${data.student.grade}${data.student.division ? ` ${data.student.division}` : ""}`
  const centerX = PAGE_WIDTH / 2

  if (logo) {
    const logoDisplayWidth = 72
    const logoDisplayHeight = Math.round(logoDisplayWidth * logo.height / logo.width)
    const logoX = centerX - logoDisplayWidth / 2
    const logoY = page.y - logoDisplayHeight - 8
    page.commands.push(
      `q ${logoDisplayWidth} 0 0 ${logoDisplayHeight} ${logoX.toFixed(2)} ${logoY.toFixed(2)} cm /Im1 Do Q`
    )

    const titleY = page.y - logoDisplayHeight - 8 - 16
    page.commands.push(text("COLEGIO LABARDÉN", centerX, titleY, { size: 16, font: "bold", align: "center" }))
    page.commands.push(text("Testes Luminis", centerX, titleY - 14, { size: 9, align: "center" }))
    page.commands.push(text(`Boletín de Calificaciones  —  ${period}`, centerX, titleY - 27, { size: 9, align: "center" }))

    page.y -= HEADER_LOGO_HEIGHT
    page.commands.push(`q 0 0 0 RG 1 w ${MARGIN} ${page.y} ${CONTENT_WIDTH} 0 re S Q`)
  }

  page.commands.push(rect(MARGIN, page.y - STUDENT_ROW_HEIGHT, CONTENT_WIDTH, STUDENT_ROW_HEIGHT))
  page.commands.push(text(`NOMBRE DEL ALUMNO: ${data.student.fullName}`, MARGIN + 8, page.y - 17, { size: 11, font: "bold" }))
  page.commands.push(text(`CURSO: ${course}`, PAGE_WIDTH - MARGIN - 115, page.y - 17, { size: 11, font: "bold" }))
  page.y -= STUDENT_ROW_HEIGHT
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
  const rowHeight = 30

  page.commands.push(rect(MARGIN, page.y - rowHeight, indicatorWidth, rowHeight, "0.93 0.93 0.93"))
  page.commands.push(text("Indicadores de logro en las áreas", MARGIN + indicatorWidth / 2, page.y - 19, {
    size: 9,
    font: "bold",
    align: "center",
  }))

  levelLabels.forEach((label, index) => {
    const x = MARGIN + indicatorWidth + index * levelWidth
    page.commands.push(rect(x, page.y - rowHeight, levelWidth, rowHeight, "0.93 0.93 0.93"))
    wrapText(label, levelWidth - 6, 7).slice(0, 3).forEach((line, lineIndex) => {
      page.commands.push(text(line, x + levelWidth / 2, page.y - 11 - lineIndex * 8, {
        size: 7,
        font: "bold",
        align: "center",
      }))
    })
  })

  page.y -= rowHeight
}

function ensureSpace(pages: PdfPage[], minHeight: number, data: ReportCardPdfData, levelLabels: string[], logo: LogoData | null) {
  let page = pages[pages.length - 1]
  if (!page) page = addPage(pages)
  if (page.y - minHeight >= BOTTOM_Y) return page

  page = addPage(pages)
  addDocumentHeader(page, data, null) // no logo on continuation pages
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
  const logo = loadLogo()
  const pages: PdfPage[] = []
  let page = addPage(pages)
  const levelLabels = getLevelLabels(data)

  addDocumentHeader(page, data, logo)

  if (data.absences?.length) {
    for (const absence of data.absences) {
      page = ensureSpace(pages, 32, data, levelLabels, logo)
      addObservationRow(page, absence.label, absence.value)
    }
  }

  addTableHeader(page, levelLabels)

  for (const subject of data.subjects) {
    page = ensureSpace(pages, 60, data, levelLabels, logo)
    addSubjectSection(page, subject.subjectName, subject.teacherName)

    for (const criterion of subject.criteria) {
      page = ensureSpace(pages, getCriterionRowHeight(criterion, levelLabels), data, levelLabels, logo)
      addCriterionRow(page, criterion, levelLabels)
    }

    if (typeof subject.numericGrade === "number") {
      page = ensureSpace(pages, 32, data, levelLabels, logo)
      addObservationRow(page, "Nota", String(subject.numericGrade))
    }
  }

  if (data.comments?.length) {
    for (const comment of data.comments) {
      page = ensureSpace(pages, 32, data, levelLabels, logo)
      addObservationRow(page, comment.label, comment.value)
    }
  }

  if (data.directorObservation) {
    page = ensureSpace(pages, 42, data, levelLabels, logo)
    addObservationRow(page, "Observación", data.directorObservation)
  }

  // Fixed objects: Catalog, Pages, Font Regular, Font Bold [, Image XObject]
  // Object IDs start at 1
  const CATALOG_ID = 1
  const PAGES_ID = 2
  const FONT_REGULAR_ID = 3
  const FONT_BOLD_ID = 4
  const IMAGE_ID = logo ? 5 : null
  const FIRST_PAGE_ID = logo ? 6 : 5

  const pageObjectIds = pages.map((_, i) => FIRST_PAGE_ID + i * 2)

  const pagesDict = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`
  const xObjectResources = IMAGE_ID ? ` /XObject << /Im1 ${IMAGE_ID} 0 R >>` : ""
  const contentObjects = pages.map((p) => p.commands.join("\n"))

  // Build ordered list of [objectId, objectBody] pairs
  const entries: Array<[number, string]> = [
    [CATALOG_ID, "<< /Type /Catalog /Pages 2 0 R >>"],
    [PAGES_ID, pagesDict],
    [FONT_REGULAR_ID, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"],
    [FONT_BOLD_ID, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"],
  ]

  if (logo && IMAGE_ID) {
    const streamStr = logo.streamBuffer.toString("latin1")
    const decodeParms = logo.decodeParms ? ` /DecodeParms ${logo.decodeParms}` : ""
    entries.push([
      IMAGE_ID,
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${logo.filter}${decodeParms} /Length ${logo.streamBuffer.length} >>\nstream\n${streamStr}\nendstream`,
    ])
  }

  contentObjects.forEach((content, i) => {
    const pageId = pageObjectIds[i]!
    const contentId = pageId + 1
    entries.push([
      pageId,
      `<< /Type /Page /Parent ${PAGES_ID} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${FONT_REGULAR_ID} 0 R /F2 ${FONT_BOLD_ID} 0 R >>${xObjectResources} >> /Contents ${contentId} 0 R >>`,
    ])
    entries.push([
      contentId,
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    ])
  })

  const header = "%PDF-1.4\n"
  let body = ""
  const offsets: number[] = []

  for (const [, objectBody] of entries) {
    offsets.push(Buffer.byteLength(header + body, "latin1"))
    const id = entries[offsets.length - 1]![0]
    body += `${id} 0 obj\n${objectBody}\nendobj\n`
  }

  const totalObjects = entries.length
  const xrefOffset = Buffer.byteLength(header + body, "latin1")

  const xref = [
    "xref",
    `0 ${totalObjects + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${totalObjects + 1} /Root ${CATALOG_ID} 0 R >>`,
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
