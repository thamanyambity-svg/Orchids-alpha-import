import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les routes.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // CSP volontairement compatible avec Next + Tailwind + Supabase + Mapbox.
    //
    // Stripe est listé explicitement : `loadStripe` injecte un script depuis
    // js.stripe.com et monte une iframe servie par le même hôte. Sans ces
    // origines, le script est refusé, `stripePromise` vaut null, et le mandat
    // SEPA échoue sur « Stripe n'a pas pu être chargé » — sans rien signaler
    // ailleurs qu'en console. Toute origine retirée d'ici casse le paiement en
    // production, pas les tests.
    //
    // Prochaine étape possible : CSP stricte basée sur nonce (via middleware).
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // Vidéos et notes vocales de la discussion : /api/files redirige vers un
      // lien signé du stockage Supabase. Sans cette directive, media-src hérite
      // de default-src 'self' et le lecteur refuse le fichier.
      "media-src 'self' blob: https://*.supabase.co",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.stripe.com",
      // js.stripe.com sert l'iframe de collecte ; hooks.stripe.com sert les
      // redirections d'authentification 3-D Secure.
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Sécurité globale
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/logo-alpha-import.png",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    // Allowlist explicite (plus de '**' ni de http).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "www.transparenttextures.com" },
      { protocol: "https", hostname: "aonosekehouseinvestmentdrc.site" },
    ],
  },
  eslint: {
    // Les avertissements ne bloquent pas ; les erreurs, si.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Le build ignorait les erreurs de type. Une conséquence réelle : la route
    // purchase-orders/[id] référençait dans son GET une variable `role` qui
    // n'était jamais déclarée — elle est partie en production et n'a été vue
    // qu'en lançant `tsc` à la main. Vérifier séparément ne remplace pas un
    // filet dans le build : ce qui n'est pas dans le pipeline finit par ne
    // plus être fait.
    ignoreBuildErrors: false,
  },
} as NextConfig;

export default nextConfig;
