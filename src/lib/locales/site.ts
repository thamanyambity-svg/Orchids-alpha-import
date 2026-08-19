/**
 * Textes du site vitrine refondu.
 *
 * Séparé des six dictionnaires généraux pour deux raisons : ils sont volumineux
 * et propres à la vitrine, et les regrouper ici rend la relecture éditoriale
 * possible sans naviguer dans 337 lignes de clés applicatives.
 *
 * Le français et l'anglais viennent de la maquette Claude Design. Les quatre
 * autres langues sont des traductions de travail : elles doivent être relues par
 * un locuteur avant mise en production. Ce qui n'est pas traduit retombe sur le
 * français via le mécanisme de repli de `t()`.
 */

type SiteDict = Record<string, string>

const fr: SiteDict = {
  'site.nav.home': 'Accueil',
  'site.nav.about': 'Qui sommes-nous',
  'site.about.eyebrow': 'Qui sommes-nous',
  'site.about.title': "UNE INFRASTRUCTURE, PAS UN INTERMÉDIAIRE",
  'site.about.body':
    "Alpha Import Exchange est une filiale du Groupe A.Onoseke Investment RDC. Nous ne revendons pas de la marchandise : nous opérons l'infrastructure qui permet à un importateur congolais d'acheter à l'étranger sans avancer ses fonds à un inconnu.",
  'site.about.missionTitle': 'NOTRE RAISON D\'ÊTRE',
  'site.about.missionBody':
    "Importer depuis la RDC suppose de payer d'avance un fournisseur qu'on n'a jamais rencontré, dans un pays dont on ne parle pas la langue, sans recours en cas de litige. Nous avons construit la plateforme qui supprime ce saut dans le vide : un partenaire agréé sur place répond de la marchandise, et l'argent reste bloqué jusqu'à réception conforme.",
  'site.about.v1.tag': 'Séquestre',
  'site.about.v1.title': "L'ARGENT AVANT LA PAROLE",
  'site.about.v1.body':
    "Nos garanties ne sont pas contractuelles, elles sont techniques. Le solde ne peut pas être libéré avant que la réception conforme soit inscrite en base.",
  'site.about.v2.tag': 'Présence',
  'site.about.v2.title': 'UN HOMME SUR PLACE',
  'site.about.v2.body':
    "Dans chaque pays d'origine, un partenaire agréé sélectionne, négocie et inspecte. Il engage sa responsabilité jusqu'à l'embarquement.",
  'site.about.v3.tag': 'Traçabilité',
  'site.about.v3.title': 'TOUT EST ÉCRIT',
  'site.about.v3.body':
    "Chaque changement d'état, chaque validation, chaque mouvement de fonds est horodaté et attribué. Le journal d'audit fait foi.",
  'site.about.groupTitle': 'LE GROUPE',
  'site.about.groupBody':
    "A.Onoseke Investment RDC opère depuis Kinshasa, avec des relais à Bruxelles, New York, Shanghai, Tokyo et Dubaï. Alpha Import Exchange en est la branche import-export.",
  'site.nav.services': 'Services',
  'site.nav.platform': 'Plateforme',
  'site.nav.process': 'Processus',
  'site.nav.network': 'Réseau',
  'site.nav.partners': 'Partenaires',
  'site.cta.platform': 'Accéder à la plateforme',
  'site.cta.discover': 'Découvrir',
  'site.scroll': 'Scroll',

  'site.hero.body':
    "Alpha Import prend en charge votre importation de bout en bout — sourcing, achat, contrôle qualité, transport, dédouanement — et sécurise le paiement en deux temps : 60 % à la commande sur compte séquestre, 40 % seulement à réception conforme.",

  'site.trust.title': "Infrastructure d'Importation Certifiée",
  'site.trust.sub': 'Opérations sécurisées à travers 4 hubs mondiaux régis par les normes ICC.',

  'site.escrow.eyebrow': 'Sécurisation financière',
  'site.escrow.title': "VOUS NE PAYEZ LE SOLDE QU'À RÉCEPTION",
  'site.escrow.body':
    "C'est le cœur du dispositif. À la validation du devis, 60 % sont versés sur un compte séquestre — ils financent l'achat sans transiter par le fournisseur. Les 40 % restants ne sont appelés qu'après constat de réception conforme. Entre les deux, les fonds sont bloqués, traçables et gelables en cas d'incident.",
  'site.escrow.deposit': 'Acompte à la commande',
  'site.escrow.balance': 'Solde à réception conforme',
  'site.escrow.p1.title': 'FONDS BLOQUÉS',
  'site.escrow.p1.body':
    "L'acompte est placé sur un compte tiers. Ni Alpha ni le fournisseur n'en disposent librement : il sert exclusivement à financer votre achat.",
  'site.escrow.p2.title': 'LIBÉRATION CONDITIONNELLE',
  'site.escrow.p2.body':
    "Le solde n'est appelé qu'après constat de réception conforme. Tant que la marchandise n'est pas validée, l'argent ne bouge pas.",
  'site.escrow.p3.title': 'GEL EN CAS D\'INCIDENT',
  'site.escrow.p3.body':
    'Perte, retard, non-conformité ou fraude : un incident déclaré gèle le dossier et les fonds jusqu\'à décision, avec indemnisation possible.',

  'site.svc.eyebrow': 'Ce que nous faisons',
  'site.svc.title': 'NOS SERVICES',
  'site.svc.pageTitle': 'NOS SERVICES',
  'site.svc.pageBody':
    'Six prestations qui se combinent. La plupart de nos clients commencent par le sourcing et finissent par nous confier l\'ensemble du flux, financement compris.',
  'site.svc.sourcing.title': 'SOURCING & ACHATS',
  'site.svc.sourcing.body':
    'Sélection rigoureuse des fournisseurs en Chine, Turquie, Dubai, Japon et Thaïlande avec inspection qualité systématique.',
  'site.svc.logistics.title': 'LOGISTIQUE & TRANSIT',
  'site.svc.logistics.body':
    'Fret maritime, aérien et multimodal. Dédouanement clé en main à Kinshasa via notre partenariat SGS.',
  'site.svc.logistics.detail': 'Conditionnement · Fret maritime · Tracking GPS',
  'site.svc.finance.title': 'SÉCURISATION FINANCIÈRE',
  'site.svc.finance.body':
    'Paiement séquencé 60/40. Fonds séquestrés sur compte tiers. Libération du solde qu\'à réception conforme.',
  'site.svc.quality.title': 'CONTRÔLE QUALITÉ',
  'site.svc.quality.body':
    "Certification SGS. Inspection avant expédition, suivi tracking, rapport photo et certificat de conformité d'origine.",
  'site.svc.trade.title': 'FINANCEMENT TRADE',
  'site.svc.trade.body':
    'Préfinancement, crédit documentaire, assurance-crédit et couverture contre le risque-pays.',
  'site.svc.consulting.title': 'CONSEIL & ACCOMPAGNEMENT',
  'site.svc.consulting.body':
    'Étude de faisabilité, optimisation fiscale et douanière, montage de dossier import-export.',
  'site.svc.consulting.detail': 'RDC · Belgique · Chine · UAE · USA',

  'site.net.eyebrow': 'Notre réseau',
  'site.net.title': '47 PAYS, UN SEUL DOSSIER',
  'site.net.body':
    "Chine, Turquie, Dubaï, Japon, Thaïlande : dans chaque pays d'origine, un partenaire agréé achète pour vous et répond de la marchandise.",
  'site.net.pageTitle': 'LE RÉSEAU',
  'site.net.pageBody':
    "Une présence opérationnelle directe sur 4 continents, et un partenaire agréé dans chaque pays d'origine que nous opérons.",
  'site.net.legendHub': 'Hub Kinshasa',
  'site.net.legendRoute': 'Corridor actif',
  'site.net.hubsTitle': 'QUATRE HUBS MONDIAUX',
  'site.net.originsTitle': "PAYS D'ORIGINE OPÉRÉS EN DIRECT",
  'site.net.originsBody':
    "Pour chacun, un partenaire agréé sur place : il sélectionne le fournisseur, négocie, inspecte et répond de la marchandise jusqu'à l'embarquement.",
  'site.net.hub1.tag': 'Siège',
  'site.net.hub1.cities': 'KINSHASA · RDC',
  'site.net.hub1.body': "Direction, dédouanement et livraison finale. C'est ici que le dossier se clôt.",
  'site.net.hub2.tag': 'Asie',
  'site.net.hub2.cities': 'SHANGHAI · TOKYO',
  'site.net.hub2.body': 'Sourcing industriel, électronique et équipement. Consolidation au départ.',
  'site.net.hub3.tag': 'Golfe',
  'site.net.hub3.cities': 'DUBAÏ',
  'site.net.hub3.body': "Redistribution et transit rapide vers l'Afrique centrale.",
  'site.net.hub4.tag': 'Europe & Amériques',
  'site.net.hub4.cities': 'BRUXELLES · NEW YORK',
  'site.net.hub4.body': 'Relations donneurs d\'ordre, financement et assurance-crédit.',

  'site.met.eyebrow': 'Chiffres clés',
  'site.met.title': 'ALPHA IMPORT EN CHIFFRES',
  'site.met.countries': 'Pays partenaires',
  'site.met.partners': 'Partenaires actifs',
  'site.met.hubs': 'Hubs mondiaux',
  'site.met.languages': 'Langues',
  'site.met.commission': 'Commission Alpha',
  'site.met.quoteTime': 'Délai de cotation',

  'site.how.eyebrow': 'Comment ça marche',
  'site.how.title': 'DE LA DEMANDE À LA LIVRAISON',
  'site.how.pageTitle': 'LE PROCESSUS',
  'site.how.pageBody':
    'Quatre étapes côté client, neuf états côté plateforme. Vous savez à chaque instant où en est votre commande, qui la traite et où sont vos fonds.',
  'site.states.title': 'LES ÉTATS DE VOTRE COMMANDE',
  'site.states.body':
    "La plateforme n'autorise aucun raccourci : chaque passage d'un état au suivant est réservé à un rôle précis et inscrit au journal d'audit.",
  'site.states.h1': 'État',
  'site.states.h2': 'Ce qui se passe',
  'site.states.h3': 'Qui agit',

  'site.step1.tag': '24 H',
  'site.step1.title': 'DEMANDE',
  'site.step1.body': 'Soumettez votre cahier des charges et recevez un devis détaillé sous 24h.',
  'site.step1.long':
    "Vous décrivez la marchandise, la quantité, le pays d'origine et votre échéance dans votre espace client. La demande est qualifiée puis confiée à un partenaire agréé du pays concerné.",
  'site.step2.tag': 'SÉQUESTRE',
  'site.step2.title': 'VALIDATION',
  'site.step2.body': 'Validez le devis et versez l\'acompte 60 % sur un compte séquestre sécurisé.',
  'site.step2.long':
    "L'acceptation du devis génère automatiquement un bon de commande que vous signez en ligne. L'acompte de 60 % est appelé et placé sous séquestre : il finance l'achat sans être versé au fournisseur.",
  'site.step3.tag': 'EXÉCUTION',
  'site.step3.title': 'EXÉCUTION',
  'site.step3.body': 'Nos équipes sourcing, achat, contrôle qualité et expédition. Suivi tracking en temps réel.',
  'site.step3.long':
    "Le partenaire achète sur preuve, la marchandise est inspectée avant expédition, puis expédiée avec tracking. Chaque étape franchie déclenche une notification et une entrée au journal d'audit.",
  'site.step4.tag': 'SOLDE 40 %',
  'site.step4.title': 'LIVRAISON',
  'site.step4.body': 'Dédouanement à Kinshasa. Paiement du solde 40 % à la livraison conforme.',
  'site.step4.long':
    'Dédouanement puis livraison. Le solde de 40 % n\'est appelé qu\'après constat de réception conforme ; en cas de non-conformité, les fonds séquestrés sont gelés le temps de l\'instruction.',

  'site.pf.eyebrow': 'La plateforme',
  'site.pf.title': 'TROIS RÔLES, UN MÊME DOSSIER',
  'site.pf.body':
    "Alpha Import n'est pas qu'un prestataire : c'est une plateforme où l'acheteur, le partenaire d'origine et l'administrateur travaillent sur le même dossier, chacun avec ses droits.",
  'site.sec.title': 'CE QUI PROTÈGE VOTRE ARGENT',
  'site.sec.body':
    'Les garanties ne sont pas des promesses commerciales : elles sont inscrites dans le fonctionnement de la plateforme.',
  'site.role.buyer.code': 'Acheteur',
  'site.role.buyer.title': 'VOTRE ESPACE CLIENT',
  'site.role.buyer.body': 'Vous déposez vos demandes et suivez tout le dossier sans relancer personne.',
  'site.role.partner.code': 'Partenaire',
  'site.role.partner.title': "L'ACHETEUR SUR PLACE",
  'site.role.partner.body':
    "Dans le pays d'origine, un partenaire agréé travaille votre dossier et répond de la marchandise.",
  'site.role.admin.code': 'Administration',
  'site.role.admin.title': 'LE CONTRÔLE ALPHA',
  'site.role.admin.body': "Rien ne passe sans validation : c'est l'administration qui arbitre, valide et libère.",
  'site.sec1.tag': 'Identité',
  'site.sec1.title': 'VÉRIFICATION KYC',
  'site.sec1.body':
    "Chaque compte est vérifié avant de pouvoir commander. Les partenaires fournissent registre de commerce, pièce d'identité du dirigeant et numéro fiscal.",
  'site.sec2.tag': 'Traçabilité',
  'site.sec2.title': "JOURNAL D'AUDIT",
  'site.sec2.body':
    "Chaque changement d'état, chaque validation et chaque libération de fonds est horodatée et attribuée à son auteur.",
  'site.sec3.tag': 'Documents',
  'site.sec3.title': 'ESPACE PRIVÉ',
  'site.sec3.body':
    "Les pièces d'identité et documents de conformité sont stockés dans un espace privé, non listable, consultable par la seule direction.",
  'site.sec4.tag': 'Recours',
  'site.sec4.title': 'INCIDENTS',
  'site.sec4.body':
    'Perte, retard, non-conformité, fraude : quatre motifs déclarables, avec gel du dossier et indemnisation possible après instruction.',

  'site.part.eyebrow': 'Devenir partenaire',
  'site.part.title': "ACHETER POUR L'AFRIQUE",
  'site.part.body':
    "Vous êtes fournisseur, négociant ou agent d'achat en Chine, en Turquie, au Japon, en Thaïlande ou aux Émirats ? Devenez partenaire agréé : vous recevez des demandes qualifiées, vous cotez, et vous êtes payé sur fonds déjà séquestrés.",
  'site.part.reqTitle': 'CANDIDATER',
  'site.part.reqBody':
    "Le dossier de candidature comprend vos documents légaux (RCCM ou équivalent, pièce d'identité du dirigeant, numéro fiscal) et vos références. Ils sont déposés dans un espace privé, consultable par la seule direction.",
  'site.part.reqBtn': 'Déposer une candidature',
  'site.part1.title': 'CANDIDATURE',
  'site.part1.body': 'Vous déposez votre dossier : documents légaux, capacité, références et pays couvert.',
  'site.part2.title': 'AGRÉMENT',
  'site.part2.body':
    'La direction instruit le dossier et vérifie les pièces. À l\'agrément, votre compte partenaire est créé et vous recevez un lien d\'accès personnel.',
  'site.part3.title': 'AFFECTATION',
  'site.part3.body':
    'Les demandes de votre pays vous sont assignées. Vous référencez vos fournisseurs et soumettez vos cotations dans la plateforme.',
  'site.part4.title': 'EXÉCUTION & PAIEMENT',
  'site.part4.body':
    'Feu vert donné une fois l\'acompte séquestré : vous achetez sur fonds déjà disponibles. Votre rémunération est calculée à la commande, commission Alpha déduite.',

  'site.quote.eyebrow': 'Accès',
  'site.quote.title': 'DEMANDER UNE COTATION',
  'site.quote.body':
    "Les demandes d'importation se déposent dans votre espace client : vous décrivez la marchandise, choisissez le pays d'origine, et recevez une cotation détaillée sous 24 heures.",
  'site.access.title': 'Espace client',
  'site.access.head': 'TOUT SE PASSE DANS VOTRE ESPACE',
  'site.access.body':
    'Demandes, cotations, bons de commande, factures proforma et finales, documents, paiements, messages et incidents : un seul endroit, historisé.',
  'site.access.login': 'Connexion',
  'site.access.register': 'Créer un compte',
  'site.access.note':
    "La création de compte déclenche une vérification KYC. Les demandes d'importation sont accessibles une fois l'identité validée.",
  'site.contact.address': 'Adresse',
  'site.contact.phone': 'Téléphone',
  'site.contact.languages': 'Langues de la plateforme',

  'site.ctaSection.title': "PRÊT À PASSER À L'ÉCHELLE ?",
  'site.ctaSection.body': 'Rejoignez les 1 200+ partenaires qui nous font confiance pour leurs importations.',
  'site.ctaSection.join': 'Rejoindre Alpha Import',

  'site.sim.eyebrow': 'Simulateur',
  'site.sim.title': 'VOTRE PAIEMENT SÉQUENCÉ',
  'site.sim.body':
    'Entrez le montant de votre commande pour voir la répartition exacte : ce que vous versez au départ, ce qui reste dû à réception, et la commission Alpha.',
  'site.sim.amount': 'Montant de la commande',
  'site.sim.deposit': 'Acompte 60 %',
  'site.sim.balance': 'Solde 40 %',
  'site.sim.commission': 'Commission Alpha 10 %',
  'site.sim.payout': 'Reversé au partenaire',
  'site.sim.note':
    'Répartition appliquée par la plateforme : acompte 60 %, solde 40 %, commission Alpha 10 % du montant total. Le devis ferme, lui, est établi sous 24 heures à partir de votre cahier des charges.',

  'site.foot.subsidiary': 'Filiale du Groupe A.Onoseke Investment RDC',
  'site.foot.address': 'Kinshasa, République Démocratique du Congo',
  'site.foot.rights': '© 2026 A.Onoseke Investment. Tous droits réservés.',
  'site.foot.company': 'Société',
  'site.foot.legal': 'Mentions légales',
  'site.foot.privacy': 'Politique de confidentialité',
  'site.foot.terms': 'Conditions générales',
}

