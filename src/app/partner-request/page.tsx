
import { Metadata } from "next"
import { PartnerWizard } from "@/components/partner-wizard"

export const metadata: Metadata = {
    title: "Devenir Partenaire | Alpha A Ambity",
    description: "Candidature au programme de partenariat officiel.",
}

export default function PartnerRequestPage() {
    return <PartnerWizard />
}
