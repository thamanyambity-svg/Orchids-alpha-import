/**
 * Vérifie la configuration Resend pour l'assistant IA emails :
 * 1. Domaine avec Receiving activé
 * 2. Webhook email.received vers /api/webhooks/resend/inbound
 *
 * Usage: npx tsx scripts/verify_resend_config.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Charger .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  })
} catch {
  // .env.local optionnel
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aonosekehouseinvestmentdrc.site'
const EXPECTED_WEBHOOK_PATH = '/api/webhooks/resend/inbound'

async function main() {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY manquant dans .env.local')
    process.exit(1)
  }

  console.log('🔍 Vérification de la configuration Resend...\n')

  // --- 1. DOMAINES : Receiving activé ? ---
  console.log('1️⃣ DOMAINE — Receiving activé pour aonosekehouseinvestmentdrc.site ?')
  try {
    const domainsRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })

    if (!domainsRes.ok) {
      throw new Error(`API Domains: ${domainsRes.status} ${domainsRes.statusText}`)
    }

    const domainsData = await domainsRes.json()
    const domains = domainsData.data || []
    const targetDomain = domains.find(
      (d: { name: string }) =>
        d.name === 'aonosekehouseinvestmentdrc.site' || d.name?.endsWith('aonosekehouseinvestmentdrc.site')
    )

    if (!targetDomain) {
      console.log('   ⚠️  Domaine aonosekehouseinvestmentdrc.site non trouvé dans Resend.')
      console.log('   → Ajoutez le domaine dans Resend Dashboard → Domains')
    } else {
      const caps = targetDomain.capabilities || {}
      const receiving = caps.receiving
      if (receiving === 'enabled') {
        console.log('   ✅ Receiving activé')
      } else {
        console.log(`   ❌ Receiving : ${receiving || 'disabled'}`)
        console.log('   → Resend Dashboard → Domains → aonosekehouseinvestmentdrc.site')
        console.log('   → Configurez les enregistrements MX pour Receiving (voir doc Resend Inbound)')
      }
      console.log(`   Status: ${targetDomain.status}`)
    }
  } catch (e) {
    console.log('   ❌ Erreur:', (e as Error).message)
  }

  // --- 2. WEBHOOKS : email.received configuré ? ---
  console.log('\n2️⃣ WEBHOOK — email.received vers /api/webhooks/resend/inbound ?')
  try {
    const webhooksRes = await fetch('https://api.resend.com/webhooks', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })

    if (!webhooksRes.ok) {
      throw new Error(`API Webhooks: ${webhooksRes.status} ${webhooksRes.statusText}`)
    }

    const webhooksData = await webhooksRes.json()
    const webhooks = webhooksData.data || []
    const expectedUrl = `${APP_URL}${EXPECTED_WEBHOOK_PATH}`

    const inboundWebhook = webhooks.find(
      (w: { endpoint: string; events?: string[] }) =>
        w.endpoint?.includes(EXPECTED_WEBHOOK_PATH) ||
        w.endpoint?.includes('resend/inbound')
    )

    if (!inboundWebhook) {
      console.log('   ❌ Aucun webhook trouvé pour l\'inbound (email.received)')
      console.log(`   → Resend Dashboard → Webhooks → Add Webhook`)
      console.log(`   → URL: ${expectedUrl}`)
      console.log(`   → Events: cocher "email.received"`)
    } else {
      const hasEmailReceived = inboundWebhook.events?.includes('email.received')
      if (hasEmailReceived) {
        console.log('   ✅ Webhook configuré :', inboundWebhook.endpoint)
        console.log('   ✅ Event email.received activé')
      } else {
        console.log('   ⚠️  Webhook trouvé mais email.received manquant')
        console.log('   → Events actuels:', inboundWebhook.events?.join(', ') || 'aucun')
      }
    }
  } catch (e) {
    console.log('   ❌ Erreur:', (e as Error).message)
  }

  console.log('\n--- Fin de la vérification ---')
}

main()
