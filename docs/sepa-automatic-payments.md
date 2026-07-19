# 🏦 Système de Prélèvements SEPA Automatiques 60/40

Implémentation complète des prélèvements SEPA automatiques pour la plateforme Orchids.

## 📋 Fichiers Créés

### Migration Supabase
- `supabase/migrations/20260714000001_add_automatic_payment_system.sql`
  - Ajoute les champs SEPA aux profils utilisateur
  - Crée la table `sepa_payment_transactions` pour la traçabilité
  - Crée les fonctions SQL atomiques pour appliquer les paiements
  - Crée la table de retries pour la gestion des échecs

### Services de Paiement (`src/lib/payments/`)
- `iban-validator.ts` - Validation MOD-97 de l'IBAN et BIC
- `auto-debit.service.ts` - Service principal de gestion des mandats SEPA
  - `setupDirectDebitMandate()` - Création du SetupIntent
  - `confirmDirectDebitMandate()` - Confirmation et activation du mandat
  - `processAutomaticDebit()` - Déclenchement des prélèvements
  - `getSEPAPaymentStatus()` - Consultation du statut
  - `cancelSEPAPayment()` - Annulation d'un prélèvement
- `sepa-integration.guide.ts` - Guide d'intégration dans les workflows

### Endpoints API (`src/app/api/payment/`)
- `setup-mandate/route.ts` - POST `/api/payment/setup-mandate`
  - Crée un SetupIntent pour enrôler un mandat SEPA
  - Valide l'IBAN/BIC
  - Retourne le `clientSecret` pour confirmation côté client

- `confirm-mandate/route.ts` - POST `/api/payment/confirm-mandate`
  - Confirme le SetupIntent après validation du client
  - Sauvegarde le payment method dans le profil utilisateur
  - Active le mandat (`mandate_activated = true`)

### Webhook Stripe Modifié
- `src/app/api/webhooks/stripe/route.ts`
  - Ajout du traitement pour `payment_intent.succeeded`
  - Ajout du traitement pour `payment_intent.payment_failed`
  - Gestion complète des prélèvements SEPA off-session

## 🔧 Configuration Requise

### Variables d'Environnement

Ajouter dans `.env.local` et sur votre hébergeur (Vercel/Netlify) :

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_****  # Clé secrète depuis Stripe Dashboard > Développeurs
STRIPE_WEBHOOK_SECRET=whsec_**** # Signing secret du webhook
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_**** # Clé publique

# Supabase (même configuration qu'avant)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Configuration Stripe

1. **Récupérer les clés** :
   - Aller à Stripe Dashboard > Développeurs > Clés API
   - Copier `Secret key` → `STRIPE_SECRET_KEY`
   - Copier `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. **Configurer le Webhook** :
   - Aller à Stripe Dashboard > Développeurs > Webhooks
   - Cliquer "Ajouter une endpoint"
   - URL : `https://votre-domaine.com/api/webhooks/stripe`
   - Événements à sélectionner :
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed` (déjà existant)
   - Copier le "Signing secret" → `STRIPE_WEBHOOK_SECRET`

3. **Activer SEPA** :
   - Aller à Stripe Dashboard > Paramètres > Méthodes de paiement
   - Activer "SEPA Direct Debit"

## 🚀 Déploiement

### Étape 1 : Appliquer la migration Supabase

```bash
# En local (via Supabase CLI)
supabase migration up

