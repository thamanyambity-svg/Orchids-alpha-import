/**
 * Crée ou réinitialise un compte administrateur.
 *
 * Usage:
 *   npx tsx scripts/create_admin.ts
 *   ADMIN_EMAIL=votre@email.com ADMIN_PASSWORD=VotreMotDePasse npx tsx scripts/create_admin.ts
 *
 * Si ADMIN_EMAIL et ADMIN_PASSWORD ne sont pas définis, des valeurs par défaut sont utilisées
 * (à modifier immédiatement après la première connexion).
 */

import { createClient } from '@supabase/supabase-js'
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
  // ignore
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'admin@aonosekehouseinvestmentdrc.site'
const adminPassword = process.env.ADMIN_PASSWORD || 'AlphaAdmin2025!' // À CHANGER après 1ère connexion
const adminName = process.env.ADMIN_NAME || 'Administrateur Alpha'

if (!supabaseUrl || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function createAdmin() {
  console.log('🔧 Création / réinitialisation du compte administrateur...\n')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Nom: ${adminName}`)
  console.log('')

  // 1. Vérifier si l'utilisateur existe
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingUser = users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase())

  let userId: string

  if (existingUser) {
    console.log('📋 Utilisateur existant trouvé. Réinitialisation du mot de passe et du profil...')
    userId = existingUser.id

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    })
    if (updateError) {
      console.error('❌ Erreur mise à jour auth:', updateError.message)
      process.exit(1)
    }
    console.log('   ✅ Mot de passe réinitialisé')
  } else {
    console.log('🆕 Création d\'un nouvel utilisateur admin...')
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    })
    if (createError) {
      console.error('❌ Erreur création utilisateur:', createError.message)
      process.exit(1)
    }
    userId = newUser.user.id
    console.log('   ✅ Utilisateur créé')
  }

  // 2. Créer ou mettre à jour le profil (role ADMIN)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: adminEmail,
      full_name: adminName,
      role: 'ADMIN',
      status: 'VERIFIED',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error('❌ Erreur profil:', profileError.message)
    process.exit(1)
  }
  console.log('   ✅ Profil ADMIN configuré')

  console.log('\n✅ Compte administrateur prêt !')
  console.log('   ─────────────────────────────')
  console.log(`   Email:    ${adminEmail}`)
  console.log(`   Mot de passe: (celui défini via ADMIN_PASSWORD ou valeur par défaut)`)
  console.log('   ─────────────────────────────')
  console.log('\n🔐 Connectez-vous sur /login puis changez le mot de passe dans Paramètres.')
}

createAdmin().catch((e) => {
  console.error(e)
  process.exit(1)
})
