# Analyse Cellio — 10 octobre 2026

Analyse de l'archive Cellio_V1.0.zip et de l'export DB du 10 octobre 2026 à 09:29 UTC. Implémentation correspondante : Cellio V1.1, construite à partir de Frosti V1.2 et adaptée au schéma réel Cellio.

## Données et rôle

Cellio est la source de vérité des stocks en caves, placards et réserves ; Frosti couvre le froid, Mealio orchestre repas et courses. L'identification entre applications se fait par nom du foyer, chaque base conservant son UUID. Les tables métier restent le contrat direct actuel.

L'export contient 72 lots, 7 équipements, 5 comptes de foyer, 12 catégories, 60 modèles, 10 règles d'alerte et 5 règles de rangement. Aucun lot sans propriétaire, sans lieu ou rattaché à un autre foyer ; aucune quantité nulle ou négative. Les équipements : KH — Cave longère, Réserve longère, Cuisine réserve, Cuisine meuble ; Argenteuil — Cave, Sous-sol ; Sauffroy — Placard. Aucun rattachement n'est déduit du seul nom d'un lieu.

Les règles de stockage sont utilisées par Mealio. storage_defaults est vide, storage_routing_rules contient cinq règles. Les données métiers comprennent vins (domaine et millésime), préparations en pots (date de fabrication) et épicerie. format est un champ existant à conserver même s'il n'est pas exploité partout dans l'ancienne interface.

## Constats et correction

| Constat dans l'ancienne app | Conséquence | Traitement V1.1 |
|---|---|---|
| Login par requête Supabase du navigateur sur username/password | Mot de passe et tables exposés à un client public | Vérification serveur, cookie signé HttpOnly, fermeture publique progressive |
| Cookie congelo_user_id = UUID non signé | Un identifiant choisi suffit à contourner le vigile de page | Session HMAC, expiration et vérification du compte sur chaque API |
| RLS désactivée sur toutes les tables, aucun policy, droits publics étendus | Filtrage dans les écrans insuffisant | RLS et révocation anon/authenticated après déploiement ; service_role conservé |
| search/page interroge freezers au lieu de cellars | Recherche/lieux incorrects | Même moteur StockScreen pour accueil, recherche, alertes et inventaire |
| Écritures par ID et plusieurs appels séparés | Concurrence, écrasements et résultats partiels | RPC transactionnels, contrôle de versions, limites et idempotence |
| Suppression d'équipement peut d'abord supprimer ses articles | Perte de stock, règles orphelines | Refus tant que lots/règles présents ; transfert et confirmation |
| Duplication de logique dans accueil, recherche, alertes, cron | Comportements divergents | Fonctions partagées pour alertes et composants stock |
| Cron sans secret, erreurs/stack exposées, résultat Ntfy non vérifié | Déclenchement public et faux succès | CRON_SECRET, erreurs contrôlées, statut HTTP Ntfy vérifié, suivi foyer/jour |
| Service worker cache toutes les réponses GET, y compris Supabase | Données privées disponibles depuis cache ancien | Purge cellio-* et ancien frosti-*, pas de cache privé |
| Métadonnées effacées selon le type de lieu | Un vin déplacé dans un placard perd ses détails à l'édition | Champs conservés indépendamment du lieu, testés dans transferts/annulations |
| Alertes sans date à 80 % du délai | Le nombre de jours choisi n'est pas le seuil effectif | Déclenchement au jour configuré, valeurs du foyer conservées |
| Apogée et DLC présentées ensemble | Risque de lire une apogée de vin comme une échéance sanitaire | Libellé Apogée pour vins, Date de suivi pour autres, Date indicative si calculée |
| Actions et ajout d'équipements difficiles à retrouver | Scroll et parcours longs sur téléphone | Réglages dédiés, raccourcis, ajout en haut et bas, dialogues avec validation visible |

## Fonctionnalités reprises de Frosti

Accueil stock, recherche sans accents, filtres dates/catégorie/lieu, tri ; consommation décimale, retrait, édition, nouvel achat similaire ; inventaire versionné ; mouvements externes journalisés et historique consultable/annulable ; transferts partiels et groupés jusqu'à 100 lots, fusion stricte et regroupement manuel de doublons ; création/renommage/suppression protégée de lieux ; création de canal Ntfy, test et aide abonnement ; dates indicatives facultatives et rappels par catégorie/type d'espace ; configuration serveur explicite, version visible et projet complet.

## Adaptations spécifiques

Cellars, cellar_id, is_secondary, millesime, domaine, format, date_fabrication restent inchangés. False = cave ; true = réserve/placard/meuble. Le classement n'interdit pas de stocker un vin ailleurs. Les catégories existantes sont toutes proposées, avec saisie libre pour les produits Mealio.

La fusion exige notamment le même millésime, domaine, format et fabrication. Les dates d'entrée, date de suivi et type declared/estimated participent aussi à l'identité. Aucun arrondi/conversion d'unité ou rapprochement approximatif n'est fait. Aucune fusion des anciennes données au déploiement.

Les anciennes dates ne sont ni effacées ni recalculées. La date de fabrication reste exactement celle stockée, pas un mois arbitrairement ramené au premier jour. Les délais existants sont conservés. Sans règle, les défauts historiques de suivi sont repris (730/365/180/90 jours), avec déclenchement exact. Anticipation 30 jours par défaut. Aucune règle automatique d'apogée n'est déduite du millésime.

## Vérification et limites

Le schéma de test est généré depuis le catalogue fourni, sans données privées. Tests SQL avec PGlite : migrations répétables, propriétaires, permissions, quantités, transactions, idempotence, versions, audit, annulations et fusion groupée ; champs spécifiques Cellio en édition/transfert/annulation. Tests de session et dates Europe/Paris. Tests interface Chromium avec API simulées, écran 320 à 1024 px, formulaires et détails vins. TypeScript, lint et build Next.js.

La migration a aussi été exercée sur une copie locale de l'export réel : chaque champ historique des 72 articles est comparé avant/après, validation des contraintes et fermeture publique exécutées avec succès. Aucun appel ni modification Supabase réel dans ce travail. Cela ne remplace pas la recette Vercel/Supabase et les essais de Mealio après livraison.

Les mots de passe historiques restent en clair côté DB par compatibilité avec l'écosystème ; les comptes et connexions serveur ne sont pas migrés vers Supabase Auth. Les clés de service restent privilégiées, et le contrôle du foyer dépend encore des serveurs appelants. Les écritures absolues de Mealio restent à faire évoluer vers des opérations atomiques. Pas de transfert inter-bases, synchronisation hors connexion ni prédiction d'apogée. Le référentiel global et les règles de rangement continuent d'être administrés dans Mealio.
