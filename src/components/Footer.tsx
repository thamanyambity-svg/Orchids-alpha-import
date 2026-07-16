"use client"

import Link from "next/link"

const footerLinks = {
  Services: ["Gestion des Imports", "Logistique Export", "Dédouanement", "Analyse Supply Chain"],
  Entreprise: ["À propos", "Partenaires", "Carrières", "Blog"],
  Légal: ["Conditions générales", "Politique de confidentialité", "Mentions légales"],
  Contact: ["Kinshasa, RDC", "Guangzhou, Chine", "contact@alphaimport.cd", "+243 999 894 788"],
}

export default function Footer() {
  return (
    <footer className="relative pt-24 pb-10 px-6" style={{ background: "hsl(216 45% 3%)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display text-lg text-white tracking-wider mb-5">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link href="/" className="font-sans text-sm text-white/30 hover:text-gold transition-colors duration-200">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-2xl text-white drop-shadow-[0_0_16px_hsl(42_85%_55%/0.3)]">ALPHA IMPORT</span>
            <span className="font-condensed text-[9px] text-white/15 tracking-[0.2em] uppercase max-w-48 leading-tight">Filiale du Groupe A.Onoseke Investment RDC</span>
          </div>
          <div className="flex items-center gap-6">
            {["LinkedIn", "WhatsApp", "Email"].map((social) => (
              <Link key={social} href="/" className="font-condensed text-xs text-white/20 hover:text-gold tracking-widest uppercase transition-colors duration-200">{social}</Link>
            ))}
          </div>
          <p className="font-condensed text-xs text-white/10 tracking-widest uppercase">
            © {new Date().getFullYear()} Alpha Import Exchange. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
