"use client"

import { useEffect, useState } from "react"
import { getEmptyPlatformData, type PlatformData } from "@/lib/presentation-data"

export function usePlatformData() {
  const [data, setData] = useState<PlatformData>(() => getEmptyPlatformData())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/platform-data", { cache: "no-store" })
        if (!response.ok) return
        const nextData = (await response.json()) as PlatformData
        if (isMounted) setData(nextData)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [])

  return { data, isLoading }
}
