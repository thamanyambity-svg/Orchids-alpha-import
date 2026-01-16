import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "Alpha A Ambity | Secure International Trade",
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
