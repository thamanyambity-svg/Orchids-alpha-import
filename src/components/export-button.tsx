"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportToCSV } from "@/lib/export-csv"

interface ExportButtonProps {
  data: Record<string, any>[]
  filename: string
  headers?: Record<string, string>
  label?: string
}

export function ExportButton({ data, filename, headers, label = "Exporter CSV" }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    setLoading(true)
    try {
      exportToCSV(data, filename, headers)
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || !data.length}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-1" />
      )}
      {label}
    </Button>
  )
}
