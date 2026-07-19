# Assistant IA - Gestion des emails contact@aonosekehouseinvestmentdrc.site

## Vue d'ensemble

Les emails envoyés à **contact@aonosekehouseinvestmentdrc.site** sont :
1. Reçus par Resend (Inbound)
2. Envoyés à notre webhook
3. Analysés par l'IA (OpenAI) : catégorie, priorité, résumé, suggestion de réponse
4. Stockés dans `inbound_emails`
5. Consultables dans l'espace Admin → **Boîte Mail IA**

## Prérequis

- **Resend** : Domaine avec "Receiving" activé
- **OpenAI** : Clé API pour l'analyse (optionnel, sans clé l'analyse est ignorée)

## Configuration

### 1. Activer la réception sur Resend

1. Resend Dashboard → **Domains** → `aonosekehouseinvestmentdrc.site`
2. Vérifier que **Receiving** est activé (enregistrement MX configuré)
3. Si ce n'est pas le cas, suivre la doc : [Resend Inbound](https://resend.com/docs/dashboard/receiving/introduction)

### 2. Créer le webhook

1. Resend Dashboard → **Webhooks** → **Add Webhook**
2. **Endpoint URL** : `https://votre-domaine.com/api/webhooks/resend/inbound`
3. **Events** : cocher `email.received`
4. **Signing Key** : (optionnel) pour valider la signature

### 3. Variables d'environnement

```env
RESEND_API_KEY=re_...          # Déjà utilisé pour l'envoi
OPENAI_API_KEY=sk_...          # Pour l'analyse IA (optionnel)
```

### 4. Migration Supabase

Exécuter le script SQL :
```bash
# Via Supabase CLI
npx supabase db push

# Ou copier le contenu de supabase/migrations/20250308100001_inbound_emails.sql
# dans le SQL Editor du Dashboard Supabase
```

## Flux

```
Email reçu → Resend → Webhook POST → API /api/webhooks/resend/inbound
                                          ↓
                                    Récupère contenu (Resend API)
                                          ↓
                                    Analyse IA (OpenAI)
                                          ↓
                                    Insert inbound_emails (Supabase)
```

## Catégories IA

| Catégorie    | Description                              |
|--------------|------------------------------------------|
| PARTENARIAT  | Demande pour devenir partenaire          |
| INFO         | Demande d'information générale           |
| RÉCLAMATION  | Plainte, problème, incident              |
| PRESSE       | Média, journalistes                      |
| AUTRE        | Autres demandes                          |

## Priorités

- **HAUTE** : Réclamations, partenariats stratégiques, urgence
- **MOYENNE** : Demandes standards
- **BASSE** : Newsletter, informations générales
