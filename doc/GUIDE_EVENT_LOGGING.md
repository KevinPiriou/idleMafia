# 🛠️ Guide d'utilisation - Enregistrement des impacts d'événements

## Comment utiliser `logEventChoice()` pour améliorer le feedback

### Localisation

📁 `src/domain/eventLog.ts`

### Signature

```typescript
export function logEventChoice(
  _state: SaveState,
  _eventId: string,
  eventTitle: string,
  choiceLabel: string,
  before: SaveState,
  after: SaveState
): SaveState;
```

### Paramètres

- `eventTitle`: Le titre de l'événement (ex: "Festival de cinéma")
- `choiceLabel`: Le label du choix sélectionné (ex: "Organiser des soirées privées")
- `before`: L'état du jeu **avant** d'appliquer le choix
- `after`: L'état du jeu **après** d'appliquer le choix

### Retour

- `SaveState` enrichi avec une entrée dans le journal (`eventLog`)

---

## Exemple d'utilisation dans MafiaIdleGame.tsx

Lors de l'application d'un choix d'événement, utiliser `logEventChoice` pour enregistrer:

```typescript
// Dans le handler d'événement
const applyChoice = (eventId: string, choiceIndex: number) => {
  setState((prev) => {
    const event = EVENTS.find((e) => e.id === eventId);
    if (!event) return prev;

    const choice = event.choices[choiceIndex];
    if (!choice) return prev;

    // Appliquer le choix
    const nextState = choice.apply(prev);

    // 📝 Enregistrer l'impact dans le journal
    const logged = logEventChoice(
      prev,
      eventId,
      event.title,
      choice.label,
      prev,
      nextState
    );

    return logged;
  });
};
```

---

## Informations enregistrées automatiquement

### 1. Deltas (changements)

```typescript
deltas: {
  cash?: number;      // Changement de trésor
  respect?: number;   // Changement de respect
  heat?: number;      // Changement de chaleur
  tension?: number;   // Changement de tension
}
```

### 2. Tags (catégories)

Ajoutés automatiquement selon les impacts:

- `cash-gain` / `cash-loss`
- `respect-gain` / `respect-loss`
- `heat-gain` / `heat-loss`
- `tension-gain` / `tension-loss`
- `buff-activated` (nouveau buff temporaire)
- `buff-extended` (buff prolongé)
- `multiplier-boost` (multiplicateur augmenté)
- `multiplier-loss` (multiplicateur diminué)

### 3. Détails structurés

Générés automatiquement avec:

- Valeurs précises des changements
- Emojis pour lisibilité
- Pourcentages pour les multiplicateurs
- Durées pour les buffs temporaires

---

## Exemple d'entrée journal générée

### Avant (`logEventChoice`)

```json
{
  "kind": "event",
  "title": "Festival de cinéma",
  "summary": "Organiser des soirées privées",
  "tags": ["buff-activated"]
}
```

### Après (`logEventChoice`)

```json
{
  "kind": "event",
  "title": "Festival de cinéma",
  "summary": "Organiser des soirées privées",
  "tags": ["cash-loss", "respect-gain", "buff-activated"],
  "details": [
    "Trésor: -$50,000",
    "Respect: +10 (👑 150/1000)",
    "🚀 Buff temporaire activé (+50% revenus pendant 2h 0m)"
  ],
  "deltas": {
    "cash": -50000,
    "respect": 10
  }
}
```

---

## Utilisation dans l'EventJournal

Les entrées enregistrées s'affichent automatiquement dans `EventJournal.tsx` avec:

✅ **Filtre par kind** ("event" sélectionné par défaut)  
✅ **Filtre par tags** (voir tous les gains de respect, etc.)  
✅ **Historique chronologique** (les plus récents d'abord)  
✅ **Détails expandables** (cliquer pour voir les calculs)

---

## Quand l'utiliser

✅ **À utiliser** pour:

- Événements aléatoires avec impacts significatifs
- Choix stratégiques du joueur
- Résolutions de quest/mission
- Application de buffs/débuffs

❌ **À NE PAS utiliser** pour:

- Actions UI simples (ouvrir un modal)
- Animations ou changements visuels
- Événements système triviales (FPS, latency)

---

## Avantages

1. **Traçabilité complète** des impacts d'événements
2. **Feedback joueur** amélioré (voir conséquences immédiatement)
3. **Analytics** pour balancer le jeu (quels événements impactent le plus?)
4. **Débuggage facile** (historique des changements d'état)
5. **Aucune modification** à la logique existing

---

## Exemple réel: Grève au port

```typescript
// Avant (mockup simple)
{
  apply: (s) => ({
    ...s,
    respect: s.respect + 5,
  }),
  meta: { info: "Vous gagnez le soutien du syndicat." },
}

// Après (avec logging)
{
  apply: (s) => ({
    ...s,
    respect: s.respect + 5,
    tension: Math.max(0, (s.tension || 0) - 5),
  }),
  meta: { info: "Vous gagnez le soutien du syndicat et réduisez la tension." },
}

// Dans MafiaIdleGame.tsx
const nextState = choice.apply(prev);
const logged = logEventChoice(
  prev,
  "dockworker_strike",
  "Grève au port",
  "Soutenir les grévistes",
  prev,
  nextState
);

// Journal enregistre:
{
  kind: "event",
  title: "Grève au port",
  summary: "Soutenir les grévistes",
  tags: ["respect-gain", "tension-loss"],
  details: [
    "Respect: +5 (👑 175/1000)",
    "Tension police: -5 (⚡ 15/100)"
  ],
  deltas: {
    respect: 5,
    tension: -5
  }
}
```

---

## Notes techniques

- ⚠️ Les tags et détails sont **générés automatiquement**
- ⚠️ Les calculs sont **basés sur les deltas** (après - avant)
- ⚠️ Les données sont **immuables** (pas de side-effects)
- ⚠️ Compatible avec **React** (pas de re-renders supplémentaires)

---

## API Future (optionnel)

On pourrait ajouter:

```typescript
// Logging de débuffs
logEventPenalty(eventTitle, choiceLabel, before, after);

// Logging de quêtes
logQuestCompletion(questId, questTitle, rewards);

// Logging de chaînes
logEventChain(fromEventId, toEventId, condition);
```

---

**Vous êtes prêt à utiliser le système d'enregistrement amélioré! 🎉**
