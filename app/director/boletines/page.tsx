import { getDirectorReportCardListData } from "@/server/services/director-report-card-service"
import { BoletinesClient } from "./boletines-client"

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function BoletinesPage({ searchParams }: Props) {
  const { period } = await searchParams
  const initialData = await getDirectorReportCardListData(period)
  return <BoletinesClient initialData={initialData} />
}
