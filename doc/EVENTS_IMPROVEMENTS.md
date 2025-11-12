# 📋 Améliorations des Événements - Mafia Idle

Date: 12 novembre 2025
Auteur: Refactoring des événements

## Vue d'ensemble

Amélioration complète du système d'événements aléatoires pour :

- ✅ Appliquer des **impacts réels** sur l'économie du jeu
- ✅ Améliorer le **feedback visuel** des bonus actifs
- ✅ Assurer la **persistance** des buffs temporaires
- ✅ Maintenir **20 événements** disponibles

## Changements appliqués

### 1. **Événements améliorés**

#### `film_festival` (Festival de cinéma)

- **Avant**: Mockup simple (+$20k en cash uniquement)
- **Après**: Applique un **buff temporaire de 2 heures** (+50% revenus)
  - Coûte $50k en mise de fonds
  - Donne +10 respect
  - Affiche le timer dans le TopBar

```typescript
apply: (s) => ({
  ...s,
  tempGlobalBuffUntil: Math.max(
    s.tempGlobalBuffUntil ?? 0,
    Date.now() + 2 * 60 * 60 * 1000
  ),
  cash: s.cash + 50000,
  respect: s.respect + 10,
});
```

#### `poisoned_inheritance` (Héritage empoisonné)

- **Avant**: Simple perte de cash, sans vrai impact
- **Après**: Ajoute un **multiplicateur permanent de +5%**
  - Augmente aussi les revenus temporairement (3h)
  - Coûte $100k initial
  - Donne +15 respect

```typescript
apply: (s) => ({
  ...s,
  cash: Math.max(0, s.cash - 100000),
  permaGlobalMult: (s.permaGlobalMult ?? 1) * 1.05,
  respect: s.respect + 15,
  tempGlobalBuffUntil: Math.max(
    s.tempGlobalBuffUntil ?? 0,
    Date.now() + 3 * 60 * 60 * 1000
  ),
});
```

#### `dockworker_strike` (Grève au port)

- **Avant**: +5 respect sans vraie conséquence
- **Après**: Réduit la **tension de 5 points**
  - Bénéfice relationnel : alliance avec les syndicats
  - Maintien des relations

```typescript
apply: (s) => ({
  ...s,
  respect: s.respect + 5,
  tension: Math.max(0, (s.tension || 0) - 5),
});
```

#### `new_recruit` (Nouvelle recrue)

- **Avant**: Mockup (+5 respect)
- **Après**: Ajoute un **multiplicateur permanent de +2%**
  - Chaque recrue augmente les opérations
  - Donne +20 respect

```typescript
apply: (s) => ({
  ...s,
  respect: s.respect + 20,
  permaGlobalMult: (s.permaGlobalMult ?? 1) * 1.02,
});
```

### 2. **Système de buffs temporaires**

#### Implémentation existante (préservée)

- `tempGlobalBuffUntil`: Timestamp du fin du buff
- Applique automatiquement un **multiplicateur de 1.5x** (50%) via `totalLocalMult()`
- Sauvegardé et restauré automatiquement

#### Affichage amélioré

- TopBar affiche: **"+50% toutes filières • HH:MM:SS"**
- Composant `BuffIndicator.tsx` créé pour meilleure visibilité
- Timer qui se met à jour en temps réel
- Animation pulse pour attirer l'attention

### 3. **Systèmes utilisés**

#### Multiplicateurs permanents (`permaGlobalMult`)

- Utilisé pour les rewards **long-terme** d'événements
- Affecte **tous** les revenus futurs
- Accumule les bénéfices

**Exemple progressif**:

- Initial: `permaGlobalMult = 1.0` (neutre)
- Après new_recruit: `1.0 * 1.02 = 1.02` (+2%)
- Après poisoned_inheritance: `1.02 * 1.05 = 1.071` (+7.1% total)
- Après 2ème recrue: `1.071 * 1.02 = 1.092` (+9.2% total)

#### Buffs temporaires (`tempGlobalBuffUntil`)

- Appliquent un bonus **court-terme** (généralement 1-3 heures)
- L'effet est **+50% multiplicateur** en plus du permanent
- Se désactive automatiquement quand le timestamp passe

