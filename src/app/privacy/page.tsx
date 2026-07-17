"use client"

import { useLanguage } from "@/lib/i18n-context"

export default function PrivacyPage() {
    const { t } = useLanguage()

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">{t("privacy.title", "Politique de Confidentialité")}</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <p className="text-foreground/80">
                    {t("privacy.intro", "Chez Alpha Import Exchange, nous accordons une grande importance à la protection de vos données personnelles. La présente politique vous informe de la manière dont nous collectons, utilisons et protégeons vos informations.")}
                </p>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section1.title", "1. Responsable du Traitement")}</h2>
                    <p>
                        {t("privacy.section1.content", "Le responsable du traitement des données est la société <strong>A.Onoseke Investment</strong>, située à Kinshasa, République Démocratique du Congo.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section2.title", "2. Données Collectées")}</h2>
                    <p>{t("privacy.section2.intro", "Nous collectons les données suivantes :")}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("privacy.section2.item1", "Données d'identification : nom, prénom, adresse email, numéro de téléphone")}</li>
                        <li>{t("privacy.section2.item2", "Données professionnelles : nom de l'entreprise, numéro de TVA, registre de commerce")}</li>
                        <li>{t("privacy.section2.item3", "Données de transaction : historique des commandes, informations de paiement (traitées via Stripe)")}</li>
                        <li>{t("privacy.section2.item4", "Données de navigation : adresse IP, cookies, pages visitées")}</li>
                        <li>{t("privacy.section2.item5", "Documents justificatifs : pièces d'identité, certificats, factures (selon besoin)")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section3.title", "3. Finalités du Traitement")}</h2>
                    <p>{t("privacy.section3.intro", "Vos données sont traitées pour :")}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("privacy.section3.item1", "La gestion de votre compte et de vos commandes d'importation")}</li>
                        <li>{t("privacy.section3.item2", "Le traitement des paiements via notre prestataire Stripe")}</li>
                        <li>{t("privacy.section3.item3", "La vérification KYC (Know Your Customer) obligatoire")}</li>
                        <li>{t("privacy.section3.item4", "La communication liée au suivi de vos commandes")}</li>
                        <li>{t("privacy.section3.item5", "L'amélioration de nos services et la personnalisation de l'expérience")}</li>
                        <li>{t("privacy.section3.item6", "Le respect de nos obligations légales et réglementaires")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section4.title", "4. Base Légale")}</h2>
                    <p>
                        {t("privacy.section4.content", "Le traitement de vos données repose sur : l'exécution du contrat (utilisation de la plateforme), le consentement (cookies, documents optionnels), et le respect d'obligations légales (KYC, lutte anti-blanchiment).")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section5.title", "5. Destinataires des Données")}</h2>
                    <p>
                        {t("privacy.section5.content", "Vos données sont accessibles à nos équipes habilitées et à nos sous-traitants : Stripe (paiements), Supabase (hébergement base de données), Resend (emails), Vercel (hébergement plateforme). Ces prestataires respectent des clauses de confidentialité strictes.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section6.title", "6. Durée de Conservation")}</h2>
                    <p>
                        {t("privacy.section6.content", "Nous conservons vos données pendant la durée de votre compte actif et jusqu'à 5 ans après la dernière activité (obligations comptables et fiscales). Les documents d'identité sont conservés le temps de la vérification KYC, puis supprimés.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section7.title", "7. Vos Droits")}</h2>
                    <p>{t("privacy.section7.intro", "Conformément à la réglementation applicable, vous disposez des droits suivants :")}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>{t("privacy.section7.item1", "Droit d'accès : obtenir une copie de vos données")}</li>
                        <li>{t("privacy.section7.item2", "Droit de rectification : corriger des informations inexactes")}</li>
                        <li>{t("privacy.section7.item3", "Droit à l'effacement : demander la suppression de vos données")}</li>
                        <li>{t("privacy.section7.item4", "Droit d'opposition : vous opposer à certains traitements")}</li>
                        <li>{t("privacy.section7.item5", "Droit à la portabilité : récupérer vos données dans un format structuré")}</li>
                    </ul>
                    <p className="mt-4">
                        {t("privacy.section7.contact", "Pour exercer ces droits, contactez-nous à : <strong>contact@aonosekehouseinvestmentdrc.site</strong>")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section8.title", "8. Cookies")}</h2>
                    <p>
                        {t("privacy.section8.content", "Nous utilisons des cookies essentiels au fonctionnement de la plateforme (authentification, session). Des cookies analytiques peuvent être utilisés pour améliorer nos services. Vous pouvez configurer vos préférences via les paramètres de votre navigateur.")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section9.title", "9. Sécurité")}</h2>
                    <p>
                        {t("privacy.section9.content", "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement SSL/TLS, accès restreints, audits réguliers, et choix de prestataires conformes aux normes de sécurité (SOC 2, PCI DSS).")}
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t("privacy.section10.title", "10. Contact et Réclamation")}</h2>
                    <p>
                        {t("privacy.section10.content", "Pour toute question relative à la protection de vos données, vous pouvez nous écrire à : <strong>contact@aonosekehouseinvestmentdrc.site</strong>. Vous avez également le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente.")}
                    </p>
                </section>

                <p className="text-xs text-muted-foreground mt-12 pt-6 border-t border-border">
                    {t("privacy.last_updated", "Dernière mise à jour : 17 juillet 2026")}
                </p>
            </div>
        </div>
    )
}
