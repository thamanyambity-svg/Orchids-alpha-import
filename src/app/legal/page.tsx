
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Mentions Légales | Alpha A Ambity",
    description: "Mentions légales et informations administratives de la plateforme Alpha A Ambity.",
}

export default function LegalPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gradient-gold">Mentions Légales</h1>

            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">1. Éditeur du Site</h2>
                    <p>
                        Le site <strong>Alpha A Ambity</strong> (accessible à l&apos;adresse https://aonosekehouseinvestmentdrc.site) est édité par la société <strong>A.ONOSEKE INVESTMENT</strong>.
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Siège Social :</strong> Kinshasa, République Démocratique du Congo</li>
                        <li><strong>Forme Juridique :</strong> Société par Actions Simplifiée (SAS) / SARL (À confirmer selon statuts)</li>
                        <li><strong>Email de contact :</strong> contact@aonosekehouseinvestmentdrc.site</li>
                        <li><strong>Téléphone :</strong> +243 999 894 788 / +243 818 924 674</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">2. Hébergement</h2>
                    <p>
                        Le site est hébergé par la société <strong>Vercel Inc.</strong><br />
                        Adresse : 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">3. Propriété Intellectuelle</h2>
                    <p>
                        L&apos;ensemble de ce site relève de la législation internationale sur le droit d&apos;auteur et la propriété intellectuelle.
                        Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">4. Limitation de Responsabilité</h2>
                    <p>
                        Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour,
                        mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.
                    </p>
                </section>
            </div>
        </div>
    )
}
