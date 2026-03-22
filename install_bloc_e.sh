#!/bin/bash
# ============================================================
# install_bloc_e.sh — Installation automatique du Bloc E
# Exécuter depuis la RACINE de votre projet alpha-import-exchange-b2b
# Usage : bash install_bloc_e.sh
#
# Cas A — Dossier téléchargé (script + sous-dossier src/ au même niveau) :
#   bash /chemin/vers/le/zip/install_bloc_e.sh
#
# Cas B — Script à la racine du repo et fichiers déjà dans src/ :
#   bash install_bloc_e.sh
# ============================================================

set -e  # Arrêt immédiat si une commande échoue

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Vérification du répertoire de travail..."
if [ ! -f "package.json" ]; then
  echo "❌ Erreur : package.json introuvable."
  echo "   Exécutez ce script depuis la racine de votre projet Next.js."
  exit 1
fi

echo "📁 Création des dossiers cibles..."
mkdir -p src/app/actions/client
mkdir -p src/components/dashboard/payment-proof

echo "📋 Copie des fichiers du Bloc E..."

SRC_RESUBMIT="$SCRIPT_DIR/src/app/actions/client/resubmit-payment-proof.ts"
SRC_BANNER="$SCRIPT_DIR/src/components/dashboard/payment-proof/proof-status-banner.tsx"
SRC_CLIENT="$SCRIPT_DIR/src/components/dashboard/payment-proof/proof-status-client.tsx"

for f in "$SRC_RESUBMIT" "$SRC_BANNER" "$SRC_CLIENT"; do
  if [ ! -f "$f" ]; then
    echo "❌ Fichier source introuvable : $f"
    echo "   Placez install_bloc_e.sh et l’arborescence src/ au même endroit, ou ajoutez les fichiers au repo puis relancez."
    exit 1
  fi
done

cp "$SRC_RESUBMIT" src/app/actions/client/resubmit-payment-proof.ts
echo "   ✅ resubmit-payment-proof.ts"

cp "$SRC_BANNER" src/components/dashboard/payment-proof/proof-status-banner.tsx
echo "   ✅ proof-status-banner.tsx"

cp "$SRC_CLIENT" src/components/dashboard/payment-proof/proof-status-client.tsx
echo "   ✅ proof-status-client.tsx"

echo ""
echo "🌿 Vérification de la branche git..."
CURRENT_BRANCH=$(git branch --show-current)
echo "   Branche actuelle : $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "feat/financial-foundations" ]; then
  echo "   ⚠️  Basculement vers feat/financial-foundations..."
  git checkout feat/financial-foundations 2>/dev/null || \
  git checkout -b feat/financial-foundations
fi

echo ""
echo "📦 Staging des fichiers..."
git add src/app/actions/client/resubmit-payment-proof.ts
git add src/components/dashboard/payment-proof/proof-status-banner.tsx
git add src/components/dashboard/payment-proof/proof-status-client.tsx

echo ""
echo "💾 Commit..."
git commit -m "feat(client/payment-proof): add resubmission workflow and status banner

- resubmitPaymentProof(): 8-level security (auth, ownership, REJECTED
  status check, MIME type, file size, double order ownership)
- Trigger trg_supersede_rejected_proof activated via supersedes_proof_id
- Rollback Storage on SQL insert failure
- ProofStatusBanner: 5 states (null, PENDING_REVIEW, ACCEPTED,
  REJECTED + reason, SUPERSEDED)
- ProofStatusClient: view state machine (STATUS / FIRST_UPLOAD / RESUBMIT)
- router.refresh() on every successful action
- Zero direct Supabase calls in components"

echo ""
echo "🚀 Push vers GitHub..."
git push github feat/financial-foundations

echo ""
echo "============================================"
echo "✅ Bloc E installé et sauvegardé avec succès"
echo "============================================"
