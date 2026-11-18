# Garde-robe — V1

**App en ligne : https://enzo274207.github.io/garde-robe/**

Web app installable sur iPhone (PWA) pour digitaliser sa garde-robe et composer ses tenues.
HTML/CSS/JavaScript, **aucune installation ni build** : les fichiers s'hébergent tels quels.

## Essayer tout de suite (mode démo)

Sans configuration, l'app tourne en **mode démo** : n'importe quel e-mail/mot de passe fonctionne,
les données et les photos restent dans le navigateur de l'appareil.

Sur ton ordinateur, dans ce dossier :

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000 (un vrai serveur est nécessaire : un double-clic sur `index.html` ne marche pas à cause des modules JavaScript).

## Passer en ligne (comptes + synchro) — 10 minutes

### 1. Supabase (gratuit)
1. Crée un compte sur https://supabase.com puis **New project** (région Europe).
2. **SQL Editor > New query** : colle tout le contenu de `supabase/schema.sql`, puis **Run**.
   Ça crée les tables, la sécurité (chacun ne voit que ses données) et le stockage privé des photos.
3. **Project Settings > API** : copie la **Project URL** et la clé **anon public**.
4. Colle-les dans `js/config.js` :
   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```
   La clé *anon* est faite pour être publique : la sécurité est assurée par les règles RLS du script SQL.
   Ne mets **jamais** la clé `service_role` dans l'app.
5. (Optionnel) **Authentication > Providers > Email** : désactive *Confirm email* pour te connecter sans
   devoir cliquer sur le lien de confirmation.

### 2. Héberger (Netlify, gratuit)
1. Va sur https://app.netlify.com/drop
2. Glisse-dépose **le dossier entier** `garde-robe-app`.
3. Tu obtiens une adresse en `https://…netlify.app` (renommable dans *Site configuration*).
4. Dans Supabase > **Authentication > URL Configuration**, mets cette adresse dans *Site URL*.

(Vercel ou GitHub Pages fonctionnent aussi : ce sont de simples fichiers statiques.)

### 3. Installer sur l'iPhone
Ouvre l'adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil**.
L'app s'ouvre ensuite en plein écran comme une app normale.

## Mises à jour de la base (migrations)

À exécuter **dans l'ordre**, une seule fois, dans Supabase > SQL Editor (elles n'effacent aucune donnée) :

| Fichier | Rôle | Annulation |
|---|---|---|
| `supabase/migrations/001_securite.sql` | Vérifie les couleurs et longueurs, interdit d'utiliser la pièce d'un autre utilisateur dans une tenue, limite les photos (5 Mo, JPEG/PNG/WebP), ajoute la suppression de compte | `001_securite_down.sql` |
| `supabase/migrations/002_fiches.sql` | Catégorie Vestes, détails facultatifs (saisons, style, chaleur, formalité, matière, marque, taille, couleurs secondaires), favoris, nombre de ports | `002_fiches_down.sql` |

`supabase/schema.sql` reste le schéma de départ pour un projet neuf (puis appliquer les migrations).

## Structure

```
index.html              page unique
manifest.webmanifest    infos d'installation (nom, icônes, couleurs)
sw.js                   service worker (ouverture hors connexion)
css/app.css             styles, thèmes clair/sombre
js/config.js            clés Supabase (vide = mode démo)
js/app.js               écrans, navigation, actions
js/store.js             données : Supabase ou mode démo (même interface)
js/draw.js              dessins SVG : silhouette, visage, pièces
icons/icon.svg          icône de l'app
js/catalog.js           catégories, types, couleurs, avatar, pièces d'exemple
js/image.js             compression des photos avant envoi
supabase/schema.sql     base de données + sécurité + stockage
```

## Ce que fait la V1
- Comptes (e-mail + mot de passe), données synchronisées entre appareils.
- Accueil : silhouette habillée (couleur + coupe de chaque pièce), flèches pour changer haut / bas / chaussures.
- Suggestion de tenue : couleurs qui s'accordent + proportions (ample avec ajusté), en évitant ce qui a été porté récemment.
- Import d'une pièce : photos recto/verso (appareil photo ou galerie, compressées automatiquement), nom, catégorie, type, couleur, coupe.
- 4 écrans Hauts / Bas / Chaussures / Accessoires : filtres type, coupe, couleur, tri ; fiche avec carte qui pivote recto/verso ; modifier, supprimer, mettre sur l'avatar.
- Tenues enregistrées et historique « porté aujourd'hui ».
- Éditeur d'avatar (peau, cheveux, yeux, barbe, morphologie), mode clair/sombre.

## Prévu en V2
- Amis : partage au choix de sa garde-robe et de ses tenues (colonne `is_shared` déjà prévue).
- Calendrier pour planifier ses tenues.
- Détourage automatique des photos (suppression du fond).
