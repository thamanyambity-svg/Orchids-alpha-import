export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  headers?: Record<string, string>
) {
  if (!data.length) return

  const keys = Object.keys(data[0])
  const labels: Record<string, string> = headers || keys.reduce((acc, k) => ({ ...acc, [k]: k }), {})

  const csvRows = [
    keys.map(k => `"${labels[k] || k}"`).join(","),
    ...data.map(row =>
      keys.map(k => {
        const val = row[k]
        const str = val === null || val === undefined ? "" : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(",")
    ),
  ].join("\n")

  const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
