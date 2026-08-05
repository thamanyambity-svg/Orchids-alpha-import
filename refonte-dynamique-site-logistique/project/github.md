repo: thamanyambity-svg/Orchids-alpha-import
branch: main

## Last sync
date: 2026-08-04T00:00:00Z
source: local folder `Orchids-alpha-import-master` + PR #8 (`fix/quote-po-flow`, open, 23 commits)

### Updated in this project
- Rebuilt the public marketing site to match the real product: a 60/40 escrow import platform, not a freight-forwarding agency.
- Copy, services (6), process (4 steps), testimonials, metrics and contact details lifted verbatim from `src/lib/locales/fr.ts`.
- New Plateforme page documenting the three real roles (BUYER / PARTNER / ADMIN) and the order state machine from `src/lib/workflow.ts`.
- Replaced the invented cost calculator with a 60/40 split simulator grounded in the real figures (60 % deposit, 40 % balance, 10 % commission).

## Screen map
| Screen (in Alpha Import.dc.html) | Built from |
| --- | --- |
| Accueil — hero, trust, 60/40, services, réseau, chiffres, process, témoignages, CTA | src/lib/locales/fr.ts (hero.*, trust.*, services.*, how.*, metrics.*, testimonial.*, cta.*), src/components/Hero.tsx, src/components/Services.tsx |
| Services + simulateur 60/40 | src/lib/locales/fr.ts (services.*), src/lib/workflow.ts (deposit 0.60 / balance 0.40 / commission 0.10) |
| Plateforme — 3 rôles + garanties | src/lib/types.ts (UserRole, KycStatus, IncidentType), src/app/dashboard/*, src/app/partner/*, src/app/admin/* |
| Processus — 4 étapes + 9 états | src/lib/locales/fr.ts (how.*), src/lib/workflow.ts (ORDER_TRANSITIONS) |
| Réseau — carte + hubs + origines | src/lib/locales/fr.ts (hero.tag.*, countries.*), world-map.js (Natural Earth) |
| Partenaires | src/app/partner-request/page.tsx, src/components/partner-wizard.tsx, PR #8 (provisioning, compliance-documents bucket) |
| Contact / accès | src/lib/locales/fr.ts (footer.*, quote.*), src/app/login, src/app/register |

## Notes from PR #8 (not reflected on the marketing site)
- Stripe keys are a mismatched pair (`pk_live_` + `sk_test_`) and `STRIPE_WEBHOOK_SECRET` is missing — no payment can complete yet.
- Partner email aliases and the WhatsApp Business API are deferred; WhatsApp currently works as a `wa.me` link, which is what the site uses.
