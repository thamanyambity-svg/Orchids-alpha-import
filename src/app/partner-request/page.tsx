
import { Metadata } from "next"
import Link from "next/link"
import { Building2, Globe2, ShieldCheck, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
    title: "Devenir Partenaire | Alpha A Ambity",
    description: "Rejoignez notre réseau de partenaires logistiques et fournisseurs certifiés.",
}

export default function PartnerRequestPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero Section */}
            <section className="relative py-20 px-4 md:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-background to-secondary/20">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gradient-gold">
                        Devenez Partenaire Certifié
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Rejoignez l'élite des fournisseurs et logisticiens.
                        Accédez à un flux constant de demandes qualifiées et sécurisez vos transactions grâce à notre infrastructure.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all group"
                        >
                            Postuler maintenant
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/how-it-works"
                            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border bg-card hover:bg-muted transition-all font-medium"
                        >
                            Comment ça marche ?
                        </Link>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-4 md:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                            <Globe2 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Réseau International</h3>
                        <p className="text-muted-foreground">
                            Connectez-vous directement avec des acheteurs sérieux en RDC et en Afrique, sans intermédiaires inutiles.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Paiements Garantis</h3>
                        <p className="text-muted-foreground">
                            Ne craignez plus les impayés. Alpha A Ambity sécurise les fonds avant chaque commande via des dépôts vérifiés.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                            <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Dashboard Pro</h3>
                        <p className="text-muted-foreground">
                            Pilotez toutes vos commandes, documents et factures depuis une interface unique dédiée aux partenaires.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="py-20 px-4 md:px-6 lg:px-8 text-center bg-card/30 border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-6">Prêt à développer votre activité ?</h2>
                    <p className="text-muted-foreground mb-8">
                        L'inscription est soumise à validation pour garantir la qualité du réseau.
                    </p>
                    <Link
                        href="mailto:contact@aonosekehouseinvestmentdrc.site?subject=Candidature%20Partenaire%20Alpha%20A%20Ambity"
                        className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
                    >
                        Envoyer une candidature par email
                    </Link>
                </div>
            </section>
        </div>
    )
}
