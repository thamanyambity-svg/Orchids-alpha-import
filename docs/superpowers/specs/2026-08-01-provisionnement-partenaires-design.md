# Provisionnement des partenaires depuis le tableau de bord admin

Date : 2026-08-01
Statut : validé, en attente du plan d'implémentation

## Problème

Un partenaire approuvé n'a aucun accès au système. La chaîne s'arrête à mi-course :

```
/partner-request → PartnerWizard → insert partner_applications        fonctionne
        ↓
/admin/partners (liste)                                                fonctionne
        ↓
/admin/partners/applications/[id] → status = 'APPROVED_KYC'            écrit bien
        ↓
        rien
```

`updateStatus` dans `src/app/admin/partners/applications/[id]/page.tsx` change un statut
et s'arrête. Aucun compte auth, aucune ligne `profiles`, aucune ligne `partner_profiles`,
aucune adresse mail. Conséquence directe : `partner_profiles` est vide, donc aucune
demande ne peut être assignée, donc aucun devis ne peut être soumis. Le flux 60/40 est
inatteignable en pratique faute de partenaires, alors même que sa mécanique est vérifiée.

Deux défauts adjacents, découverts en traçant la chaîne :

- Le wizard téléverse les pièces légales (RCCM, ID_NAT, TAX_ID) dans le bucket
  `project-uploads`, **public et listable**. Les pièces d'identité des candidats sont
  lisibles par URL et énumérables. Contrairement à la table `documents` neutralisée le
  même jour, ce bucket reçoit de vrais dépôts.
- Le repo déclare `partner_applications.status` en `TEXT CHECK ('PENDING','APPROVED','REJECTED')`
  alors que le code écrit `'APPROVED_KYC'`. Cela passe sur la base actuelle, qui porte
  l'enum `application_status`, mais un déploiement neuf depuis le repo casserait à la
  première approbation. Même famille que les défauts `QUOTE_ACCEPTED` et
  `assigned_partner_id` déjà corrigés.

## Périmètre

**Dans ce lot**
- Création complète d'un partenaire depuis l'admin, à partir d'une candidature ou ex nihilo.
- Champs opérationnels du partenaire : WhatsApp, adresse, fuseau, langues.
- Couche WhatsApp à trois transports, dont un livrable immédiatement.
- Certification de bout en bout de la chaîne de candidature.
- Suppression des données fictives `mockPartners`.

**Hors de ce lot**
- Alias mail professionnel (phase 2 : redirection Zoho ou DNS).
- Activation de l'API WhatsApp Business Cloud — le transport est écrit, son activation
  dépend d'un numéro vérifié Meta et de modèles approuvés.
- Les quatre divergences repo/base documentées dans
  `supabase/migrations/20260801111630_align_legacy_tables.sql`.

## Modèle de données

La séparation existante est conservée : `profiles` porte l'identité, `partner_profiles`
porte le rôle commercial. C'est la répartition consolidée en corrigeant les trois routes
API qui interrogeaient à tort `partner_profiles.full_name`.

| `profiles` (existant) | `partner_profiles` (à compléter) |
|---|---|
| `full_name`, `company_name`, `email`, `phone`, `city`, `country_id` | `whatsapp_number`, `address_line`, `postal_code`, `timezone`, `languages[]`, `pro_email`, `application_id` |
| | existants : `country_id`, `assigned_cities`, `commission_rate`, `contract_status`, `deposit_amount` |

Migration `partner_operational_fields`, horodatée à sa création dans
`supabase/migrations/`, additive :

- `whatsapp_number TEXT` avec contrainte `CHECK (whatsapp_number ~ '^\+[1-9]\d{7,14}$')`,
  c'est-à-dire E.164 canonique. La validation est en base, pas seulement dans le
  formulaire : le numéro est une clé de contact métier, il ne doit pas pouvoir entrer
  sous une forme non normalisée.
- `address_line TEXT`, `postal_code TEXT`, `timezone TEXT`, `languages TEXT[] DEFAULT '{}'`.
- `pro_email TEXT` — vide jusqu'à la phase 2.
- `application_id UUID REFERENCES partner_applications(id) ON DELETE SET NULL` — traçabilité
  conformité entre le partenaire actif et son dossier d'origine.

Migration séparée pour aligner le repo sur l'enum `application_status`, afin qu'un
déploiement neuf ne casse pas à l'approbation.

## Création du partenaire

Une seule route serveur, `POST /api/admin/partners`, protégée par `requireRole(['ADMIN'])`.
Elle est le point unique de vérité de la création — l'interface admin ne fait qu'appeler.

Séquence :

1. Valider le payload avec zod : email, nom, société, pays, WhatsApp E.164, adresse,
   commission, villes assignées, `application_id` optionnel.
2. Créer le compte via l'API admin Supabase, en mode invitation par email.
3. Basculer `profiles.role` sur `PARTNER`. Le déclencheur `handle_new_user` crée le profil
   en `BUYER` par défaut ; sans cette correction le partenaire n'aurait pas ses droits.
4. Insérer `partner_profiles` avec les champs opérationnels.
5. Si `application_id` est fourni, passer la candidature à `ACTIVE` et enregistrer le lien.
6. Journaliser via `log_audit`.

**Compensation.** Si une étape échoue après la création du compte auth, la route supprime
le compte créé avant de renvoyer l'erreur. Sans cela on laisse un compte orphelin sans
profil, et l'adresse devient impossible à réutiliser puisqu'elle est déjà prise.

