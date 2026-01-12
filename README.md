# Caspian Atom: The Aktau Protocol

A browser-based isometric city-builder where you manage a Soviet-era nuclear-powered desalination city in the Kazakh desert.

**[Play Now](https://aktau.eone.work/)**

## About

Set in 1958–1991 on the Mangyshlak Peninsula, you control the legendary city of Aktau—where the [BN-350 fast breeder reactor](https://en.wikipedia.org/wiki/BN-350_reactor) sustained 150,000 people by converting Caspian seawater into drinking water.

**Your Mission:** Survive as long as possible by balancing nuclear power, water extraction, and district heating without causing a meltdown, drought, or freezing your population.

## Quick Start

```bash
bun install
bun run dev    # Open http://localhost:5173
```

## Gameplay

### Resources
- **Seawater** — extracted from the Caspian Sea
- **Fresh Water** — desalinated water for citizens
- **Heat** — district heating (demand doubles in winter!)
- **Electricity** — powers all buildings
- **Population** — grows when happy, flees when not
- **Happiness** — keep citizens connected to water!

### Buildings

| Building | Function |
|----------|----------|
| **Water Pump** | Extracts seawater from Caspian |
| **BN-350 Reactor** | Generates heat + power, but heats up! |
| **Desalination Plant** | Converts seawater → freshwater, cools reactor |
| **Microrayon Housing** | Houses population, needs water connection |
| **Water Tank** | Stores freshwater reserves |

### Connections Matter!

Buildings must be connected via pipes (within 5 tiles) to function:
- **Distillers** need both a pump AND reactor connection
- **Housing** needs a distiller or tank connection — disconnected housing makes citizens unhappy (-2/tick)!

### Fail States
- **Nuclear Meltdown** — reactor reaches 100°C
- **Drought** — freshwater runs out
- **Frozen City** — heat runs out in winter
- **Extinction** — population reaches zero

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Pan camera |
| **Q/E** | Rotate camera |
| **Scroll** | Zoom in/out |
| **1-5** | Building hotkeys |
| **Esc** | Cancel placement |
| **Shift+Drag** | Pan camera (mouse) |

## Features

- Isometric 3D graphics with Babylon.js
- Four seasons affecting heat demand (2× in winter!)
- Auto-connecting pipe networks with visual preview
- Dynamic population growth/decline
- Roaming camels and tumbleweeds
- Procedural sound effects (ZzFX)
- Background music
- Save/load to browser storage
- Time controls (pause, 1×, 2×, 4×)
- Film grain and heat haze effects

## Tech Stack

- **Runtime:** Bun
- **Build:** Vite + TypeScript
- **Rendering:** Babylon.js (WebGPU/WebGL)
- **Audio:** ZzFX (SFX) + HTML5 Audio (music)
- **Assets:** Kenney asset packs (Suburban, Industrial, Roads, Roguelike)

## Development

```bash
bun run dev      # Development server
bun run build    # Production build
bun run preview  # Preview production build
```

## License

MIT

---

*Based on the real Soviet city of Aktau and the BN-350 reactor that powered it from 1972-1999.*
