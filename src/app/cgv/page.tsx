"use client"

import { useLanguage } from "@/lib/i18n-context"

export default function CgvPage() {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">
                {t("cgv.title", "Conditions Générales de Vente (CGV)")}
            </h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section1.title", "1. Champ d'Application")}</h2>
                    <p>
                        {t("cgv.section1.content", "Les présentes Conditions Générales de Vente régissent les prestations de service d'importation fournies par <strong>Alpha Import Exchange</strong> (filiale de A.Onoseke House Investment RDC) à ses clients acheteurs. Elles prévalent sur tout document contradictoire.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section2.title", "2. Devis et Acceptation")}</h2>
                    <p>
                        {t("cgv.section2.content", "Le devis établi par notre partenaire fournisseur est communiqué au client via la plateforme. L'acceptation du devis vaut commande ferme et engage le client au paiement de l'acompte de 60%.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section3.title", "3. Tarifs et Paiement")}</h2>
                    <p>{t("cgv.section3.intro", "Les prix sont indiqués en Euros (EUR) et s'entendent FOB ou CIF selon le devis.")}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("cgv.section3.item1", "Acompte 60% : exigible à la validation de la commande")}</li>
                        <li>{t("cgv.section3.item2", "Solde 40% : exigible à la confirmation de livraison")}</li>
                        <li>{t("cgv.section3.item3", "Paiement par carte bancaire ou prélèvement SEPA via Stripe")}</li>
                        <li>{t("cgv.section3.item4", "Commission Alpha Import Exchange : 10% du montant total")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section4.title", "4. Délais de Livraison")}</h2>
                    <p>
                        {t("cgv.section4.content", "Les délais indiqués sont fournis à titre indicatif. Alpha Import Exchange s'engage à une obligation de moyens et ne saurait être tenu responsable des retards dus aux transports maritimes, aux formalités douanières, ou à des cas de force majeure.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section5.title", "5. Transport et Douane")}</h2>
                    <p>
                        {t("cgv.section5.content", "Le transport est organisé par nos partenaires logistiques. Les droits de douane et taxes locales sont à la charge du client acheteur, sauf stipulation contraire dans le devis. Alpha Import Exchange assiste le client dans ses démarches douanières.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section6.title", "6. Réception et Réclamations")}</h2>
                    <p>
                        {t("cgv.section6.content", "Le client dispose de 48 heures après réception pour émettre une réclamation via la plateforme. Passé ce délai, la marchandise est réputée conforme. Toute réclamation doit être accompagnée de preuves photographiques.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section7.title", "7. Droit de Rétractation")}</h2>
                    <p>
                        {t("cgv.section7.content", "Conformément à la réglementation applicable aux prestations de services B2B, le droit de rétractation ne s'applique pas aux commandes d'importation fermes. L'acompte versé n'est pas remboursable sauf en cas de non-exécution avérée imputable à Alpha Import Exchange.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section8.title", "8. Propriété Intellectuelle")}</h2>
                    <p>
                        {t("cgv.section8.content", "Les documents (devis, certificats, rapports) fournis par Alpha Import Exchange restent notre propriété intellectuelle. Le client s'interdit de les diffuser à des tiers sans notre accord écrit.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("cgv.section9.title", "9. Litiges")}</h2>
                    <p>
                        {t("cgv.section9.content", "Tout litige relatif à l'interprétation ou à l'exécution des présentes est soumis au droit de la République Démocratique du Congo. À défaut de résolution amiable, les tribunaux de Kinshasa sont seuls compétents.")}
                    </p>
                </section>
            </div>
        </div>
    )
}
