/**
 * Valeur sûre à écrire dans un journal.
 *
 * Un journal reçoit souvent des données venues du dehors : adresse
 * électronique, identifiant d'un webhook, statut transmis par un tiers. Ces
 * valeurs peuvent contenir des retours à la ligne, et une ligne forgée
 * ressemble alors à une entrée authentique — de quoi masquer une trace ou en
 * fabriquer une. Elles peuvent aussi être énormes et noyer le journal.
 *
 * Deux passes : la première retire retours chariot et sauts de ligne — c'est
 * elle qui empêche la fabrication d'une fausse ligne ; la seconde balaie les
 * autres caractères de contrôle. La longueur est ensuite bornée, pour qu'une
 * valeur démesurée ne noie pas le journal.
 */
export function journal(valeur: unknown, longueurMax = 200): string {
  const texte =
    valeur instanceof Error
      ? valeur.message
      : typeof valeur === 'string'
        ? valeur
        : (() => {
            try {
              return JSON.stringify(valeur) ?? String(valeur)
            } catch {
              return String(valeur)
            }
          })()

  // Expressions écrites sur place : une analyse statique ne reconnaît le
  // nettoyage que si le motif est visible à l'appel, pas rangé dans une
  // constante voisine.
  const propre = texte.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
  return propre.length > longueurMax ? `${propre.slice(0, longueurMax)}…` : propre
}
