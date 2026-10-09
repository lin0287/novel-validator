# Sample story data

`sample-story.json` is a hand-written test fixture for the continuity engine.
It uses a four-month calendar (Frost / Thaw / Bloom / Harvest, 30 days each, standard 24 h days).
All world times are minutes since the world epoch (Year 0, 1 Frost, 00:00).

## Characters

| ID | Name |
|----|------|
| `char-lyra` | Lyra Ashfen |
| `char-daron` | Daron Velt |
| `char-cress` | Cress of Omel |

## Locations and routes

```
Ashvale ──480/180──► Ridgepath Pass ──480/180──► Ironport
   │                                                  │
 2880/1440/720 (ship)                           1440/720/360 (ship)
   │                                                  │
   └──────────────── Omel ◄────────────────────────-──┘
```

Foot / horse travel times (minutes):

| Leg | Foot | Horse | Ship |
|-----|------|-------|------|
| Ashvale ↔ Ridgepath Pass | 480 | 180 | — |
| Ridgepath Pass ↔ Ironport | 480 | 180 | — |
| Ashvale ↔ Omel | 2880 | 1440 | 720 |
| Ironport ↔ Omel | 1440 | 720 | 360 |

Ashvale → Ironport via Ridgepath on foot = 480 + 480 = **960 min**.
Ironport → Ashvale on the fastest available route (via Ridgepath, horse) = **360 min**.

## Scenes overview

| Scene | World time (key moments) | Characters | Notes |
|-------|--------------------------|------------|-------|
| sc-01 The market at dawn | Y3 M1 D1 08:00–10:00 (518880–519000) | Lyra, Daron | Normal |
| sc-02 Cress arrives by ship | Y3 M1 D1 12:00–14:00 (519120–519240) | Lyra, Cress | Normal |
| sc-03 Daron departs for Ridgepath | Y3 M1 D1 16:00–18:00 (519360–519480) | Daron | Daron departs; DEPARTED event |
| sc-04 Ambush at Ridgepath | Y3 M1 D2 02:00–04:00 (519960–520080) | Daron, Cress | Cress killed; DEATH event |
| sc-05 Daron reaches Ironport | Y3 M1 D2 08:00 (520440) | Daron | Normal (travel time fits: 480 + 480 min foot) |
| sc-06 Lyra sends a message | Y3 M1 D2 08:00–08:00 (520320–520440) | Lyra | Normal |
| sc-07 The dockmaster's ledger | Y3 M1 D2 10:00 (520560) | Daron | Normal |
| **sc-08 MISTAKE 1** | Y3 M1 D2 08:00 (520440) | Lyra | **Double presence** |
| **sc-09 MISTAKE 2** | Y3 M1 D2 10:00 (520560) | Daron | **Impossible travel** |
| **sc-10 MISTAKE 3** | Y3 M1 D4 08:00 (523200) | Cress | **Dead character** |

## Planted continuity mistakes

### Mistake 1 — Double presence (sc-08)

- **Rule:** Double presence
- **What the data says:** Lyra is in Ashvale at world time 520440 (sc-06, mom-06-b) and simultaneously in Omel at the same world time 520440 (sc-08, mom-08-a).
- **Why it's wrong:** A character cannot occupy two locations at once.

### Mistake 2 — Impossible travel (sc-09)

- **Rule:** Impossible travel
- **What the data says:** Daron is in Ironport at world time 520440 (sc-05, mom-05-a), then in Ashvale at world time 520560 (sc-09, mom-09-a).
- **Gap:** 520560 − 520440 = **120 minutes**.
- **Shortest route:** Ironport → Ridgepath Pass → Ashvale on horseback = 180 + 180 = **360 minutes**. Even the fastest ship via Omel is longer.
- **Why it's wrong:** 120 min is less than the 360 min minimum travel time between those two locations.

### Mistake 3 — Dead character reappears (sc-10)

- **Rule:** Dead or gone
- **What the data says:** Cress receives a DEATH event at world time 520080 (sc-04, mom-04-b). Cress then appears at world time 523200 in Omel (sc-10, mom-10-a).
- **Why it's wrong:** A character with a DEATH event cannot have later appearances (sc-10 is not flagged `flashback` or `dream`).
