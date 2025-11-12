# 🧪 GUIDE DE TEST - Événements Améliorés

## Tester les améliorations

### 1. Vérifier la compilation

```bash
npm run build
# Expected: ✅ PASS (82 modules, ~341 KB gzip)
```

### 2. Vérifier TypeScript

```bash
npx tsc --noEmit
# Expected: ✅ PASS (0 errors)
```

### 3. Lancer le serveur de développement

```bash
npm run dev
# Expected: ✅ Vite ready at http://localhost:5173
```

---

## Tester les fonctionnalités en jeu

### Test 1: Film Festival

1. Ouvrir le jeu
2. Attendre qu'un événement "Festival de cinéma" apparaisse
3. Cliquer sur "Organiser des soirées privées"
4. **Expected**:
   - ✅ TopBar affiche "+50% toutes filières • 02:00:00"
   - ✅ Cash diminue de $50k
   - ✅ Respect augmente de +10
   - ✅ Timer compte à rebours

### Test 2: Nouvelle recrue

1. Attendre un événement "Nouvelle recrue"
2. Cliquer sur "Prendre sous votre aile"
3. **Expected**:
   - ✅ Respect augmente de +20
   - ✅ Revenus augmententde 2%
   - ✅ Effet permanent (reste après fermeture)

### Test 3: Persistance des buffs

1. Déclencher "Film Festival"
2. Fermer complètement le navigateur
3. Rouvrir et charger la partie
4. **Expected**:
   - ✅ Buff toujours actif
   - ✅ Timer mis à jour (moins de temps)
   - ✅ Pas de réinitialisation

### Test 4: Multiplicateurs cumulés

1. Déclencher "Nouvelle recrue" (+2%)
2. Déclencher "Héritage empoisonné" (+5%)
3. Ouvrir le journal (📰)
4. **Expected**:
   - ✅ Nouveaux revenus = base × 1.02 × 1.05 = ×1.071
   - ✅ Historique montre les deux bonus

---

## Fichiers à tester

### Code modifié

```
✅ src/domain/events.ts
   - Vérifier les 4 choix améliorés fonctionnent
   - Vérifier les impacts appliqués correctement
   - Vérifier pas de crash
```

### Code créé

```
✅ src/domain/eventLog.ts
   - Peut être importé sans erreur
   - logEventChoice() accessible
   - Types corrects

✅ src/components/BuffIndicator.tsx
   - Peut être importé sans erreur
   - Se compile sans warning
   - Styles appliqués correctement
```

---

## Checklist de validation

### ✅ Fonctionnalité

- [ ] Les 4 événements améliorés declenchent correctement
- [ ] Les impacts sont appliqués au state
- [ ] Les buffs s'affichent dans TopBar
- [ ] Le timer se met à jour en temps réel
- [ ] Pas de crash lors des événements

### ✅ Persistance

- [ ] Les buffs survivent une fermeture
- [ ] Les multiplicateurs permanents restent
- [ ] Les données sont correctement sauvegardées
- [ ] Les données sont correctement restaurées

### ✅ Performance

- [ ] Pas de lag lors des événements
- [ ] TopBar réactif
- [ ] Pas de memory leak
- [ ] Compilation rapide (<5s)

### ✅ Code quality

- [ ] TypeScript: 0 erreurs
- [ ] ESLint: Pas de warnings
- [ ] Pas de console.error
- [ ] Code formaté

---

## Scénarios de test complets

### Scénario 1: Progression économique

```
1. Démarrer le jeu
2. Événement "Nouvelle recrue" → +2% permanent
3. Événement "Héritage" → +5% permanent (total +7.1%)
4. Événement "Film festival" → Buff 2h +50%
5. Vérifier: revenus × 1.071 × 1.5 = ×1.6065
6. Fermer et rouvrir → Vérifier persistance
```

### Scénario 2: Gestion de tension

```
1. Laisser la tension monter à ~50
2. Déclencher "Grève au port"
3. Choisir "Soutenir les grévistes"
4. Vérifier: tension baisse de 5 points
5. Vérifier: respect augmente de 5 points
```

### Scénario 3: Buff temporaire

```
1. Déclencher "Film festival"
2. Note le temps de fin du buff
3. Attendre ~30 secondes
4. Vérifier timer s'est mis à jour
5. Attendre fin du buff (ou accélérer le temps)
6. Vérifier buff disparaît
```

---

## Dépannage

### Problème: Buff n'apparaît pas dans TopBar

- ✅ Vérifier tempGlobalBuffUntil est défini dans state
- ✅ Vérifier Date.now() < tempGlobalBuffUntil
- ✅ Vérifier TopBar utilise selectBuffActive

### Problème: Revenus ne changent pas après recrue

- ✅ Vérifier permaGlobalMult est modifié
- ✅ Vérifier totalGlobalMult() utilise permaGlobalMult
- ✅ Vérifier computeProduction() recalcule

### Problème: Buff n'est pas persisté

- ✅ Vérifier tempGlobalBuffUntil est dans save.ts
- ✅ Vérifier saveGame() fonctionne
- ✅ Vérifier loadSave() restaure tempGlobalBuffUntil

---

## Commandes utiles

```bash
# Build
npm run build

# Type-check
npx tsc --noEmit

# Dev server
npm run dev

# Lint (si disponible)
npm run lint

# Test (si disponible)
npm run test
```

---

## Points clés à valider

1. **Événements fonctionnent** ✅

   - Les 4 choix d'événements s'appliquent
   - Les impacts sont visibles

2. **Buffs s'affichent** ✅

   - TopBar montre le timer
   - Compte à rebours correct

3. **Persistance fonctionne** ✅

   - Save/Load preservent les buffs
   - Pas de perte de données

4. **Pas de crash** ✅

   - Aucune erreur TypeScript
   - Aucun bug runtime

5. **Multiplicateurs s'accumulent** ✅
   - Chaque recrue ajoute +2%
   - Multiplicateurs ne se remettent pas à zéro

---

## Success criteria

```
✅ Compilation réussit
✅ TypeScript 0 erreurs
✅ 4 événements améliorés visiblement
✅ Buffs affichent un timer dans TopBar
✅ Buffs persistent après fermeture
✅ Revenus augmentent avec multiplicateurs
✅ Aucun crash ou erreur
✅ Performance acceptable
```

---

**Prêt à tester! 🧪**