# Ou en production (via Supabase Dashboard)
# - Aller à SQL Editor
# - Copier le contenu du fichier migration
# - Exécuter
```

### Étape 2 : Installer/mettre à jour les packages (si nécessaire)

Les dépendances Stripe et Supabase sont déjà installées.

### Étape 3 : Redémarrer le serveur

```bash
npm run dev
# ou
npm run build && npm start
```

### Étape 4 : Commit et Push

```bash
git add supabase/migrations/20260714000001_add_automatic_payment_system.sql
git add src/lib/payments/
git add src/app/api/payment/
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(payment): implement SEPA automatic debit 60/40 system with MOD-97 validation"
git push origin main
```

## ✅ Checklist de Test

### Test Local (Stripe Test Mode)

1. **Validation IBAN**
   - [ ] IBAN valide accepté
   - [ ] IBAN invalide (mauvais MOD-97) rejeté
   - [ ] BIC invalide rejeté

2. **Création du SetupIntent**
   - [ ] `/api/payment/setup-mandate` retourne `clientSecret`
   - [ ] Customer Stripe créé si inexistant

3. **Confirmation du Mandat**
   - [ ] SetupIntent confirmé côté client
   - [ ] `/api/payment/confirm-mandate` met à jour le profil
   - [ ] `mandate_activated = true` en base

4. **Prélèvement Automatique (Dépôt 60%)**
   - [ ] `processAutomaticDebit(orderId, 0.6)` crée un PaymentIntent
   - [ ] Webhook reçoit `payment_intent.succeeded`
   - [ ] `sepa_payment_transactions` enregistre la transaction
   - [ ] Statut de la commande passe à `FUNDED`
   - [ ] Notification n8n envoyée

5. **Prélèvement Automatique (Solde 40%)**
   - [ ] Même processus avec `processAutomaticDebit(orderId, 0.4)`
   - [ ] Statut passe à `CLOSED`

6. **Échec de Prélèvement**
   - [ ] Webhook reçoit `payment_intent.payment_failed`
   - [ ] Transaction enregistrée avec `status='FAILED'`
   - [ ] Notification n8n avec message d'erreur
   - [ ] Commande reste en `AWAITING_DEPOSIT` ou `DELIVERED`

7. **Idempotence**
   - [ ] Rejeu du webhook pour le même PaymentIntent → pas de doublon
   - [ ] Vérification via `sepa_payment_transactions`

### Test en Production

1. Utiliser les clés Stripe LIVE (pas test)
2. Tester avec des IBANs réels (ou fournisseur de test Stripe)
3. Mettre en place les alertes/logs
4. Monitorer les transactions pendant 24-48h

## 📊 Vérification du Statut

### Via le Dashboard Admin

Query SQL pour vérifier les transactions SEPA :

```sql
SELECT 
  spt.order_id,
  spt.type,
  spt.amount / 100 as amount_eur,
  spt.status,
  spt.created_at,
  o.status as order_status
FROM sepa_payment_transactions spt
LEFT JOIN orders o ON spt.order_id = o.id
ORDER BY spt.created_at DESC
LIMIT 50;
```

### Via Stripe Dashboard

- Aller à Stripe Dashboard > Paiements
- Filtrer par "Type: SetupIntent" ou "Type: PaymentIntent"
- Chercher le `order_id` dans les métadonnées

## 🐛 Dépannage

| Problème | Solution |
|:---------|:---------|
| `Error: IBAN validation failed: IBAN length invalid` | Vérifier l'IBAN fourni (15-34 caractères) |
| `Error: No such customer` | Vérifier que le customer Stripe a été créé correctement |
| `Error: Missing SUPABASE_SERVICE_ROLE_KEY` | Redémarrer le serveur après ajout de la variable env |
| `Webhook signature failed` | Vérifier que `STRIPE_WEBHOOK_SECRET` correspond exactement |
| Statut de commande ne change pas | Vérifier les logs du webhook, vérifier la fonction SQL |
| Double charge | Vérifier l'idempotence (clé d'idempotence Stripe) |

## 📚 Documentation Additionnelle

- [Stripe SEPA Direct Debit Docs](https://stripe.com/docs/payments/sepa-direct-debit)
- [ISO 7064 MOD-97 Validation](https://en.wikipedia.org/wiki/International_Bank_Account_Number#Validating_the_IBAN)
- [Supabase Functions](https://supabase.com/docs/guides/database/functions)

## 🤝 Support

Pour toute question ou problème :
1. Vérifier les logs (local : console, prod : Vercel/Netlify logs)
2. Vérifier Stripe Dashboard > Events
3. Vérifier Supabase > SQL Editor pour les logs d'exécution
4. Consulter le fichier `sepa-integration.guide.ts` pour les cas d'usage

---

**Version** : 1.0  
**Dernière mise à jour** : 14 juillet 2026  
**Status** : ✅ Prêt pour production