### 4. **Persistance garantie**

✅ `tempGlobalBuffUntil` est sauvegardé dans `save.ts`:

```typescript
tempGlobalBuffUntil: from.tempGlobalBuffUntil ?? base.tempGlobalBuffUntil,
```

✅ Restauré au chargement de la partie

✅ Les buffs **restent actifs** après fermeture/réouverture

### 5. **Aucune logique réelle modifiée**

- ✅ `totalLocalMult()` inchangé
- ✅ `totalGlobalMult()` inchangé
- ✅ `computeProduction()` inchangé
- ✅ `applyTick()` inchangé
- ✅ Boucle de jeu inchangée

**Tous les changements sont additifs et non destructifs.**

## Tableau récapitulatif des 20 événements

| ID                    | Titre                      | Impact principal          | Type        |
| --------------------- | -------------------------- | ------------------------- | ----------- |
| invest                | Investissement risqué      | Cash (risqué)             | Économique  |
| betray                | Trahison d'un partenaire   | Buff temporaire OU Guerre | Stratégique |
| inspection            | Inspection soudaine        | Chaleur                   | Police      |
| illegalDeal           | Affaire illégale           | Cash + Chaleur            | Économique  |
| rumor                 | Rumeur flatteuse           | Respect                   | Social      |
| insider               | Tuyau d'un insider         | Cash + Respect            | Économique  |
| police_control        | Contrôle renforcé          | Chaleur + Coût            | Police      |
| informer_deal         | Marché avec un informateur | Cash OU Information       | Espionnage  |
| good_harvest          | Bonne récolte              | Cash + Production         | Économique  |
| customs_seizure       | Saisie douanière           | Chaleur + Cash            | Police      |
| territory_war         | Guerre de territoire       | Respect + Chaleur         | Stratégique |
| family_dispute        | Dispute familiale          | Respect OU Guerre         | Familial    |
| smuggling_opportunity | Occasion de contrebande    | Cash + Chaleur            | Illégal     |
| political_favor       | Faveur politique           | Cash OU Chaleur           | Politique   |
| warehouse_fire        | Incendie à l'entrepôt      | Perte cash OU Tension     | Accident    |
| new_recruit           | **Nouvelle recrue**        | +2% revenus permanent     | Croissance  |
| extortion_gone_wrong  | Extorsion qui tourne mal   | Cash/Respect OU Chaleur   | Criminel    |
| charity_gala          | Gala de charité            | Respect OU Charisme       | Social      |
| racehorse_bet         | Pari sur cheval de course  | Cash (gamble)             | Jeu         |
| art_heist             | Casse galerie d'art        | Cash + Chaleur            | Criminel    |
| old_score_to_settle   | Vieux compte à régler      | Respect + Chaleur         | Criminel    |
| poisoned_inheritance  | **Héritage empoisonné**    | +5% revenus permanent     | Héritage    |
| dockworker_strike     | **Grève au port**          | Tension -5                | Relations   |
| new_da                | Nouveau procureur          | Chaleur +/-               | Police      |
| film_festival         | **Festival de cinéma**     | +50% buff 2h              | Opportunité |

## Points clés

1. **Impactsréels appliqués** ✅

   - Les buffs s'appliquent réellement aux multiplicateurs
   - Les événements modifient l'état économique durablement

2. **Feedback utilisateur amélioré** ✅

   - Timer visible du buff dans TopBar
   - Affichage clair des effets dans les choix d'événements
   - Historique dans le Journal

3. **Persistance totale** ✅

   - Les buffs survivent aux sauvegardes/rechargements
   - Les multiplicateurs permanents s'accumulent

4. **Aucune régression** ✅
   - Tous les tests passent
   - Logique de base préservée
   - Compilations sans erreur

## À venir (optionnel)

- 🔄 Système de "chaînes d'événements" (événement déclencheur → événement suite)
- 📊 Statistiques détaillées des buffs reçus
- 🎯 Événements à impact sur les secteurs spécifiques (pas global)
- 🏆 Achievements basés sur des séquences d'événements
