"use client"

import { useLanguage } from "@/lib/i18n-context"

export default function PrivacyPage() {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">{t("privacy.title", "Politique de Confidentialité")}</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section1.title", "1. Collecte des Données")}</h2>
                    <p>
                        {t("privacy.section1.content", "Nous collectons uniquement les données nécessaires au bon fonctionnement de nos services d'importation :\n                        nom, adresse email, numéro de téléphone, et détails des transactions commerciales.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section2.title", "2. Utilisation des Données")}</h2>
                    <p>
                        {t("privacy.section2.content_intro", "Vos données sont utilisées pour :")}
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("privacy.section2.item1", "Gérer votre compte et vos commandes.")}</li>
                        <li>{t("privacy.section2.item2", "Communiquer avec vous concernant l'état de vos importations.")}</li>
                        <li>{t("privacy.section2.item3", "Améliorer nos services et prévenir la fraude.")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section3.title", "3. Partage des Données")}</h2>
                    <p>
                        {t("privacy.section3.content", "Vos informations peuvent être partagées avec nos partenaires logistiques et fournisseurs (en Chine, Turquie, etc.)\n                        uniquement dans le cadre strict de l'exécution de vos commandes. Nous ne vendons jamais vos données à des tiers à des fins publicitaires.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section4.title", "4. Sécurité")}</h2>
                    <p>
                        {t("privacy.section4.content", "Nous mettons en œuvre des mesures de sécurité techniques (chiffrement, accès restreint) pour protéger vos informations personnelles.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section5.title", "5. Vos Droits")}</h2>
                    <p>
                        {t("privacy.section5.content", "Conformément aux lois en vigueur, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.\n                        Pour exercer ce droit, contactez-nous à : contact@aonosekehouseinvestmentdrc.site")}
                    </p>
                </section>
            </div>
        </div>
    )
}
