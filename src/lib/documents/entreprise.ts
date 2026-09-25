/**
 * Identité d'Alpha Import Exchange sur les documents commerciaux.
 *
 * Un seul endroit pour l'en-tête, le pied de page et les coordonnées
 * bancaires : la pro forma, le bon de commande et la facture finale y
 * puisent. Un champ laissé vide n'est tout simplement pas imprimé — mieux
 * vaut une ligne absente qu'un numéro inventé sur un document commercial.
 *
 * À compléter par l'administration : numéros légaux, adresse exacte,
 * coordonnées bancaires.
 */

export interface Banque {
  nom: string
  titulaire: string
  /** Numéro de compte ou IBAN, tel qu'il doit apparaître. */
  compte: string
  swift: string
  /** Précision utile au donneur d'ordre : devise du compte, frais, etc. */
  mention: string
}

export const ENTREPRISE = {
  nom: 'ALPHA IMPORT EXCHANGE',
  raisonSociale: 'A. Onoseke House Investment RDC',
  activite: 'Import · Sourcing · Logistique · Dédouanement',
  adresse: '332/40, av. Révolution, Q/Résidentiel, C/Limete, Kinshasa',
  pays: 'République Démocratique du Congo',
  // Extrait du Registre du Commerce et du Crédit Mobilier, immatriculation du
  // 22/10/2021 au Guichet unique de Kinshasa/Matete.
  rccm: 'CD/KNM/RCCM/21-A-01949',
  // Restent à fournir par l'administration.
  idNat: '',
  nif: '',
  capital: '',
  telephones: ['+243 999 894 788', '+243 818 924 674'],
  email: 'contact@aonosekehouseinvestmentdrc.site',
  site: 'aonosekehouseinvestmentdrc.site',
} as const

export const BANQUE: Banque = {
  nom: '',
  titulaire: '',
  compte: '',
  swift: '',
  mention: '',
}

/** Lignes d'identité de l'émetteur, dans l'ordre, sans les champs non renseignés. */
export function lignesEmetteur(): string[] {
  const identifiants = [
    ENTREPRISE.rccm && `RCCM ${ENTREPRISE.rccm}`,
    ENTREPRISE.idNat && `ID NAT ${ENTREPRISE.idNat}`,
    ENTREPRISE.nif && `NIF ${ENTREPRISE.nif}`,
  ].filter(Boolean)

  return [
    ENTREPRISE.raisonSociale,
    `${ENTREPRISE.adresse} · ${ENTREPRISE.pays}`,
    identifiants.join(' · '),
    `${ENTREPRISE.telephones.join(' · ')} · ${ENTREPRISE.email}`,
  ].filter((l): l is string => Boolean(l && l.trim()))
}

/** Coordonnées bancaires, ou null tant qu'elles ne sont pas renseignées. */
export function lignesBanque(): string[] | null {
  const lignes = [
    BANQUE.nom && `Banque : ${BANQUE.nom}`,
    BANQUE.titulaire && `Titulaire : ${BANQUE.titulaire}`,
    BANQUE.compte && `Compte : ${BANQUE.compte}`,
    BANQUE.swift && `SWIFT / BIC : ${BANQUE.swift}`,
    BANQUE.mention,
  ].filter((l): l is string => Boolean(l && l.trim()))
  return lignes.length > 0 ? lignes : null
}

/** Pied de page : raison sociale, capital et numéros, tels que disponibles. */
export function piedEntreprise(): string {
  return [
    ENTREPRISE.raisonSociale,
    ENTREPRISE.capital && `Capital ${ENTREPRISE.capital}`,
    `${ENTREPRISE.adresse} · ${ENTREPRISE.pays}`,
    ENTREPRISE.rccm && `RCCM ${ENTREPRISE.rccm}`,
    ENTREPRISE.site,
  ]
    .filter((l) => Boolean(l && String(l).trim()))
    .join(' · ')
}
