"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"

export default function FloatingQuoteBtn() {
  const { t } = useLanguage()
  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5, type: "spring" }}
    >
      <Link href="#devis">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="font-condensed text-xs tracking-[0.2em] uppercase bg-gold text-[#06101e] font-bold px-6 py-3 glow-gold"
        >
          {t("floating_quote.label", "Devis gratuit")}
        </motion.button>
      </Link>
    </motion.div>
  )
}