const en: SiteDict = {
  'site.nav.home': 'Home',
  'site.nav.about': 'About us',
  'site.about.eyebrow': 'About us',
  'site.about.title': 'INFRASTRUCTURE, NOT A MIDDLEMAN',
  'site.about.body':
    "Alpha Import Exchange is a subsidiary of Groupe A.Onoseke Investment RDC. We do not resell goods: we run the infrastructure that lets a Congolese importer buy abroad without advancing funds to a stranger.",
  'site.about.missionTitle': 'WHY WE EXIST',
  'site.about.missionBody':
    "Importing from the DRC means paying a supplier you have never met, in a country whose language you do not speak, with no recourse in a dispute. We built the platform that removes that leap of faith: an approved partner on the ground answers for the goods, and the money stays blocked until conforming delivery.",
  'site.about.v1.tag': 'Escrow',
  'site.about.v1.title': 'MONEY BEFORE WORDS',
  'site.about.v1.body':
    'Our guarantees are technical, not contractual. The balance cannot be released before conforming receipt is written to the database.',
  'site.about.v2.tag': 'Presence',
  'site.about.v2.title': 'SOMEONE ON THE GROUND',
  'site.about.v2.body':
    'In every origin country, an approved partner selects, negotiates and inspects. They answer for the goods up to loading.',
  'site.about.v3.tag': 'Traceability',
  'site.about.v3.title': 'EVERYTHING IS RECORDED',
  'site.about.v3.body':
    'Every state change, every approval, every movement of funds is timestamped and attributed. The audit log is the record.',
  'site.about.groupTitle': 'THE GROUP',
  'site.about.groupBody':
    'A.Onoseke Investment RDC operates from Kinshasa, with relays in Brussels, New York, Shanghai, Tokyo and Dubai. Alpha Import Exchange is its import-export arm.',
  'site.nav.services': 'Services',
  'site.nav.platform': 'Platform',
  'site.nav.process': 'Process',
  'site.nav.network': 'Network',
  'site.nav.partners': 'Partners',
  'site.cta.platform': 'Enter the platform',
  'site.cta.discover': 'Discover',
  'site.scroll': 'Scroll',

  'site.hero.body':
    'Alpha Import handles your import end to end — sourcing, purchasing, quality control, freight, customs — and secures payment in two stages: 60 % into escrow at order, the remaining 40 % only once delivery is confirmed conforming.',

  'site.trust.title': 'Certified Import Infrastructure',
  'site.trust.sub': 'Secured operations across 4 global hubs governed by ICC standards.',

  'site.escrow.eyebrow': 'Financial security',
  'site.escrow.title': 'YOU PAY THE BALANCE ONLY ON DELIVERY',
  'site.escrow.body':
    'This is the core of the arrangement. On quote approval, 60 % goes into an escrow account — it funds the purchase without passing through the supplier. The remaining 40 % is called only after conforming delivery is recorded. In between, the funds are blocked, traceable and freezable if an incident is raised.',
  'site.escrow.deposit': 'Deposit at order',
  'site.escrow.balance': 'Balance on conforming delivery',
  'site.escrow.p1.title': 'FUNDS BLOCKED',
  'site.escrow.p1.body':
    'The deposit sits in a third-party account. Neither Alpha nor the supplier can draw on it freely: it funds your purchase and nothing else.',
  'site.escrow.p2.title': 'CONDITIONAL RELEASE',
  'site.escrow.p2.body':
    'The balance is called only after conforming receipt is recorded. Until the goods are accepted, the money does not move.',
  'site.escrow.p3.title': 'FREEZE ON INCIDENT',
  'site.escrow.p3.body':
    'Loss, delay, non-conformity or fraud: a declared incident freezes the file and the funds until a decision, with compensation possible.',

  'site.svc.eyebrow': 'What we do',
  'site.svc.title': 'OUR SERVICES',
  'site.svc.pageTitle': 'OUR SERVICES',
  'site.svc.pageBody':
    'Six services that combine. Most clients start with sourcing and end up handing us the whole flow, financing included.',
  'site.svc.sourcing.title': 'SOURCING & PURCHASING',
  'site.svc.sourcing.body':
    'Rigorous supplier selection in China, Türkiye, Dubai, Japan and Thailand with systematic quality inspection.',
  'site.svc.logistics.title': 'LOGISTICS & TRANSIT',
  'site.svc.logistics.body':
    'Ocean, air and multimodal freight. Turnkey customs clearance in Kinshasa through our SGS partnership.',
  'site.svc.logistics.detail': 'Packing · Ocean freight · GPS tracking',
  'site.svc.finance.title': 'FINANCIAL SECURITY',
  'site.svc.finance.body':
    'Sequenced 60/40 payment. Funds held in a third-party escrow account. Balance released only on conforming delivery.',
  'site.svc.quality.title': 'QUALITY CONTROL',
  'site.svc.quality.body':
    'SGS certification. Pre-shipment inspection, tracking, photo report and certificate of origin conformity.',
  'site.svc.trade.title': 'TRADE FINANCE',
  'site.svc.trade.body': 'Pre-financing, documentary credit, credit insurance and country-risk cover.',
  'site.svc.consulting.title': 'ADVISORY & SUPPORT',
  'site.svc.consulting.body': 'Feasibility studies, tax and customs optimisation, import-export file preparation.',
  'site.svc.consulting.detail': 'DRC · Belgium · China · UAE · USA',

  'site.net.eyebrow': 'Our network',
  'site.net.title': '47 COUNTRIES, ONE FILE',
  'site.net.body':
    'China, Türkiye, Dubai, Japan, Thailand: in every origin country, an approved partner buys on your behalf and answers for the goods.',
  'site.net.pageTitle': 'THE NETWORK',
  'site.net.pageBody':
    'Direct operational presence across 4 continents, and an approved partner in every origin country we run.',
  'site.net.legendHub': 'Kinshasa hub',
  'site.net.legendRoute': 'Active corridor',
  'site.net.hubsTitle': 'FOUR GLOBAL HUBS',
  'site.net.originsTitle': 'ORIGIN COUNTRIES RUN DIRECTLY',
  'site.net.originsBody':
    'For each one, an approved partner on the ground: they select the supplier, negotiate, inspect and answer for the goods up to loading.',
  'site.net.hub1.tag': 'Head office',
  'site.net.hub1.cities': 'KINSHASA · DRC',
  'site.net.hub1.body': 'Management, customs clearance and final delivery. This is where the file closes.',
  'site.net.hub2.tag': 'Asia',
  'site.net.hub2.cities': 'SHANGHAI · TOKYO',
  'site.net.hub2.body': 'Industrial, electronics and equipment sourcing. Consolidation at origin.',
  'site.net.hub3.tag': 'Gulf',
  'site.net.hub3.cities': 'DUBAI',
  'site.net.hub3.body': 'Redistribution and fast transit into Central Africa.',
  'site.net.hub4.tag': 'Europe & Americas',
  'site.net.hub4.cities': 'BRUSSELS · NEW YORK',
  'site.net.hub4.body': 'Client relations, financing and credit insurance.',

  'site.met.eyebrow': 'Key figures',
  'site.met.title': 'ALPHA IMPORT IN NUMBERS',
  'site.met.countries': 'Partner countries',
  'site.met.partners': 'Active partners',
  'site.met.hubs': 'Global hubs',
  'site.met.languages': 'Languages',
  'site.met.commission': 'Alpha commission',
  'site.met.quoteTime': 'Quotation time',

  'site.how.eyebrow': 'How it works',
  'site.how.title': 'FROM ENQUIRY TO DELIVERY',
  'site.how.pageTitle': 'THE PROCESS',
  'site.how.pageBody':
    'Four steps for the client, nine states inside the platform. You always know where your order stands, who is handling it and where your funds are.',
  'site.states.title': "YOUR ORDER'S STATES",
  'site.states.body':
    'The platform allows no shortcut: every move from one state to the next is reserved to a specific role and written to the audit log.',
  'site.states.h1': 'State',
  'site.states.h2': 'What happens',
  'site.states.h3': 'Who acts',

  'site.step1.tag': '24 H',
  'site.step1.title': 'ENQUIRY',
  'site.step1.body': 'Submit your specification and receive a detailed quotation within 24h.',
  'site.step1.long':
    'You describe the goods, quantity, origin country and deadline in your client area. The enquiry is qualified and handed to an approved partner in that country.',
  'site.step2.tag': 'ESCROW',
  'site.step2.title': 'APPROVAL',
  'site.step2.body': 'Approve the quotation and pay the 60 % deposit into a secured escrow account.',
  'site.step2.long':
    'Accepting the quotation automatically generates a purchase order you sign online. The 60 % deposit is called and placed in escrow: it funds the purchase without being paid to the supplier.',
  'site.step3.tag': 'EXECUTION',
  'site.step3.title': 'EXECUTION',
  'site.step3.body': 'Our sourcing, purchasing, quality control and shipping teams. Real-time tracking.',
  'site.step3.long':
    'The partner buys against proof, the goods are inspected before shipment, then shipped with tracking. Every completed step triggers a notification and an audit-log entry.',
  'site.step4.tag': '40 % BALANCE',
  'site.step4.title': 'DELIVERY',
  'site.step4.body': 'Customs clearance in Kinshasa. 40 % balance paid on conforming delivery.',
  'site.step4.long':
    'Clearance then delivery. The 40 % balance is called only after conforming receipt is recorded; on non-conformity, escrowed funds are frozen pending review.',

  'site.pf.eyebrow': 'The platform',
  'site.pf.title': 'THREE ROLES, ONE FILE',
  'site.pf.body':
    'Alpha Import is more than a provider: it is a platform where the buyer, the origin partner and the administrator work on the same file, each with their own rights.',
  'site.sec.title': 'WHAT PROTECTS YOUR MONEY',
  'site.sec.body': 'The guarantees are not sales promises: they are built into how the platform works.',
  'site.role.buyer.code': 'Buyer',
  'site.role.buyer.title': 'YOUR CLIENT AREA',
  'site.role.buyer.body': 'You file your enquiries and follow the whole file without chasing anyone.',
  'site.role.partner.code': 'Partner',
  'site.role.partner.title': 'THE BUYER ON SITE',
  'site.role.partner.body':
    'In the origin country, an approved partner works your file and answers for the goods.',
  'site.role.admin.code': 'Administration',
  'site.role.admin.title': "ALPHA'S CONTROL",
  'site.role.admin.body': 'Nothing moves without approval: administration arbitrates, validates and releases.',
  'site.sec1.tag': 'Identity',
  'site.sec1.title': 'KYC VERIFICATION',
  'site.sec1.body': "Every account is verified before it can order. Partners provide trade register, director's ID and tax number.",
  'site.sec2.tag': 'Traceability',
  'site.sec2.title': 'AUDIT LOG',
  'site.sec2.body':
    'Every state change, every approval and every release of funds is timestamped and attributed to its author.',
  'site.sec3.tag': 'Documents',
  'site.sec3.title': 'PRIVATE STORAGE',
  'site.sec3.body':
    'Identity papers and compliance documents are held in a private, non-listable space, readable by management alone.',
  'site.sec4.tag': 'Recourse',
  'site.sec4.title': 'INCIDENTS',
  'site.sec4.body':
    'Loss, delay, non-conformity, fraud: four declarable grounds, with the file frozen and compensation possible after review.',

  'site.part.eyebrow': 'Become a partner',
  'site.part.title': 'BUYING FOR AFRICA',
  'site.part.body':
    'Are you a supplier, trader or buying agent in China, Türkiye, Japan, Thailand or the UAE? Become an approved partner: you receive qualified enquiries, you quote, and you are paid from funds already held in escrow.',
  'site.part.reqTitle': 'APPLY',
  'site.part.reqBody':
    "The application includes your legal documents (trade register or equivalent, director's ID, tax number) and your references. They are stored in a private space, readable by management alone.",
  'site.part.reqBtn': 'Submit an application',
  'site.part1.title': 'APPLICATION',
  'site.part1.body': 'You file your application: legal documents, capacity, references and the country you cover.',
  'site.part2.title': 'APPROVAL',
  'site.part2.body':
    'Management reviews the file and checks the papers. On approval, your partner account is created and you receive a personal access link.',
  'site.part3.title': 'ASSIGNMENT',
  'site.part3.body':
    'Enquiries from your country are assigned to you. You reference your suppliers and submit quotations inside the platform.',
  'site.part4.title': 'EXECUTION & PAYMENT',
  'site.part4.body':
    "Green light once the deposit is escrowed: you buy against funds already available. Your payout is set at order, net of Alpha's commission.",

  'site.quote.eyebrow': 'Access',
  'site.quote.title': 'REQUEST A QUOTATION',
  'site.quote.body':
    'Import enquiries are filed in your client area: describe the goods, pick the origin country, and receive a detailed quotation within 24 hours.',
  'site.access.title': 'Client area',
  'site.access.head': 'EVERYTHING HAPPENS IN YOUR AREA',
  'site.access.body':
    'Enquiries, quotations, purchase orders, proforma and final invoices, documents, payments, messages and incidents: one place, fully logged.',
  'site.access.login': 'Sign in',
  'site.access.register': 'Create an account',
  'site.access.note':
    'Creating an account triggers KYC verification. Import enquiries open once your identity is validated.',
  'site.contact.address': 'Address',
  'site.contact.phone': 'Phone',
  'site.contact.languages': 'Platform languages',

  'site.ctaSection.title': 'READY TO SCALE?',
  'site.ctaSection.body': 'Join the 1,200+ partners who trust us with their imports.',
  'site.ctaSection.join': 'Join Alpha Import',

  'site.sim.eyebrow': 'Simulator',
  'site.sim.title': 'YOUR SEQUENCED PAYMENT',
  'site.sim.body':
    'Enter your order amount to see the exact split: what you pay up front, what remains due on delivery, and the Alpha commission.',
  'site.sim.amount': 'Order amount',
  'site.sim.deposit': '60 % deposit',
  'site.sim.balance': '40 % balance',
  'site.sim.commission': 'Alpha commission 10 %',
  'site.sim.payout': 'Paid to the partner',
  'site.sim.note':
    'Split applied by the platform: 60 % deposit, 40 % balance, Alpha commission 10 % of the total. The firm quote itself is issued within 24 hours from your specification.',

  'site.foot.subsidiary': 'Subsidiary of Groupe A.Onoseke Investment RDC',
  'site.foot.address': 'Kinshasa, Democratic Republic of Congo',
  'site.foot.rights': '© 2026 A.Onoseke Investment. All rights reserved.',
  'site.foot.company': 'Company',
  'site.foot.legal': 'Legal notice',
  'site.foot.privacy': 'Privacy policy',
  'site.foot.terms': 'Terms & conditions',
}

