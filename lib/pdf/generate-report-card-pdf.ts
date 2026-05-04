import { reportCardPdfDataSchema, type ReportCardPdfData } from "./report-card-data.schema"
import { renderReportCardTemplate } from "./report-card-template"

export interface GeneratedPdf {
  fileName: string
  buffer: Buffer
  url: string
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function escapePdfText(value: string) {
  return value
    .replace(/[\r\t]/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function wrapLine(line: string, maxLength = 92) {
  const words = line.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxLength && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function createPdfBuffer(text: string) {
  const pageLines = text
    .split("\n")
    .flatMap((line) => wrapLine(line))
    .slice(0, 54)

  const textCommands = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...pageLines.map((line, index) => `${index === 0 ? "" : "T* "}${`(${escapePdfText(line)}) Tj`}`.trim()),
    "ET",
  ].join("\n")

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(textCommands, "utf-8")} >>\nstream\n${textCommands}\nendstream`,
  ]

  let body = ""
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(`%PDF-1.4\n${body}`, "utf-8"))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const header = "%PDF-1.4\n"
  const xrefOffset = Buffer.byteLength(header + body, "utf-8")
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

  return Buffer.from(header + body + xref, "utf-8")
}

export async function generateReportCardPdf(data: ReportCardPdfData): Promise<GeneratedPdf> {
  const parsed = reportCardPdfDataSchema.parse(data)
  const content = renderReportCardTemplate(parsed)
  const buffer = createPdfBuffer(content)
  const fileName = `boletin-${sanitizeFilePart(parsed.student.fullName) || "alumno"}.pdf`

  return {
    fileName,
    buffer,
    url: `data:application/pdf;base64,${buffer.toString("base64")}`,
  }
}
