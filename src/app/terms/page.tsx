"use client"

import { useLanguage } from "@/lib/i18n-context"

export default function TermsPage() {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">{t("terms.title", "Conditions Générales d'Utilisation (CGU)")}</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section1.title", "1. Objet")}</h2>
                    <p>
                        {t("terms.section1.content", "Les présentes CGU régissent l'utilisation de la plateforme <strong>Alpha Import Exchange</strong> (une filiale de Groupe A.Onoseke House Investment RDC), dédiée à la facilitation des importations.\n                        En accédant au site, vous acceptez sans réserve ces conditions.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section2.title", "2. Services Proposés")}</h2>
                    <p>
                        {t("terms.section2.content", "La plateforme permet aux utilisateurs de soumettre des demandes d'importation, de recevoir des devis, et de suivre leurs commandes.\n                        Alpha Import Exchange agit en tant qu'intermédiaire et facilitateur logistique sécurisé.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section3.title", "3. Engagements de l'Utilisateur")}</h2>
                    <p>
                        {t("terms.section3.content", "L'utilisateur s'engage à fournir des informations exactes et à ne pas utiliser la plateforme pour des activités illicites (importation de produits interdits, blanchiment, etc.).")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section4.title", "4. Paiements")}</h2>
                    <p>
                        {t("terms.section4.content", "Les paiements (acomptes et soldes) sont effectués via nos canaux bancaires sécurisés.\n                        Toute commande n'est validée qu'après réception des fonds requis (ex: dépôt de 60%).")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section5.title", "5. Responsabilité")}</h2>
                    <p>
                        {t("terms.section5.content", "Alpha Import Exchange s'engage à une obligation de moyens.\n                        Nous ne saurions être tenus responsables des retards douaniers, cas de force majeure ou pertes imputables aux transporteurs tiers, bien que nous fassions tout pour les résoudre.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("terms.section6.title", "6. Droit Applicable")}</h2>
                    <p>
                        {t("terms.section6.content", "Tout litige en relation avec l'utilisation du site est soumis au droit de la République Démocratique du Congo.")}
                    </p>
                </section>
            </div>
        </div>
    )
}
