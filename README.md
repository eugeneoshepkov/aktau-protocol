<p align="center">
  <img src="public/favicon.svg" alt="Aktau Protocol" width="80" height="80">
</p>

<h1 align="center">Caspian Atom: The Aktau Protocol</h1>

<p align="center">
  <em>A Soviet-era nuclear city-builder where one reactor stands between 150,000 souls and the desert.</em>
</p>

<p align="center">
  <a href="https://aktau.eone.work/"><strong>Play Now</strong></a>
</p>

---

## The Story

**Mangyshlak Peninsula, 1972.**

In the middle of the Kazakh desert, Soviet engineers achieved the impossible: a city that shouldn't exist. No rivers. No rainfall. Just endless sand, the Caspian Sea, and one audacious idea—use a nuclear reactor to turn seawater into life.

The **BN-350 fast breeder reactor** wasn't just generating power. It was *desalinating* the sea, pumping fresh water to 150,000 people who had no business surviving there. For 27 years, this engineering marvel kept Aktau alive.

**Now it's your turn.**

---

## Gameplay

You are the city engineer. Balance the impossible:

| Challenge | Consequence |
|-----------|-------------|
| Reactor overheats | ☢️ **Meltdown** — Game Over |
| Fresh water depleted | 🏜️ **Drought** — Game Over |
| Heat runs out in winter | ❄️ **Frozen City** — Game Over |
| Citizens unhappy | 👥 **Exodus** — Population flees |

### The Production Chain

```
    Caspian Sea
         ↓
    [Water Pump] ──→ Seawater
         ↓
    [BN-350 Reactor] ──→ Heat + Electricity
         ↓                    ↓
    [Desalination] ←──────────┘
         ↓
    Fresh Water ──→ [Microrayon Housing] ──→ Happy Citizens
```

> **Tip:** Each building has limited capacity. One distiller can only supply 2 housing blocks. Watch the ghost preview colors when placing—green means connected, gray means no capacity available!

### Buildings

| Building | What it Does |
|----------|--------------|
| **Water Pump** | Extracts seawater from the Caspian |
| **BN-350 Reactor** | The heart of the city. Generates heat & power. *Warning: +1°C every tick!* |
| **Desalination Plant** | Converts seawater → freshwater. Also cools the reactor. |
| **Microrayon Housing** | Soviet housing blocks. Needs water connection or citizens get angry. |
| **Water Tank** | Extends water distribution network. Each tank supplies 2 more housing blocks. |
| **Thermal Plant** | Supplemental heat & power. Build more as your city grows (1 per 5 housing blocks). |

### Seasons

Winter is coming. And it wants 2× the heat.

| Season | Heat Demand |
|--------|-------------|
| Spring | Normal |
| Summer | 0.5× |
| Autumn | 1.2× |
| **Winter** | **2×** |

### Economy

Expansion has a cost:

- **Scaling costs** — Each building costs 15% more than the previous of the same type
- **Maintenance** — Pumps, distillers, and thermal plants drain 1-2⚡/tick each

You can't build infinitely. Plan carefully.

---

## Controls

| Key | Action |
|-----|--------|
| `WASD` (or `ЦФЫВ`) | Pan camera |
| `Q` / `E` (or `Й` / `У`) | Rotate camera |
| `Scroll` | Zoom |
| `1-5` | Select building |
| `Space` | Pause/Resume |
| `M` (or `Ь`) | Mute/unmute |
| `?` | Keyboard shortcuts |
| `J` (or `О`) | Historical archive |

*All shortcuts work with both English and Russian keyboard layouts.*

---

## Quick Start

```bash
bun install
bun run dev    # http://localhost:5173
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Build | Vite + TypeScript |
| Rendering | Babylon.js (WebGPU/WebGL) |
| Audio | ZzFX (procedural SFX) + HTML5 Audio |
| Assets | Kenney asset packs |

---

## Features

- Isometric 3D graphics with film grain & heat haze effects
- Dynamic pipe networks with connection preview
- Four seasons affecting resource consumption
- Population growth/decline based on happiness
- Roaming camels and tumbleweeds
- Guided mission objectives for new players
- Historical facts about the real Aktau (20 discoverable entries)
- Save/load to browser storage
- Time controls (pause, 1×, 2×, 4×)
- **Russian & English languages** (auto-detected from browser)
- Russian keyboard layout support (WASD works as ЦФЫВ)

---

## Development

```bash
bun run dev      # Development server
bun run build    # Production build
bun run preview  # Preview build
```

---

## The Real Aktau

This game is based on the true story of **Aktau, Kazakhstan** (formerly Shevchenko). The BN-350 reactor operated from 1972 to 1999, producing both electricity and fresh water for a city built in one of the most inhospitable places on Earth.

At its peak, the reactor desalinated **120,000 cubic meters of water per day**.

[Learn more on Wikipedia →](https://en.wikipedia.org/wiki/BN-350_reactor)

---

<p align="center">
  <sub>MIT License</sub>
</p>
