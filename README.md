# Caspian Atom: The Aktau Protocol

A browser-based isometric city-builder game where you manage a Soviet-era nuclear-powered desalination city in the Kazakh desert.

## 🎮 About

Set in 1958-1991 on the Mangyshlak Peninsula, you control the legendary city of Aktau—where the BN-350 fast breeder reactor sustained 150,000 people by converting Caspian seawater into drinking water.

**Your Mission:** Survive as long as possible by balancing nuclear power, water extraction, and district heating without causing a meltdown, drought, or freezing your population.

## 🚀 Quick Start

```bash
bun install
bun run dev    # Open http://localhost:5173
```

## 🎯 Gameplay

Manage six critical resources:
- **Seawater** from the Caspian Sea
- **Fresh Water** for your citizens
- **Heat** for district heating
- **Electricity** to power buildings
- **Population** happiness and growth
- **Reactor Temperature** (don't let it hit 100°C!)

Build and connect five types of structures:
- **Water Pumps** extract seawater
- **BN-350 Reactors** generate heat and power
- **Desalination Plants** convert seawater to freshwater and cool reactors
- **Microrayon Housing** for your population
- **Water Tanks** for storage

Watch out for:
- ☢️ **Nuclear Meltdown** (reactor ≥100°C)
- 🏜️ **Drought** (water runs out)
- ❄️ **Freezing** (heat runs out in winter)
- 💀 **Extinction** (population reaches zero)

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Pan camera |
| **Q/E** | Rotate camera |
| **Scroll** | Zoom |
| **1-5** | Building hotkeys |
| **Esc** | Cancel placement |

## 🌍 Features

- Isometric 3D graphics with Babylon.js
- Four seasons affecting heat demand
- Auto-connecting pipe networks
- Dynamic population growth
- Procedural sound effects
- Save/load support
- Time controls (pause, 1×, 2×, 4×)

## 🛠️ Built With

- **Bun** + **Vite** + **TypeScript**
- **Babylon.js** for 3D rendering
- **Kenney Asset Packs** for models
- **ZzFX** for procedural audio

## 📜 License

MIT

---

*Based on the real Soviet city of Aktau and the BN-350 reactor that powered it from 1972-1999.*
