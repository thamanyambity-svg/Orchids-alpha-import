import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"

const footerLinks = {
  platform: [
    { href: "/about", label: "Qui sommes-nous ?" },
    { href: "/how-it-works", label: "Comment ça marche" },
    { href: "/countries", label: "Pays partenaires" },
  ],
  legal: [
    { href: "/terms", label: "CGU" },
    { href: "/privacy", label: "Politique de confidentialité" },
    { href: "/legal", label: "Mentions légales" },
  ],
    access: [
      { href: "/register", label: "Devenir acheteur" },
      { href: "/partner-request", label: "Devenir partenaire" },
      { href: "/admin", label: "Administration" },
      { href: "/contact", label: "Nous contacter" },
    ],
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center mb-8 group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center transition-transform group-hover:scale-105">
                  <Image 
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767869085941.png?width=8000&height=8000&resize=contain"
                    alt="Alpha Import Exchange RDC"
                    fill
                    className="object-contain"
                  />
                </div>
              </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              Infrastructure de confiance pour le commerce international Afrique-Asie. 
              Sécurité, traçabilité et contrôle à chaque étape.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Kinshasa, République Démocratique du Congo</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:contact@alphaix.com" className="hover:text-foreground transition-colors">
                  contact@alphaix.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+243000000000" className="hover:text-foreground transition-colors">
                  +243 000 000 000
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Plateforme
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
              Accès
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
              Légal
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
            © {new Date().getFullYear()} Alpha Import Exchange RDC. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Système opérationnel
          </div>
        </div>
      </div>
    </footer>
  )
}
