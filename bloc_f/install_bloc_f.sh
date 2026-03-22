#!/bin/bash
# ============================================================
# install_bloc_f.sh — Installation automatique du Bloc F
# Exécuter depuis la RACINE de votre projet alpha-import-exchange-b2b
# Usage : bash install_bloc_f.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Couleurs terminal ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Installation Bloc F — Affichage multidevise${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ── Vérification du répertoire ────────────────────────────────────────────────
echo -e "${YELLOW}🔍 Vérification du répertoire de travail...${NC}"
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Erreur : package.json introuvable.${NC}"
  echo "   Exécutez ce script depuis la racine de votre projet Next.js."
  exit 1
fi
echo -e "${GREEN}   ✅ package.json trouvé${NC}"

# ── Vérification des fichiers sources ────────────────────────────────────────
echo ""
echo -e "${YELLOW}🔍 Vérification des fichiers sources...${NC}"

F1="$SCRIPT_DIR/src/app/actions/client/get-order-financial-summary.ts"
F2="$SCRIPT_DIR/src/components/dashboard/payment-proof/order-amount-display.tsx"

if [ ! -f "$F1" ]; then
  echo -e "${RED}❌ Fichier manquant : $F1${NC}"
  exit 1
fi
if [ ! -f "$F2" ]; then
  echo -e "${RED}❌ Fichier manquant : $F2${NC}"
  exit 1
fi
echo -e "${GREEN}   ✅ Fichiers sources présents${NC}"

# ── Création des dossiers cibles ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}📁 Création des dossiers cibles...${NC}"
mkdir -p src/app/actions/client
mkdir -p src/components/dashboard/payment-proof
echo -e "${GREEN}   ✅ Dossiers prêts${NC}"

# ── Copie des fichiers ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}📋 Copie des fichiers du Bloc F...${NC}"

cp "$F1" src/app/actions/client/get-order-financial-summary.ts
echo -e "${GREEN}   ✅ get-order-financial-summary.ts${NC}"
echo "      → src/app/actions/client/"

cp "$F2" src/components/dashboard/payment-proof/order-amount-display.tsx
echo -e "${GREEN}   ✅ order-amount-display.tsx${NC}"
echo "      → src/components/dashboard/payment-proof/"

