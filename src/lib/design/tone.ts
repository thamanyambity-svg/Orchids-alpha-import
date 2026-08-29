/**
 * Tonalités sémantiques du système de design.
 *
 * Source unique pour toutes les couleurs porteuses de sens (statuts, alertes,
 * indicateurs). Les classes ci-dessous ne référencent que des jetons de thème,
 * jamais une couleur Tailwind brute : elles restent donc lisibles en thème clair
 * comme en thème sombre. Écrire `text-success` en dur produit du texte
 * illisible sur le fond marine du thème sombre — utiliser ces tonalités à la place.
 */

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger"

export interface ToneClasses {
  /** Pastille de statut : fond discret, texte contrasté, bordure assortie. */
  badge: string
  /** Encart d'information : fond très discret et bordure, pour un bloc entier. */
  surface: string
  /** Texte seul, sans fond. */
  text: string
  /** Icône seule, sans fond. */
  icon: string
  /** Bordure seule. */
  border: string
  /** Petit point d'état plein. */
  dot: string
}

const TONES: Record<Tone, ToneClasses> = {
  neutral: {
    badge: "bg-muted text-muted-foreground border-border",
    surface: "bg-muted/40 border-border",
    text: "text-muted-foreground",
    icon: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
  // La tonalite marque n'utilise pas --primary pour son texte : l'or des
  // boutons, lisible sous une etiquette blanche, tombe a un contraste de 1.9
  // en texte sur fond clair. Elle a donc son propre bronze, --brand.
  brand: {
    badge: "bg-brand-subtle text-brand border-brand-border",
    surface: "bg-brand-subtle/60 border-brand-border",
    text: "text-brand",
    icon: "text-brand",
    border: "border-brand-border",
    dot: "bg-brand",
  },
  info: {
    badge: "bg-info-subtle text-info border-info-border",
    surface: "bg-info-subtle/60 border-info-border",
    text: "text-info",
    icon: "text-info",
    border: "border-info-border",
    dot: "bg-info",
  },
  success: {
    badge: "bg-success-subtle text-success border-success-border",
    surface: "bg-success-subtle/60 border-success-border",
    text: "text-success",
    icon: "text-success",
    border: "border-success-border",
    dot: "bg-success",
  },
  warning: {
    badge: "bg-warning-subtle text-warning border-warning-border",
    surface: "bg-warning-subtle/60 border-warning-border",
    text: "text-warning",
    icon: "text-warning",
    border: "border-warning-border",
    dot: "bg-warning",
  },
  danger: {
    badge: "bg-destructive-subtle text-destructive border-destructive-border",
    surface: "bg-destructive-subtle/60 border-destructive-border",
    text: "text-destructive",
    icon: "text-destructive",
    border: "border-destructive-border",
    dot: "bg-destructive",
  },
}

export function tone(name: Tone): ToneClasses {
  return TONES[name]
}

/** Classes de pastille pour une tonalité — le cas d'usage le plus courant. */
export function toneBadge(name: Tone): string {
  return TONES[name].badge
}

/** Classes d'encart pour une tonalité. */
export function toneSurface(name: Tone): string {
  return TONES[name].surface
}
