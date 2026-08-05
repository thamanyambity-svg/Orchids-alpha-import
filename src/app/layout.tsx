import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono, Bebas_Neue, Barlow_Condensed } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Polices d'affichage de la vitrine. Elles étaient déclarées via un @import
// Google Fonts dans globals.css, que la CSP du projet bloque (`style-src 'self'`,
// `font-src 'self' data:`) : les titres retombaient silencieusement sur un serif
// générique. Servies par next/font, elles sont auto-hébergées — pas de requête
// externe, pas de CSP à ouvrir, pas de saut de mise en page.
const fontDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
})

const fontCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-condensed",
  display: "swap",
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
    <html
      lang="fr"
      suppressHydrationWarning
      // Les classes `.variable` de next/font doivent être posées sur un élément
      // englobant, sinon les variables CSS ne sont jamais définies — c'était le
      // cas jusqu'ici pour fontSans et fontMono, déclarées mais non appliquées.
      className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontCondensed.variable}`}
    >
      <body className="min-h-screen font-sans">
        <Providers>
          {children}
          <AiAssistant />
        </Providers>
      </body>
    </html>
  )
}
