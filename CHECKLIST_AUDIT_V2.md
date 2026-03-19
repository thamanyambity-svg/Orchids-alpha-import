# Checklist d'audit technique — Alpha Import Exchange
**Date :** 19 mars 2026  
**Version :** 2.0 (finale)  
**Rapport complet :** `rapport_v2_alpha_import.docx`

---

## État général

| Corrections de code | 10 / 11 problèmes corrigés |
|---|---|
| Push GitHub | ⏳ En attente (commande interrompue) |
| Variables Vercel | ⏳ En attente |
| Clés à régénérer | ⏳ En attente |

---

## ✅ Corrections déjà appliquées (code local — commits e6dc814 et suivants)

### Vague 1 — Analyse de code source

- [x] **`src/components/dashboard/header.tsx`** — Ajout de `"use client"` en ligne 1 (cause racine du build cassé depuis le 11 mars)
- [x] **`src/lib/workflow.ts`** — Fix overflow VARCHAR(20) : `baseRef = (requestData.reference || 'REF').slice(-16)` garantit un maximum absolu de 20 caractères pour `orders.reference`
- [x] **`next.config.ts`** — Restriction de `images.remotePatterns` aux domaines légitimes (Supabase, Unsplash, Google User Content) — supprime le wildcard `hostname: '**'`
- [x] **`next.config.ts`** — Suppression de l'import `path` inutilisé (`import path from "node:path"`)
- [x] **`n8n_alpha_import_workflow_FIXED.json`** — Workflow n8n corrigé : 4 événements (`document_uploaded`, `partner_status_update`, `certified_report_requested`, `reminder_awaiting_deposit`) redirigés vers des nœuds dédiés au lieu de `Log Other Events`

### Vague 2 — Corrections TypeScript complémentaires

- [x] **`src/components/admin/edit-partner-dialog.tsx`** — Interface `PartnerWithUser` restructurée avec `Omit<Partial<PartnerProfile>, 'contract_status'>` pour éviter le conflit `string` vs `ContractStatus`
- [x] **`src/components/admin/sidebar.tsx`** — Type de `navItems` annoté explicitement avec la propriété optionnelle `badge?: number`
- [x] **`src/components/dashboard/messaging-card.tsx`** — Cast explicite `payload.new as Message` pour le Realtime Supabase + `alt={partner.full_name ?? ''}` pour l'image Next.js

### Sécurité git

- [x] **`.env.local`** — Retiré du suivi git via `git rm --cached .env.local` (le fichier reste en local mais ne sera plus commité)
- [x] **`.gitignore`** — Vérifier que `.env.local` figure bien dans le fichier

### Vérifications de conformité (aucune action requise)

- [x] **Scan "use client"** — 107 composants client analysés, aucun fichier manquant la directive
- [x] **`typescript.ignoreBuildErrors`** — Déjà à `false` dans `next.config.ts` (TypeScript en mode strict)

---

## ⏳ Actions restantes (votre côté)

### 🔴 Priorité absolue — Sécurité (AVANT le push)

- [ ] **Supabase — `NEXT_PUBLIC_SUPABASE_ANON_KEY`** : supabase.com → Project Settings → API → Regenerate
- [ ] **Supabase — `SUPABASE_SERVICE_ROLE_KEY`** : supabase.com → Project Settings → API → Regenerate *(accès admin total — clé la plus sensible)*
- [ ] **Stripe — `STRIPE_SECRET_KEY`** : dashboard.stripe.com → Developers → API keys → Regenerate
- [ ] **Stripe — `STRIPE_WEBHOOK_SECRET`** : dashboard.stripe.com → Developers → Webhooks → votre endpoint → Signing secret
- [ ] **Resend — `RESEND_API_KEY`** : resend.com → API Keys → Delete and recreate
- [ ] Mettre à jour `.env.local` local avec toutes les nouvelles clés

### 🔴 Aligner les clés Stripe

- [ ] Vérifier que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` et `STRIPE_SECRET_KEY` appartiennent au **même environnement** : `pk_live_` + `sk_live_` pour la production, ou `pk_test_` + `sk_test_` pour les tests — ne jamais mélanger

### 🟡 Vercel — Variables d'environnement

- [ ] Mettre à jour toutes les clés régénérées dans **Settings → Environment Variables**
- [ ] Ajouter **`OPENAI_API_KEY`** (platform.openai.com → API Keys → Create new secret key)
- [ ] Aligner les clés Stripe dans Vercel sur le même environnement

### 🟡 Vercel — Configuration générale

- [ ] **Settings → General → Node.js Version** → sélectionner `20.x` (supprime l'avertissement *Node.js Version Override*)

### 🟡 Déploiement

- [ ] **`git push origin master`** *(push interrompu en fin de session — à relancer après régénération des clés)*
- [ ] Vérifier que le build Vercel passe au vert après le push

### 🟡 n8n

- [ ] Importer `n8n_alpha_import_workflow_FIXED.json` dans votre instance n8n (menu Workflows → Import → remplace l'ancien workflow)
- [ ] Vérifier que la variable `APP_URL` est configurée dans n8n (= `https://aonosekehouseinvestmentdrc.site`)
- [ ] Tester les 4 événements corrigés : `document_uploaded`, `partner_status_update`, `certified_report_requested`, `reminder_awaiting_deposit`

---

## 📋 Recommandations complémentaires (optionnel)

- [ ] **Purger l'historique git** si `.env.local` a déjà été commité et que le dépôt a été accessible à des tiers :
  ```bash
  pip install git-filter-repo
  git filter-repo --path .env.local --invert-paths --force
  git push --force
  ```
- [ ] **Configurer un budget OpenAI** : platform.openai.com → Settings → Limits (le modèle `gpt-4o-mini` est très économique mais une limite mensuelle évite les surprises)
- [ ] **Alertes de coût** sur Supabase, Stripe et Resend pour détecter toute consommation anormale
- [ ] **Pipeline CI/CD GitHub Actions** : exécuter `tsc --noEmit` + `next build` à chaque pull request pour détecter les erreurs TypeScript avant qu'elles atteignent la production

---

*Rapport d'audit complet : `rapport_v2_alpha_import.docx`*  
*Dernière mise à jour : 19 mars 2026*
