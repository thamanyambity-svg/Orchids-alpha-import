## 📋 CHECKLIST DE DÉPLOIEMENT - SYSTÈME SEPA 60/40

**Projet**: Orchids-alpha-import  
**Date**: 14 juillet 2026  
**Status**: ✅ Prêt pour déploiement

---

## PRÉ-DÉPLOIEMENT (Local)

- [ ] Cloner le commit `feat(payment): implement SEPA automatic debit 60/40 system...`
- [ ] Vérifier que toutes les dépendances sont installées
  ```bash
  npm install
  ```
- [ ] Vérifier que le projet build sans erreur
  ```bash
  npm run build
  ```
- [ ] Lancer les tests TypeScript
  ```bash
  npm run typecheck
  ```

## CONFIGURATION D'ENVIRONNEMENT

### Stripe Dashboard Configuration

**URL**: https://dashboard.stripe.com

- [ ] Naviguer vers Développeurs > Clés API
- [ ] **Copier la clé secrète** → `STRIPE_SECRET_KEY`
  - Format: `sk_live_...` (pour production)
  - Format: `sk_test_...` (pour développement)
- [ ] **Copier la clé publique** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Format: `pk_live_...`
  - Format: `pk_test_...`

### Configuration du Webhook Stripe

- [ ] Aller à Stripe > Développeurs > Webhooks
- [ ] Cliquer "Ajouter une endpoint"
- [ ] Endpoint URL: `https://votre-domaine.com/api/webhooks/stripe`
  - **Local**: `http://localhost:3000/api/webhooks/stripe` (avec ngrok/tunnel)
  - **Production**: `https://orchids.vercel.app/api/webhooks/stripe`
- [ ] Sélectionner les événements :
  - ✅ `checkout.session.completed`
  - ✅ `payment_intent.succeeded`
  - ✅ `payment_intent.payment_failed`
- [ ] **Copier le Signing Secret** → `STRIPE_WEBHOOK_SECRET`
  - Format: `whsec_...`

### Activation de SEPA dans Stripe

- [ ] Aller à Stripe > Paramètres > Méthodes de paiement
- [ ] **Activer**: SEPA Direct Debit
  - Vérifier que le slider est activé
  - Lire les conditions SEPA si requises
- [ ] Tester avec un IBAN de test Stripe (cf. docs Stripe)

### Variables d'Environnement - `.env.local`

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

# Supabase (garder les valeurs existantes)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] Vérifier que les variables sont bien définies
  ```bash
  cat .env.local | grep STRIPE
  cat .env.local | grep SUPABASE
  ```

## SUPABASE - APPLICATION DE LA MIGRATION

### Option 1: Via Supabase CLI (Recommandé)

```bash
supabase migration up
```

- [ ] Vérifier que la migration s'est appliquée
  ```bash
  supabase migration list
  ```

### Option 2: Via Supabase Dashboard

- [ ] Aller à Supabase Dashboard > SQL Editor
- [ ] Créer une nouvelle query
- [ ] Copier le contenu du fichier:
  ```
  supabase/migrations/20260714000001_add_automatic_payment_system.sql
  ```
- [ ] Exécuter la query
- [ ] ✅ Vérifier qu'aucune erreur n'apparaît

### Vérification des Tables Créées

```sql
-- Vérifier les colonnes du profil
\d profiles

-- Vérifier les tables de paiement
\d sepa_payment_transactions
\d sepa_payment_retries

-- Vérifier les fonctions
\df apply_sepa_payment
\df handle_sepa_payment_failure
```

- [ ] Les tables et colonnes existent
- [ ] Les indices sont bien créés
- [ ] Les fonctions SQL sont compilées sans erreur

## DÉPLOIEMENT SUR PRODUCTION (Vercel/Netlify)

### Vercel (Recommandé)

1. **Push vers main branch**
   ```bash
   git push origin main
   ```

2. **Vercel devrait auto-build et deployer**
   - [ ] Vérifier les logs de build sur Vercel Dashboard
   - [ ] ✅ Vérifier que le build est vert (succès)

