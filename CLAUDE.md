# Règles du projet Garde-robe

## Données des utilisateurs : à ne jamais perdre

Le site est en ligne et **des personnes l'utilisent déjà** (Enzo et un ami, chacun avec son compte et
toutes ses pièces). Toute modification doit préserver leurs pièces, photos, tenues et historique.

- **Base Supabase** : migrations **additives uniquement** (ajouter une colonne, une table, une règle).
  Jamais de `DROP`, `TRUNCATE`, `DELETE` de masse, de colonne renommée ou retirée, ni de contrainte qui
  rendrait des lignes existantes invalides. Les fichiers `*_down.sql` ne s'exécutent jamais sans accord
  explicite d'Enzo. Une migration est proposée à Enzo, il l'exécute lui-même.
- **Règles RLS** : ne pas les assouplir, ne pas les retirer ; chaque compte ne voit que ses données.
- **Stockage des photos** (bucket `photos`) : ne pas renommer, déplacer ni supprimer de fichiers existants ;
  les chemins enregistrés dans `items.front_path` / `back_path` doivent rester valides.
- **Lecture des anciennes données** : le code doit continuer à afficher les pièces déjà enregistrées
  (anciennes photos JPEG, types et couleurs déjà utilisés, champs vides). Ajouter des types ou des
  couleurs au catalogue : oui ; en retirer ou en renommer : non (une pièce existante l'utilise peut-être).
- **Hors connexion** (`js/sync.js`) : la file d'attente locale peut contenir des modifications pas encore
  envoyées. Ne pas changer son format sans migration qui relit l'ancien ; ne jamais la vider au démarrage.
- **Tests** : toujours en **mode démo** (clés Supabase vides dans une copie locale de `js/config.js`),
  jamais sur les vrais comptes. Ne jamais committer une modification de `js/config.js` faite pour un test.
- **Service worker** : changer `VERSION` met à jour les fichiers de l'app, sans toucher aux données.
