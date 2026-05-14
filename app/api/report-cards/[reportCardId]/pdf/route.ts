import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireApiDirectorOrAdmin } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

function pdfBufferFromDataUrl(pdfUrl: string) {
  const base64 = pdfUrl.replace(/^data:application\/pdf;base64,/, "")
  return Buffer.from(base64, "base64")
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportCardId: string }> },
) {
  const auth = await requireApiDirectorOrAdmin()
  if (auth.response) return auth.response

  const { reportCardId } = await context.params
  const reportCard = await prisma.reportCard.findUnique({
    where: { id: reportCardId },
    select: {
      id: true,
      type: true,
      pdfUrl: true,
      student: { select: { firstName: true, lastName: true } },
    },
  })

  if (!reportCard?.pdfUrl) {
    return NextResponse.json({ error: "PDF no encontrado" }, { status: 404 })
  }

  const buffer = pdfBufferFromDataUrl(reportCard.pdfUrl)
  const studentName = sanitizeFilePart(`${reportCard.student.lastName}-${reportCard.student.firstName}`) || "alumno"
  const reportType = reportCard.type === "INGLES" ? "ingles" : "espanol"

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boletin-${reportType}-${studentName}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=300",
    },
  })
}