**Accès.** Invitation par email par défaut. Un second bouton, `POST /api/admin/partners/[id]/access-link`,
génère un lien de connexion à usage unique que l'administrateur transmet lui-même. C'est le
mode utile tant que l'adresse professionnelle n'existe pas, donc pour toute la phase 1.

**Aucun mot de passe n'est généré, affiché, stocké ni transmis par le système.** Le
partenaire choisit le sien via le lien reçu.

## Couche WhatsApp

Le numéro est stocké et validé une fois. Ce qui varie est le transport.

```
notifyPartner(event, partnerId, data)
        ├─ notification in-app   → notifyOnEvent()   (existant)
        ├─ n8n                   → sendToN8N()       (existant)
        └─ WhatsApp ── transport ─┬─ 'link'  : aucun envoi, produit une URL wa.me   (défaut)
                                  ├─ 'n8n'   : émet l'évènement, n8n décide
                                  └─ 'cloud' : API WhatsApp Business, modèles Meta
```

Le transport est choisi par `WHATSAPP_TRANSPORT` (`link` | `n8n` | `cloud`), défaut `link`.
Les appelants ne connaissent que `notifyPartner` : basculer de transport ne touche aucun
code métier.

- `link` : ne fait aucun appel réseau. Produit un lien `wa.me` pré-rempli avec la référence
  de la demande, affiché sur la fiche partenaire côté acheteur et côté admin. C'est ce qui
  remplace les faux numéros de `mockPartners`.
- `n8n` : réutilise `sendToN8N`, déjà câblé. Déporte le choix du fournisseur hors du code.
- `cloud` : appel direct à l'API Meta. Écrit mais inactif tant que les variables
  d'environnement correspondantes sont absentes.

**Contrat d'erreur.** Un échec de notification ne remonte jamais à l'appelant, alignement
sur le comportement actuel de `sendToN8N` qui capture ses propres erreurs. Un devis soumis
reste soumis même si WhatsApp est injoignable. Les échecs sont journalisés, pas propagés.

## Interface admin

`/admin/partners` gagne un bouton « Créer un partenaire » ouvrant un formulaire, et la page
de revue de candidature `/admin/partners/applications/[id]` gagne un bouton « Approuver et
créer le compte » qui pré-remplit ce même formulaire depuis les données du dossier.

Le formulaire est un composant isolé, `PartnerForm`, utilisé par les deux chemins. La page
`/admin/partners/page.tsx` fait déjà 422 lignes ; le formulaire ne s'y ajoute pas, il vit
dans son propre fichier.

## Sécurité des pièces légales

Le bucket `project-uploads` est public et listable alors qu'il reçoit des pièces
d'identité. Correction proposée : un bucket privé dédié aux pièces de conformité, avec
accès par URL signée à durée courte, réservé aux administrateurs, et journalisation dans
`document_access_logs` — la table existe déjà et sert exactement à cela.

**Décision requise avant exécution.** Deux voies : migrer les dépôts existants vers un
nouveau bucket privé, ou basculer `project-uploads` lui-même en privé. La seconde est plus
simple mais invalide toute URL publique déjà distribuée.

Recommandation, et comportement retenu à défaut d'instruction contraire : créer un bucket
privé `compliance-documents`, y diriger les nouveaux dépôts du wizard, et laisser
`project-uploads` intact jusqu'à ce que son contenu ait été inventorié. On arrête
l'hémorragie sans casser l'existant, et la migration des dépôts déjà présents devient une
tâche distincte, décidée en connaissance de cause.

## Tests

**Unitaires** (vitest, avec le double Supabase de `src/test-utils/supabase-mock.ts`)
- `POST /api/admin/partners` : refus si l'appelant n'est pas admin ; refus si le WhatsApp
  n'est pas E.164 ; création complète en cas nominal ; suppression du compte auth si
  l'insertion de `partner_profiles` échoue.
- Normalisation du numéro et construction du lien `wa.me`.
- Sélection du transport WhatsApp selon la configuration, et absorption des échecs.

**Certification de bout en bout** — c'est la preuve demandée, exécutée dans le navigateur :

1. Déposer une candidature depuis le formulaire public.
2. La voir apparaître dans `/admin/partners`.
3. L'approuver et créer le compte.
4. Vérifier en base : `profiles.role = 'PARTNER'`, ligne `partner_profiles`, candidature
   à `ACTIVE`, entrée d'audit.
5. Se connecter avec le compte partenaire.
6. Vérifier qu'il apparaît comme assignable sur une demande.
7. Assigner, soumettre un devis, vérifier que le bon de commande se génère.

Les étapes 6 et 7 rejouent dans l'interface le parcours déjà validé en SQL. C'est la
première fois que le flux serait exercé par un vrai compte à travers l'application.

## Risques

- **Compte auth orphelin** si la compensation échoue elle aussi. Mitigation : journaliser
  l'identifiant du compte à supprimer pour reprise manuelle.
- **Divergence repo/base non couverte** : `profiles.role` est TEXT avec un CHECK à trois
  valeurs. Cela suffit pour `PARTNER`, donc ce lot n'est pas bloqué, mais la contrainte
  reste à traiter séparément.
- **Le mode `link` n'est pas une notification.** Il rend le contact possible, il ne
  prévient personne. Tant que `cloud` ou `n8n` n'est pas actif, un partenaire n'est averti
  d'une nouvelle demande que par la notification in-app et l'email.
