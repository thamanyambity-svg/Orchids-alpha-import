import type { Metadata, Viewport } from "next"
import { DM_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const _fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const _fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const viewport: Viewport = {
  themeColor: '#C5A059',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://aonosekehouseinvestmentdrc.site'),
  title: {
    default: "Alpha Import Exchange RDC | Sécurisation Import Chine-Turquie-Dubai-Japon-Thaïlande",
    template: "%s | Alpha Import Exchange"
  },
  description: "L'infrastructure de confiance pour vos importations en RDC. Sécurisation financière (60/40), logistique maîtrisée et partenaires certifiés en Chine, Turquie, Dubai, Japon et Thaïlande.",
  keywords: ["Import RDC", "Logistique Congo", "Achat Chine Kinshasa", "Import Turquie RDC", "Cargo Dubai Kinshasa", "Alpha Import", "Sécurisation paiement import"],
  authors: [{ name: "Alpha Import Exchange" }],
  creator: "Alpha Import Exchange",
  publisher: "Alpha Import Exchange",
  openGraph: {
    type: "website",
    locale: "fr_CD",
    url: "https://aonosekehouseinvestmentdrc.site",
    title: "Alpha Import Exchange | L'Import Sans Risque",
    description: "Sécurisez vos fonds à 100%. Ne payez le solde qu'à la livraison. Infrastructure certifiée pour la RDC.",
    siteName: "Alpha Import Exchange RDC",
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Alpha Import Exchange - Infrastructure de Confiance'
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alpha Import Exchange RDC",
    description: "Sécurisez vos fonds à 100%. Ne payez le solde qu'à la livraison.",
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

import { AiAssistant } from "@/components/ai-assistant"

// ... imports remain same ...

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
          <AiAssistant />
        </Providers>
      </body>
    </html>
  )
}
