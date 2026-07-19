const fs = require('fs');
const path = require('path');

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
];

const envFile = path.join(process.cwd(), '.env.local');
const hasEnvFile = fs.existsSync(envFile);

const missing = requiredEnv.filter((name) => !process.env[name]);

console.log('Production config validation');
console.log(`- env.local present: ${hasEnvFile}`);
console.log(`- missing required env vars: ${missing.length === 0 ? 'none' : missing.join(', ')}`);

if (missing.length > 0) {
  process.exitCode = 1;
}
