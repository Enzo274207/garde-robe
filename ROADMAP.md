# Feuille de route — Garde-robe

Plan validé par Enzo, d'après le brief « Évolution complète de Garde-robe ».

| Étape | Contenu | État |
|---|---|---|
| 1 | Fiabilité et sécurité (erreurs claires, confirmations, isolation entre comptes, migration 001) | ✅ fait |
| 2 | Fiches enrichies (vestes, saisons, style, matière, chaleur, formalité, marque, taille, favoris, nombre de ports, migration 002) | ✅ fait |
| 3 | Mode hors connexion (copie locale, file d'envoi, conflits sans écrasement, service worker, migration 003) | ✅ fait |
| **4** | **Refonte de l'interface style streetwear** : navigation en bas de l'écran (onglets), accueil repensé, choix de la veste depuis l'accueil | ⏳ **prochaine** |
| 5 | Styliste / suggestions avancées (règles locales, pas d'IA externe pour l'instant) | ⏳ |
| — | Icône PNG pour l'écran d'accueil iPhone (apple-touch-icon) | ⏳ |
| plus tard | Amis et partage, calendrier des tenues, détourage des photos | idées |

## Règles à respecter (toutes les étapes)
- Ne jamais perdre de données ni casser les comptes. Migrations réversibles et non destructives.
- HTML/CSS/JS natifs, Supabase, GitHub Pages, sans framework ni build.
- Ne jamais exposer la clé `service_role`.
- Chaque bouton fait une vraie action.
- Ne jamais déclarer réussi un test qui n'a pas été lancé.
- Pas de synchronisation en arrière-plan promise sur iOS.
- Réponses courtes, QCM à cocher pour les questions.
