const fs = require('fs');
const path = require('path');

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
];

const envFile = path.join(process.cwd(), '.env.local');
const hasEnvFile = fs.existsSync(envFile);

// Le script était lancé hors de Next, donc sans .env.local chargé : il signalait
// toutes les variables comme manquantes. On lit le fichier nous-mêmes, sans
// écraser ce qui est déjà présent dans l'environnement (Vercel, CI).
if (hasEnvFile) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

const errors = [];
const warnings = [];

const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  errors.push(`variables manquantes : ${missing.join(', ')}`);
}

/** 'live' | 'test' | null si la clé est absente ou d'un format inattendu. */
function keyMode(key) {
  if (!key) return null;
  if (key.includes('_live_')) return 'live';
  if (key.includes('_test_')) return 'test';
  return null;
}

// Une clé publique et une clé secrète de modes différents ne se voient qu'au
// premier paiement : l'intent est créé d'un côté, cherché de l'autre.
const secretMode = keyMode(process.env.STRIPE_SECRET_KEY);
const publishableMode = keyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

if (secretMode && publishableMode && secretMode !== publishableMode) {
  errors.push(
    `clés Stripe de modes différents : NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est ${publishableMode}, ` +
      `STRIPE_SECRET_KEY est ${secretMode} — tout paiement échouerait`
  );
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
if (secretMode === 'live' && appUrl.includes('localhost')) {
  warnings.push(
    'clés Stripe en mode live avec NEXT_PUBLIC_APP_URL sur localhost — les redirections de paiement ne reviendront pas'
  );
}
if (secretMode === 'test' && appUrl && !appUrl.includes('localhost')) {
  warnings.push(`clés Stripe en mode test avec NEXT_PUBLIC_APP_URL = ${appUrl}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl && !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  warnings.push(`NEXT_PUBLIC_SUPABASE_URL a un format inattendu : ${supabaseUrl}`);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === serviceKey) {
  errors.push(
    'SUPABASE_SERVICE_ROLE_KEY est identique à la clé publique — la clé de service serait exposée au navigateur'
  );
}

console.log('Validation de la configuration de production');
console.log(`- .env.local présent : ${hasEnvFile}`);

for (const warning of warnings) {
  console.log(`- attention : ${warning}`);
}

if (errors.length === 0) {
  console.log('- aucune erreur');
} else {
  for (const error of errors) {
    console.log(`- ERREUR : ${error}`);
  }
  process.exitCode = 1;
}
