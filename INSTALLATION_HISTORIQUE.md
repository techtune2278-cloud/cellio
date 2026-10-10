# Cellio V1.1 — Caves, placards et réserves du foyer

Refonte du projet Cellio V1.0 fourni, avec les fonctions de Frosti V1.2 et la conservation du domaine, millésime, format et date de fabrication. Le paquet initial annonçait 0.1.0 : les versions sont désormais cohérentes (package 1.1.0, écran V1.1).

## Installation / mise à jour

1. Sauvegarder la base Supabase Cellio et le dossier du projet. Arrêter le serveur local.
2. Dans le SQL Editor de **Cellio**, exécuter `migrations/000_preflight.sql`. Les résultats doivent être vides. Sur l'export joint du 10 octobre, aucune incohérence n'a été trouvée.
3. Exécuter **`migrations/001_cellio_v1_1.sql` en entier**. Cette migration s'applique au schéma existant : ne pas créer une autre base, ne pas importer `tests/baseline.sql`. Elle ne modifie ni ne supprime les lots, comptes, équipements, règles ou UUID existants. Ne jamais exécuter les migrations Frosti dans Cellio.
4. Copier toutes les sources de ce ZIP sur le projet existant, en conservant `.env.local`, `.git` et la configuration Vercel. Sous Windows, exécuter `Nettoyer_Cellio_V1.1.bat` depuis le dossier du projet. Il déplace les anciens fichiers devenus inutiles dans une sauvegarde voisine ; en particulier `middleware.ts` doit disparaître, car `proxy.ts` le remplace.
5. Compléter les variables ci-dessous dans `.env.local` et dans Vercel. Les clés doivent appartenir au projet **Cellio**. Le secret de session est distinct de celui de Frosti.
6. Lancer `npm ci`, `npm run verify`, puis `npm run dev`. Avec un serveur local de production : `npm run build`, puis `npm start`.
7. Tester les stocks du foyer, ajout, modification des détails, consommation, transfert partiel/groupé, annulation, inventaire et réglages. Se reconnecter avec le compte habituel ; les anciennes sessions simples UUID ne sont plus acceptées.
8. Déployer et vérifier ces parcours dans Vercel. Vérifier dans Mealio lecture du stock, rangement, inventaire et consommation d'un lot d'essai.
9. **Après le déploiement fonctionnel**, exécuter `migrations/002_close_public_access.sql`. Les tables sont alors fermées aux rôles publics, avec RLS et révocation des droits. Les accès serveur de Cellio et Mealio avec la clé de service restent autorisés. Ne pas exécuter 002 tant que l'ancien Cellio est utilisé.
10. Après un préflight vide, exécuter `migrations/003_validate_after_cleanup.sql` pour valider les contraintes sur toutes les lignes existantes.

## Variables

| Variable | Valeur / usage |
|---|---|
| SUPABASE_URL | URL du projet Supabase Cellio |
| SUPABASE_SERVICE_ROLE_KEY | Clé serveur privilégiée Cellio, ancienne service_role ou nouvelle sb_secret, jamais anon |
| CELLIO_SESSION_SECRET | Secret aléatoire d'au moins 32 caractères, propre à Cellio |
| CRON_SECRET | Autre secret aléatoire protégeant /api/cron |
| CELLIO_PUBLIC_URL | URL publique de Cellio pour le lien des notifications |
| CELLIO_ENABLE_ARCHIVE | false par défaut ; activer seulement après adaptation de Mealio |

