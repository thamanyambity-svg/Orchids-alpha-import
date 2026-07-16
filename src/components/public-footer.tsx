import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"
import { useLanguage } from "@/lib/i18n-context"

export function PublicFooter() {
  const { t } = useLanguage()

  const footerLinks = {
  platform: [
    { href: "/about", label: t("nav.about", "Qui sommes-nous ?") },
    { href: "/how-it-works", label: t("nav.how-it-works", "Comment ça marche") },
    { href: "/countries", label: t("nav.countries", "Pays partenaires") },
  ],
  legal: [
    { href: "/terms", label: t("nav.terms", "CGU") },
    { href: "/privacy", label: t("nav.privacy", "Politique de confidentialité") },
    { href: "/legal", label: t("nav.legal", "Mentions légales") },
  ],
  access: [
    { href: "/register", label: t("nav.register", "Devenir acheteur") },
    { href: "/partner-request", label: t("nav.partner", "Devenir partenaire") },
    { href: "/admin", label: t("nav.admin", "Administration") },
    { href: "/contact", label: t("nav.contact", "Nous contacter") },
  ],
}

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-8 group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center bg-black rounded-lg transition-transform group-hover:scale-105">
                <Image
                  src="/logo-alpha-import.png?v=4"
                  alt="Alpha Import Exchange"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              {t("publicfooter.description", "Infrastructure de confiance pour le commerce international Afrique-Asie.")}
              {t("publicfooter.security", "Sécurité, traçabilité et contrôle à chaque étape.")}
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{t("publicfooter.address", "Kinshasa, République Démocratique du Congo")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:contact@aonosekehouseinvestmentdrc.site" className="hover:text-foreground transition-colors">
                  contact@aonosekehouseinvestmentdrc.site
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+243999894788" className="hover:text-foreground transition-colors">
                  +243 999 894 788 / +243 818 924 674
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              {t("publicfooter.section.platform", "Plateforme")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              {t("publicfooter.section.access", "Accès")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.access.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              {t("publicfooter.section.legal", "Légal")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} A.Onoseke Investment / Alpha A Ambity. {t("publicfooter.rights", "Tous droits réservés.")}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t("publicfooter.status", "Système opérationnel")}
          </div>
        </div>
      </div>
    </footer>
  )
}
