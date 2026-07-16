"use client"

import { useLanguage } from "@/lib/i18n-context"

export default function LegalPage() {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">{t("legal.title", "Mentions Légales")}</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("legal.section1.title", "1. Éditeur du Site")}</h2>
                    <p>
                        {t("legal.section1.content", 'Le site <strong>Alpha A Ambity</strong> (accessible à l\'adresse https://aonosekehouseinvestmentdrc.site) est édité par la société <strong>A.ONOSEKE INVESTMENT</strong>.')}
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("legal.section1.editor", "<strong>Siège Social :</strong> Kinshasa, République Démocratique du Congo")}</li>
                        <li>{t("legal.section1.address", "<strong>Forme Juridique :</strong> Société par Actions Simplifiée (SAS) / SARL (À confirmer selon statuts)")}</li>
                        <li>{t("legal.section1.email", "<strong>Email de contact :</strong> contact@aonosekehouseinvestmentdrc.site")}</li>
                        <li>{t("legal.section1.phone", "<strong>Téléphone :</strong> +243 999 894 788 / +243 818 924 674")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("legal.section2.title", "2. Hébergement")}</h2>
                    <p>
                        {t("legal.section2.content", "Le site est hébergé par la société <strong>Vercel Inc.</strong><br />\n                        Adresse : 340 S Lemon Ave #4133 Walnut, CA 91789, USA.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("legal.section3.title", "3. Propriété Intellectuelle")}</h2>
                    <p>
                        {t("legal.section3.content", "L'ensemble de ce site relève de la législation internationale sur le droit d'auteur et la propriété intellectuelle.\n                        Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("legal.section4.title", "4. Limitation de Responsabilité")}</h2>
                    <p>
                        {t("legal.section4.content", "Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour,\n                        mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.")}
                    </p>
                </section>
            </div>
        </div>
    )
}
