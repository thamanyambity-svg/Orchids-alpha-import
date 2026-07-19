"use client"

import dynamic from "next/dynamic"
import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import TrustStrip from "@/components/TrustStrip"
import Services from "@/components/Services"
import PartnerCountries from "@/components/PartnerCountries"
import HowItWorks from "@/components/HowItWorks"
import Metrics from "@/components/Metrics"
import Testimonials from "@/components/Testimonials"
import CTASection from "@/components/CTASection"
import Footer from "@/components/Footer"
import FloatingQuoteBtn from "@/components/FloatingQuoteBtn"

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false })
const QuoteForm = dynamic(() => import("@/components/QuoteForm"), { ssr: false })

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <FloatingQuoteBtn />
      <Navbar />
      <Hero />
      <TrustStrip />
      <Services />
      <PartnerCountries />
      <WorldMap />
      <HowItWorks />
      <Metrics />
      <Testimonials />
      <QuoteForm />
      <CTASection />
      <Footer />
    </div>
  )
}