# ── Instructions F3 (page commande) ──────────────────────────────────────────
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  ⚠️  ACTION MANUELLE REQUISE — Fichier F3${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Ouvrez : src/app/dashboard/requests/[id]/page.tsx${NC}"
echo "   (Ce dépôt n’a pas de route dashboard/orders/[id] — la fiche est liée à la demande import.)"
echo ""
echo "── ÉTAPE 1 : Ajoutez ces imports en haut du fichier ──────────────────────"
echo ""
echo '  import { getOrderFinancialSummary }'
echo '    from "@/app/actions/client/get-order-financial-summary"'
echo '  import { OrderAmountDisplay }'
echo '    from "@/components/dashboard/payment-proof/order-amount-display"'
echo '  import { ProofStatusClient }'
echo '    from "@/components/dashboard/payment-proof/proof-status-client"'
echo '  import type { ProofDisplayData }'
echo '    from "@/components/dashboard/payment-proof/proof-status-banner"'
echo ""
echo "── ÉTAPE 2 : Ajoutez ce chargement dans le corps du Server Component ─────"
echo ""
echo '  const [financialResult, latestProofData] = await Promise.all(['
echo '    getOrderFinancialSummary(orderId),'
echo '    supabase'
echo '      .from("payment_proofs")'
echo '      .select(`'
echo '        id, status, created_at, rejection_reason,'
echo '        reviewed_at, amount_claimed, currency, file_name'
echo '      `)'
echo '      .eq("order_id", orderId)'
echo '      .in("status", ["PENDING_REVIEW", "ACCEPTED", "REJECTED"])'
echo '      .order("created_at", { ascending: false })'
echo '      .limit(1)'
echo '      .maybeSingle(),'
echo '  ])'
echo ''
echo '  const financialSummary = financialResult.success'
echo '    ? financialResult.data : null'
echo ''
echo '  const proofDisplayData: ProofDisplayData | null = latestProofData.data'
echo '    ? {'
echo '        id:                 latestProofData.data.id,'
echo '        status:             latestProofData.data.status,'
echo '        uploaded_at:        latestProofData.data.created_at,'
echo '        rejected_reason:    latestProofData.data.rejection_reason,'
echo '        reviewed_at:        latestProofData.data.reviewed_at,'
echo '        declared_amount:    latestProofData.data.amount_claimed,'
echo '        declared_currency:  latestProofData.data.currency,'
echo '        file_name_original: latestProofData.data.file_name,'
echo '      }'
echo '    : null'
echo ""
echo "── ÉTAPE 3 : Ajoutez ce rendu dans le JSX ────────────────────────────────"
echo ""
echo '  {financialSummary && ('
echo '    <OrderAmountDisplay summary={financialSummary} />'
echo '  )}'
echo ''
echo '  <ProofStatusClient'
echo '    orderId={orderId}'
echo '    initialProof={proofDisplayData}'
echo '  />'
echo ""
echo -e "${BLUE}────────────────────────────────────────────${NC}"
echo ""

# ── Confirmation avant commit ─────────────────────────────────────────────────
echo -e "${YELLOW}⏸  Avez-vous effectué les modifications manuelles dans page.tsx ? (o/n)${NC}"
read -r CONFIRM

if [[ "$CONFIRM" != "o" && "$CONFIRM" != "O" ]]; then
  echo ""
  echo -e "${YELLOW}⏭  Commit différé. Les fichiers F1 et F2 sont copiés.${NC}"
  echo "   Relancez le script ou commitez manuellement quand F3 est prêt :"
  echo ""
  echo "   git add src/app/actions/client/get-order-financial-summary.ts \\"
  echo "           src/components/dashboard/payment-proof/order-amount-display.tsx"
  echo "   git add src/app/dashboard/requests/\[id\]/page.tsx"
  echo '   git commit -m "feat(client/finance): add multidevise display bloc F"'
  echo "   git push github feat/financial-foundations"
  echo ""
  exit 0
fi

# ── Vérification branche git ──────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🌿 Vérification de la branche git...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo "   Branche actuelle : $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "feat/financial-foundations" ]; then
  echo -e "${YELLOW}   Basculement vers feat/financial-foundations...${NC}"
  git checkout feat/financial-foundations 2>/dev/null || \
  git checkout -b feat/financial-foundations
fi
echo -e "${GREEN}   ✅ Branche correcte${NC}"

# ── Staging ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}📦 Staging des fichiers...${NC}"

git add src/app/actions/client/get-order-financial-summary.ts
git add src/components/dashboard/payment-proof/order-amount-display.tsx

# Staging de page.tsx si modifié
PAGE_PATH="src/app/dashboard/requests/[id]/page.tsx"
if [ -f "$PAGE_PATH" ]; then
  git add "$PAGE_PATH"
  echo -e "${GREEN}   ✅ page.tsx stagé${NC}"
fi

echo -e "${GREEN}   ✅ F1 et F2 stagés${NC}"

# ── Commit ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}💾 Commit...${NC}"

git commit -m "feat(client/finance): add multidevise display — Bloc F

- getOrderFinancialSummary(): read-only Server Action
  * verifyOrderOwnership() guard
  * FROZEN: uses exchange_rate_at_time from transaction (immutable)
  * LIVE: calls get_active_exchange_rate() SQL function
  * UNAVAILABLE: returns USD only without blocking
- OrderAmountDisplay: 3 display states (FROZEN/LIVE/UNAVAILABLE)
  * USD primary amount always visible
  * CDF equivalent with rate + date + admin note
  * FROZEN: 'taux fixé définitivement' mention
  * LIVE: 'indicatif' mention
  * UNAVAILABLE: contact admin message
- F3 (page.tsx): parallel data loading via Promise.all
  * ProofStatusClient + OrderAmountDisplay injected
  * ProofDisplayData mapped from payment_proofs schema
    (amount_claimed, currency aligned with real migration)"

echo -e "${GREEN}   ✅ Commit effectué${NC}"

# ── Push ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🚀 Push vers GitHub...${NC}"
git push github feat/financial-foundations
echo -e "${GREEN}   ✅ Push réussi${NC}"

# ── Résumé final ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ Bloc F installé et sauvegardé !${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Brique financière complète :${NC}"
echo "  ✅ Migration SQL (exchange_rates, payment_proofs, document_access_logs)"
echo "  ✅ Sprint Admin (Blocs A, B, C) — taux, preuves, audit"
echo "  ✅ Sprint Client (Blocs D, E, F) — upload, re-soumission, multidevise"
echo ""
echo -e "${YELLOW}Prochaine étape :${NC}"
echo "  → Ouvrir une Pull Request : feat/financial-foundations → master"
echo "  → URL GitHub : comparez et fusionnez quand npm run typecheck est vert"
echo ""