/**
 * Traductions de travail. Seules les clés de navigation, d'appel à l'action et
 * les titres courts sont fournies : ce sont celles dont le sens ne se devine pas
 * et qui gêneraient le plus un visiteur. Les corps de texte longs retombent
 * volontairement sur le français plutôt que de risquer un contresens commercial
 * dans une langue que personne ici ne peut relire.
 */
const tr: SiteDict = {
  'site.nav.home': 'Ana sayfa',
  'site.nav.about': 'Hakkımızda',
  'site.nav.services': 'Hizmetler',
  'site.nav.platform': 'Platform',
  'site.nav.process': 'Süreç',
  'site.nav.network': 'Ağ',
  'site.nav.partners': 'Ortaklar',
  'site.cta.platform': 'Platforma giriş',
  'site.cta.discover': 'Keşfedin',
  'site.svc.title': 'HİZMETLERİMİZ',
  'site.net.title': '47 ÜLKE, TEK DOSYA',
  'site.met.title': 'RAKAMLARLA ALPHA IMPORT',
  'site.how.title': 'TALEPTEN TESLİMATA',
  'site.access.login': 'Giriş',
  'site.access.register': 'Hesap oluştur',
  'site.sim.deposit': '%60 peşinat',
  'site.sim.balance': '%40 bakiye',
}

