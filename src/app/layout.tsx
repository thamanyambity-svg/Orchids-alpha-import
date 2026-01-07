import type { Metadata } from "next"
import "./globals.css"
import { VisualEditsMessenger } from "orchids-visual-edits"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Alpha Import Exchange | Secure International Trade",
  description: "Infrastructure de confiance pour le commerce international. Sécurité, traçabilité, contrôle.",
  keywords: ["import", "export", "trade", "africa", "asia", "secure", "logistics"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'oklch(0.10 0.015 260)',
              border: '1px solid oklch(0.22 0.02 260)',
              color: 'oklch(0.95 0.01 260)',
            },
          }}
        />
        <VisualEditsMessenger />
      </body>
    </html>
  )
}
