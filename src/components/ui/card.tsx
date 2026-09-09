import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

/**
 * Titre de carte.
 *
 * Rendu en `h3` et non en `div`. La règle de base pose la police d'affichage
 * sur `h1, h2, h3` : tant que ce composant était un `div`, il ne l'héritait
 * jamais, et les 49 titres de cartes de l'application s'affichaient en Inter
 * pendant que le site vitrine utilisait Bebas Neue. C'est l'écart de
 * typographie visible entre les deux moitiés du produit.
 *
 * Un titre de carte est par ailleurs un titre : `h3` est aussi la balise juste
 * pour la navigation au lecteur d'écran.
 *
 * Pour un libellé d'indicateur — « Commandes à haute valeur » au-dessus d'un
 * chiffre — la police d'affichage n'est pas la bonne : passer `t-label`, qui
 * applique la condensée en capitales prévue par le système.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      // Pas de `font-semibold` : Bebas Neue n'est chargée qu'en graisse 400.
      // Demander 600 fait synthétiser un faux gras par le navigateur — traits
      // épaissis et irréguliers, visible surtout aux petites tailles.
      className={cn("leading-none", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
