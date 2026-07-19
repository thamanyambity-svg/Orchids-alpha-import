# Workflow n8n - Alpha Import Exchange

## Vue d'ensemble

Le fichier `n8n_alpha_import_workflow.json` définit un workflow n8n qui reçoit les événements de l'application via webhook et les route selon le type d'événement.

## Installation

1. Créer un workflow dans n8n (Cloud ou self-hosted)
2. Importer le fichier `n8n_alpha_import_workflow.json`
3. Configurer les éléments ci-dessous

## Configuration requise

### 1. Slack (Notify Admin & Notify Finance)

Pour recevoir les notifications dans Slack :

1. Créer un **Slack Incoming Webhook** : [Slack API - Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. Copier l'URL du webhook (format : `https://hooks.slack.com/services/T.../B.../xxx`)
3. Dans les nœuds **Notify Admin (Slack)** et **Notify Finance (Slack)**, remplacer l'URL par la vôtre
4. (Optionnel) Créer deux webhooks distincts : un pour l'équipe Admin, un pour la Finance

### 2. URL de l'application (OCR & Log)

Les nœuds **Start OCR AI** et **Log Other Events** envoient les données vers votre application :

- **Variable d'environnement** : Définir `APP_URL` dans n8n (ex. `https://aonosekehouseinvestmentdrc.site`)
- **Fallback** : Si non défini, l'URL par défaut est `https://aonosekehouseinvestmentdrc.site`
- La route `/api/webhooks/n8n-events` enregistre les événements dans `audit_logs`

### 3. URL du webhook

L'app envoie les événements à l'URL configurée dans `N8N_WEBHOOK_URL` (`.env.local`). Cette URL correspond au path du nœud Webhook dans n8n (ex. `.../webhook-test/xxx`).

## Événements routés

| Événement | Action | Destination |
|-----------|--------|-------------|
| `new_request_created` | Notify Admin | Slack |
| `payment_confirmed` | Notify Finance | Slack |
| `document_uploaded` | Log | API App |
| `ocr_analysis_requested` | Start OCR | API App |
| `partner_status_update` | Log | API App |
| `certified_report_requested` | Log | API App |
| `reminder_awaiting_deposit` | Log | API App |
| (autres) | Log | API App |

## Format des données reçues

L'app envoie un payload JSON :

```json
{
  "event": "new_request_created",
  "timestamp": "2025-03-08T12:00:00.000Z",
  "data": {
    "reference": "REF-xxx",
    "buyerId": "uuid",
    "productName": "...",
    "budget": 10000
  }
}
```