3. **Ajouter les variables d'environnement**
   - [ ] Aller à Vercel Project > Settings > Environment Variables
   - [ ] Ajouter :
     - `STRIPE_SECRET_KEY` = `sk_live_...`
     - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - [ ] Redéployer pour appliquer les variables
     ```bash
     vercel --prod
     ```

4. **Vérifier le déploiement**
   ```bash
   curl https://votre-domaine.com/api/health
   # Devrait retourner 200 OK
   ```

### Netlify (Alternative)

- [ ] Ajouter les variables d'environnement via Netlify Dashboard
- [ ] Redéployer: `netlify deploy --prod`

## TESTS EN PRODUCTION

### Test 1: Validation IBAN (Optionnel)

```bash
curl -X POST https://votre-domaine.com/api/payment/setup-mandate \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "iban": "DE89370400440532013000",
    "bic": "COBADEFF"
  }'
```

- [ ] Réponse: `{ "success": true, "clientSecret": "seti_..." }`

### Test 2: Confirmation du Webhook

- [ ] Aller au Stripe Dashboard > Webhooks
- [ ] Cliquer sur l'endpoint créé
- [ ] Aller à l'onglet "Événements"
- [ ] Chercher un événement `payment_intent.succeeded` récent
- [ ] Cliquer pour voir les détails
- [ ] Vérifier que l'event a été reçu (Response: 200)

### Test 3: Vérification en Base de Données

```sql
-- Sur Supabase Production
SELECT * FROM sepa_payment_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

- [ ] Les transactions sont visibles
- [ ] Les statuts sont corrects
- [ ] Les montants sont correctement enregistrés

## MONITORING POST-DÉPLOIEMENT (24-48h)

### Jour 1 - Surveillance Active

- [ ] **Chaque heure** : Vérifier les logs Vercel/Netlify
- [ ] **Chaque heure** : Vérifier les erreurs Stripe Dashboard
- [ ] Tester **un prélèvement en production** (si client le permet)
- [ ] Vérifier que le webhook reçoit les événements

### Jour 2 - Stabilité

- [ ] **Vérifier les transactions** : Aucun doublon
- [ ] **Vérifier les états**: Les commandes changent bien de statut
- [ ] **Vérifier les notifications**: n8n reçoit les événements
- [ ] **Performance**: Aucun timeout sur les endpoints

## ROLLBACK (EN CAS DE PROBLÈME)

### Si le système se bloque complètement:

1. **Désactiver le webhook Stripe** (temporaire)
   ```
   Stripe Dashboard > Webhooks > Désactiver l'endpoint
   ```

2. **Revert du commit**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Vercel va redéployer automatiquement**

4. **Contact des clients** (si applicable)

### Si seule la migration pose problème:

1. **Rollback de la migration** (Supabase)
   - Aller à Supabase > SQL Editor
   - Exécuter les commandes DROP TABLE/COLUMN
   - Exécuter la migration à nouveau après fix

## POST-DÉPLOIEMENT CONFIRMÉ (✅)

Une fois que tout fonctionne bien :

- [ ] Documenter les URLs et secrets utilisés
- [ ] Briefer l'équipe support sur les procédures de gestion
- [ ] Configurer les alertes Sentry/Datadog si en place
- [ ] Planifier une review post-mortem à J+7

## CONTACTS & RESSOURCES

| Ressource | URL |
|:----------|:----|
| Stripe Docs SEPA | https://stripe.com/docs/payments/sepa-direct-debit |
| Supabase Migration Docs | https://supabase.com/docs/guides/database/migrations |
| Vercel Deployment | https://vercel.com/docs |
| Guide d'intégration SEPA | `src/lib/payments/sepa-integration.guide.ts` |
| Documentation complète | `docs/sepa-automatic-payments.md` |

---

**Checklist Version**: 1.0  
**Dernière mise à jour**: 14 juillet 2026  
**Status**: ✅ Approuvée pour déploiement