Copier `.env.example` comme modèle. Générer séparément chaque secret avec `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Dans Vercel, cocher Secret pour les clés et secrets, sélectionner les environnements voulus et redéployer après modification. Aucun secret privilégié ne doit commencer par NEXT_PUBLIC_.

## Utilisation

- **Stocks** est l'accueil, avec recherche sans accents sur produit, notes, domaine, millésime et format. Filtrer par équipement, catégorie, date d'entrée ou date de suivi ; trier par nom, date ou urgence. Inventaire et Historique sont accessibles depuis les stocks/réglages. Navigation principale en bas sur mobile.
- **Ajouter un produit** reste accessible dans le pied de l'écran. Produit et catégorie acceptent les textes libres ; les modèles et articles existants fournissent des suggestions. Les textes libres n'ajoutent pas automatiquement des lignes au référentiel global, mais restent disponibles dans le foyer.
- **Domaine et millésime** s'ouvrent pour les vins. Les champs restent accessibles pour toute catégorie, quel que soit le type d'équipement : changer un lieu ne doit pas effacer les détails d'un vin. Dans Plus de détails : date de fabrication exacte, format du contenant, date d'entrée et notes. Une date de fabrication vide reste vide.
- **Date de suivi** conserve le champ `date_peremption` utilisé par Mealio. Pour les vins, elle est présentée comme une apogée souhaitée ; elle ne signifie pas qu'une bouteille doit être jetée après cette date. Les dates indicatives calculées sont explicitement identifiées.
- **Utiliser** ou **Retirer** accepte une quantité décimale. Un lot épuisé quitte le stock, mais son mouvement reste dans l'historique. **Modifier** refuse un enregistrement si la version du lot a changé ailleurs.
- **Transférer des produits** déplace de 1 à 100 lots dans une transaction, avec quantités ajustables et contrôle des versions. Un lot identique dans la cible reçoit la quantité, au lieu de créer un doublon. Deux millésimes, domaines, formats ou dates de fabrication différents restent distincts. Les autres critères sont produit, catégorie, unité, dates, type de date et notes.
- **Regrouper avec un lot identique** corrige les doublons déjà présents dans un même équipement. La migration ne regroupe rien automatiquement.
- **Historique** journalise aussi les écritures directes de Mealio après migration. Annuler une opération restaure tous ses lots, tant qu'ils n'ont pas changé depuis ; les transferts groupés s'annulent en groupe. Un équipement supprimé peut empêcher une ancienne annulation.
- **Équipements** : bouton Ajouter au-dessus de la liste et formulaire en bas ; cave = `is_secondary=false`, réserve/placard/meuble = `true`. Renommer et supprimer avec confirmation. La suppression refuse les équipements contenant encore un lot, même de quantité zéro, ou visés par une règle Mealio. Transférer le contenu et réaffecter les règles avant suppression.
- **Notifications** : créer et enregistrer un nom Ntfy aléatoire, s'abonner à ce même canal sur chaque téléphone, puis tester. Le canal n'est pas réservé privé sur ntfy.sh : son nom doit rester difficile à deviner. L'envoi quotidien est planifié par Vercel ; il ne démarre pas seul en local.
- **Dates et délais** : anticipation de 30 jours par défaut, réglable de 0 à 90 ; délais par catégorie et type de lieu. Sans date, le rappel commence au délai **exact**, et non à 80 % comme avant. Les valeurs configurées du foyer sont conservées. À défaut de règle : vins 730 jours, champagnes 365, apéritifs/confitures/compotes/gelées 180, autres 90. Ce sont les rappels de suivi historiques, pas des prescriptions de conservation. La date par défaut est facultative et calculée depuis la date d'entrée ; les réglages ne réécrivent pas les lots existants.

## Vérifications et limites

`npm run verify` exécute les tests PostgreSQL embarqués (PGlite), TypeScript, ESLint et build. `node scripts/check-ui.mjs` exécute la recette Chromium avec des API simulées (installer Chromium avec `npx playwright install chromium --only-shell`). Les tests ne nécessitent aucune clé réelle et n'envoient pas de notifications.

Les opérations Cellio sont atomiques et rejouables avec le même identifiant. Une saisie conservée après erreur réutilise cet identifiant ; fermer/recharger le formulaire le perd. Le journal permet l'annulation mais ne remplace pas une sauvegarde Supabase. Aucun historique antérieur à la migration n'est inventé.

La clôture publique 002 est indispensable à la protection des tables existantes. Les mots de passe historiques restent inchangés en base pour préserver la connexion familiale et les autres applications ; ils ne sont plus lus par le navigateur. Leur hachage devra être coordonné avec les lecteurs externes.

Les UPDATE absolus de Mealio restent susceptibles d'écraser une modification concurrente : les garanties des RPC ne s'appliquent pas automatiquement à ses anciennes requêtes. Voir CONTRAT_MEALIO.md. Aucun transfert entre Frosti et Cellio n'est ajouté ; seuls les transferts internes à Cellio sont couverts.

Le service worker purge aussi l'ancien cache nommé frosti-cache-v1 de Cellio. Aucune page privée ni réponse Supabase n'est stockée pour démarrage hors connexion. Un écran déjà chargé peut rester lisible, mais les écritures exigent le réseau.

Le cron réserve une notification par foyer/jour pour éviter les doublons. Un envoi échoué ou interrompu ne se rejoue pas automatiquement le même jour ; le bouton de test reste disponible et le journal cellio_notification_runs permet le diagnostic.