const zh: SiteDict = {
  'site.nav.home': '首页',
  'site.nav.about': '关于我们',
  'site.nav.services': '服务',
  'site.nav.platform': '平台',
  'site.nav.process': '流程',
  'site.nav.network': '网络',
  'site.nav.partners': '合作伙伴',
  'site.cta.platform': '进入平台',
  'site.cta.discover': '了解更多',
  'site.svc.title': '我们的服务',
  'site.net.title': '47 个国家，一个档案',
  'site.met.title': '数据中的 ALPHA IMPORT',
  'site.how.title': '从询价到交付',
  'site.access.login': '登录',
  'site.access.register': '创建账户',
  'site.sim.deposit': '60 % 定金',
  'site.sim.balance': '40 % 尾款',
}

const ja: SiteDict = {
  'site.nav.home': 'ホーム',
  'site.nav.about': '会社概要',
  'site.nav.services': 'サービス',
  'site.nav.platform': 'プラットフォーム',
  'site.nav.process': 'プロセス',
  'site.nav.network': 'ネットワーク',
  'site.nav.partners': 'パートナー',
  'site.cta.platform': 'プラットフォームへ',
  'site.cta.discover': '詳しく見る',
  'site.svc.title': 'サービス',
  'site.net.title': '47か国、ひとつの案件',
  'site.met.title': '数字で見る ALPHA IMPORT',
  'site.how.title': '依頼から納品まで',
  'site.access.login': 'ログイン',
  'site.access.register': 'アカウント作成',
  'site.sim.deposit': '手付金 60 %',
  'site.sim.balance': '残金 40 %',
}

const ar: SiteDict = {
  'site.nav.home': 'الرئيسية',
  'site.nav.about': 'من نحن',
  'site.nav.services': 'الخدمات',
  'site.nav.platform': 'المنصة',
  'site.nav.process': 'المسار',
  'site.nav.network': 'الشبكة',
  'site.nav.partners': 'الشركاء',
  'site.cta.platform': 'الدخول إلى المنصة',
  'site.cta.discover': 'اكتشف',
  'site.svc.title': 'خدماتنا',
  'site.net.title': '47 دولة، ملف واحد',
  'site.met.title': 'ألفا إمبورت بالأرقام',
  'site.how.title': 'من الطلب إلى التسليم',
  'site.access.login': 'تسجيل الدخول',
  'site.access.register': 'إنشاء حساب',
  'site.sim.deposit': 'دفعة 60 %',
  'site.sim.balance': 'رصيد 40 %',
}

export const siteLocales: Record<string, SiteDict> = { fr, en, tr, zh, ja, ar }

export default siteLocales
