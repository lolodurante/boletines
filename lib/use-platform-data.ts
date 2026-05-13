"use client"

import { useCallback, useEffect, useState } from "react"
import { getEmptyPlatformData, type PlatformData } from "@/lib/presentation-data"

export function usePlatformData() {
  const [data, setData] = useState<PlatformData>(() => getEmptyPlatformData())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/platform-data", { cache: "no-store", credentials: "same-origin" })
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
        return
      }
      if (!response.ok) {
        setError("No se pudieron cargar los datos de la plataforma.")
        return
      }
      setData((await response.json()) as PlatformData)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/platform-data", { cache: "no-store", credentials: "same-origin" })
        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
          return
        }
        if (!response.ok) {
          if (isMounted) setError("No se pudieron cargar los datos de la plataforma.")
          return
        }
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

  return { data, isLoading, error, reload }
}
