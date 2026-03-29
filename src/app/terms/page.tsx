
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Conditions Générales d'Utilisation | Alpha Import Exchange",
    description: "Conditions régissant l'utilisation de la plateforme Alpha Import Exchange.",
}

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">Conditions Générales d&apos;Utilisation (CGU)</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">1. Objet</h2>
                    <p>
                        Les présentes CGU régissent l&apos;utilisation de la plateforme <strong>Alpha Import Exchange</strong> (une filiale de Groupe A.Onoseke House Investment DRC), dédiée à la facilitation des importations.
                        En accédant au site, vous acceptez sans réserve ces conditions.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">2. Services Proposés</h2>
                    <p>
                        La plateforme permet aux utilisateurs de soumettre des demandes d&apos;importation, de recevoir des devis, et de suivre leurs commandes.
                        Alpha Import Exchange agit en tant qu&apos;intermédiaire et facilitateur logistique sécurisé.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">3. Engagements de l&apos;Utilisateur</h2>
                    <p>
                        L&apos;utilisateur s&apos;engage à fournir des informations exactes et à ne pas utiliser la plateforme pour des activités illicites (importation de produits interdits, blanchiment, etc.).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">4. Paiements</h2>
                    <p>
                        Les paiements (acomptes et soldes) sont effectués via nos canaux bancaires sécurisés.
                        Toute commande n&apos;est validée qu&apos;après réception des fonds requis (ex: dépôt de 60%).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">5. Responsabilité</h2>
                    <p>
                        Alpha Import Exchange s&apos;engage à une obligation de moyens.
                        Nous ne saurions être tenus responsables des retards douaniers, cas de force majeure ou pertes imputables aux transporteurs tiers, bien que nous fassions tout pour les résoudre.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">6. Droit Applicable</h2>
                    <p>
                        Tout litige en relation avec l&apos;utilisation du site est soumis au droit de la République Démocratique du Congo.
                    </p>
                </section>
            </div>
        </div>
    )
}
