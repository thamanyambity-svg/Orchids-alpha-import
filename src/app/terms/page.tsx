
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Conditions Générales d'Utilisation | Alpha A Ambity",
    description: "Conditions régissant l'utilisation de la plateforme Alpha A Ambity.",
}

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">Conditions Générales d'Utilisation (CGU)</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">1. Objet</h2>
                    <p>
                        Les présentes CGU régissent l'utilisation de la plateforme <strong>Alpha A Ambity</strong>, dédiée à la facilitation des importations.
                        En accédant au site, vous acceptez sans réserve ces conditions.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">2. Services Proposés</h2>
                    <p>
                        La plateforme permet aux utilisateurs de soumettre des demandes d'importation, de recevoir des devis, et de suivre leurs commandes.
                        Alpha A Ambity agit en tant qu'intermédiaire et facilitateur logistique.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">3. Engagements de l'Utilisateur</h2>
                    <p>
                        L'utilisateur s'engage à fournir des informations exactes et à ne pas utiliser la plateforme pour des activités illicites (importation de produits interdits, blanchiment, etc.).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">4. Paiements</h2>
                    <p>
                        Les paiements (acomptes et soldes) sont effectués via nos partenaires sécurisés (Stripe, Virements).
                        Toute commande n'est validée qu'après réception des fonds requis (ex: dépôt de 60%).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">5. Responsabilité</h2>
                    <p>
                        Alpha A Ambity s'engage à une obligation de moyens.
                        Nous ne saurions être tenus responsables des retards douaniers, cas de force majeure ou pertes imputables aux transporteurs tiers, bien que nous fassions tout pour les résoudre.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">6. Droit Applicable</h2>
                    <p>
                        Tout litige en relation avec l'utilisation du site est soumis au droit congolais.
                    </p>
                </section>
            </div>
        </div>
    )
}
