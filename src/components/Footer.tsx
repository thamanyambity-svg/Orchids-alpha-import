"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"

export default function Footer() {
  const { t } = useLanguage()

  const footerLinks = {
    [t("footer.services", "Services")]: [t("footer.services.imports", "Gestion des Imports"), t("footer.services.export", "Logistique Export"), t("footer.services.customs", "Dédouanement"), t("footer.services.analysis", "Analyse Supply Chain")],
    [t("footer.company", "Entreprise")]: [t("footer.company.about", "À propos"), t("footer.company.partners", "Partenaires"), t("footer.company.careers", "Carrières"), t("footer.company.blog", "Blog")],
    [t("footer.legal", "Légal")]: [t("footer.terms", "Conditions générales"), t("footer.privacy", "Politique de confidentialité"), t("footer.legal.notices", "Mentions légales")],
    [t("footer.contact", "Contact")]: [t("footer.address", "Kinshasa, RDC"), t("footer.address.guangzhou", "Guangzhou, Chine"), t("footer.email", "contact@alphaimport.cd"), t("footer.phone", "+243 999 894 788")],
  }

  return (
    <footer className="relative pt-24 pb-10 px-6" style={{ background: "hsl(216 45% 3%)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display text-lg text-white tracking-wider mb-5">{category}</h4>
              <ul className="space-y-3">
                {links.map((link, idx) => {
                  const href = category === "Légal" || category === "Legal"
                    ? idx === 0 ? "/terms"
                      : idx === 1 ? "/privacy"
                      : "/legal"
                    : "/"
                  return (
                    <li key={link}>
                      <Link href={href} className="font-sans text-sm text-white/30 hover:text-gold transition-colors duration-200">{link}</Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-2xl text-white drop-shadow-[0_0_16px_hsl(42_85%_55%/0.3)]">ALPHA IMPORT</span>
            <span className="font-condensed text-[9px] text-white/15 tracking-[0.2em] uppercase max-w-48 leading-tight">{t("footer.subsidiary", "Filiale du Groupe A.Onoseke Investment RDC")}</span>
          </div>
          <div className="flex items-center gap-6">
            {[t("footer.linkedin", "LinkedIn"), t("footer.whatsapp", "WhatsApp"), t("footer.email.link", "Email")].map((social) => (
              <Link key={social} href="/" className="font-condensed text-xs text-white/20 hover:text-gold tracking-widest uppercase transition-colors duration-200">{social}</Link>
            ))}
          </div>
          <p className="font-condensed text-xs text-white/10 tracking-widest uppercase">
            &copy; {new Date().getFullYear()} Alpha Import Exchange. {t("footer.rights", "Tous droits réservés.")}
          </p>
        </div>
      </div>
    </footer>
  )
}
