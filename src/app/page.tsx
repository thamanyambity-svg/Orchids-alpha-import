"use client"

import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import {
  Hero,
  TrustMarquee,
  EscrowSection,
  ServicesGrid,
  NetworkSection,
  MetricsSection,
  StepsSection,
  Testimonials,
  CTASection,
} from "@/components/site/sections"

export default function Home() {
  useReveal()

  return (
    <SiteShell>
      <Hero />
      <TrustMarquee />
      <EscrowSection />
      <ServicesGrid />
      <NetworkSection />
      <MetricsSection />
      <StepsSection />
      <Testimonials />
      <CTASection />
    </SiteShell>
  )
}
