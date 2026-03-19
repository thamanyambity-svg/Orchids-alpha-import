# Checklist des actions — Rapport d'audit Alpha Import Exchange (Mars 2026)

Ce document reprend les actions à effectuer côté équipe / config, issues du rapport d'audit technique. Les corrections de code sont déjà implémentées.

---

## Actions immédiates (avant le prochain push)

### 1. Régénérer toutes les clés exposées (PRIORITÉ ABSOLUE)

| Service | Clé à régénérer | Où régénérer |
|---------|-----------------|---------------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [supabase.com](https://supabase.com) → Project Settings → API |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | [supabase.com](https://supabase.com) → Project Settings → API |
| **Stripe** | `STRIPE_SECRET_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys |
| **Resend** | `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys → Create API Key |

Après régénération :
- Mettre à jour `.env.local` (local)
- Mettre à jour les variables dans **Vercel** : Settings → Environment Variables

---

### 2. Retirer .env.local du suivi git (si pas déjà fait)

```bash
git rm --cached .env.local
git commit -m "chore: remove .env.local from git tracking"
git push
```

---

### 3. Aligner les clés Stripe (même environnement)

**Ne pas mélanger** clés live et test.

| Environnement | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `STRIPE_SECRET_KEY` |
|---------------|--------------------------------------|---------------------|
| **Production** | `pk_live_...` | `sk_live_...` |
| **Test** | `pk_test_...` | `sk_test_...` |

Vérifier aussi que `STRIPE_WEBHOOK_SECRET` est défini dans Vercel (Stripe → Developers → Webhooks → Signing secret).

---

### 4. Ajouter la clé OpenAI (analyse IA des emails)

- Créer une clé sur [platform.openai.com](https://platform.openai.com) → API Keys → Create new secret key
- L'ajouter dans **Vercel** : Settings → Environment Variables → `OPENAI_API_KEY`
- Idéalement, définir un plafond mensuel dans OpenAI Settings → Limits

---

### 5. Configurer Node.js 20 dans Vercel

Vercel → Project Settings → General → **Node.js Version** → sélectionner **20.x**

---

## Configuration n8n

- Importer le fichier `n8n_alpha_import_workflow.json` dans n8n (remplace l’ancien workflow)
- Remplacer les placeholders Slack (`YOUR/WEBHOOK/URL`, `YOUR/WEBHOOK/FINANCE`) par les vraies URLs
- Définir la variable `APP_URL` dans n8n = URL du site (ex. `https://aonosekehouseinvestmentdrc.site`)

---

## Checklist rapide avant déploiement

- [ ] Clés Supabase, Stripe, Resend régénérées et mises à jour
- [ ] Clés Stripe alignées (pk_live + sk_live OU pk_test + sk_test)
- [ ] `STRIPE_WEBHOOK_SECRET` configuré dans Vercel
- [ ] `OPENAI_API_KEY` ajoutée dans Vercel
- [ ] Node.js 20.x sélectionné dans Vercel
- [ ] `.env.local` retiré du suivi git et push effectué
- [ ] Workflow n8n mis à jour et importé

---

## Recommandation : purger l’historique git (optionnel)

Si `.env.local` a déjà été commité et que le dépôt est partagé, `git rm --cached` ne supprime pas l’historique. Pour une purge complète :

```bash
pip install git-filter-repo
git filter-repo --path .env.local --invert-paths
git push --force
```

Attention : réécrit l’historique. Les collaborateurs devront refaire un `git clone`.

---

## Corrections déjà appliquées dans le code

- `src/components/dashboard/header.tsx` — ajout de `"use client"`
- `src/lib/workflow.ts` — correction overflow VARCHAR(20) pour les références d’ordres
- `next.config.ts` — restriction des domaines d’images (remotePatterns)
- `n8n_alpha_import_workflow.json` — nœuds dédiés pour document, partner_status, report, reminder
- `.env.example` — modèle des variables d’environnement
