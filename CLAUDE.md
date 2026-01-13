# Caspian Atom - The Aktau Protocol

## Project Overview

A browser-based isometric city-builder/survival game set in Aktau, Kazakhstan (Soviet era). The player manages a nuclear-powered desalination city in the desert, balancing water extraction, nuclear power, and district heating.

**Setting:** 1958-1991 Mangyshlak Peninsula, where the BN-350 fast breeder reactor sustained 150,000 people by converting Caspian seawater into drinking water.

**Goal:** Survive as long as possible by managing the delicate balance of resources without causing a nuclear meltdown, drought, or freezing the population.

**Live:** https://aktau.eone.work/

## Tech Stack

- **Runtime:** Bun
- **Build:** Vite + TypeScript
- **Rendering:** Babylon.js (WebGPU/WebGL) + @babylonjs/materials (WaterMaterial)
- **Audio:** ZzFX (procedural SFX) + HTML5 Audio (background music)
- **State:** Custom event-driven GameState singleton
- **Assets:** 3D models from Kenney asset packs (Suburban, Industrial, Roads)

## Running the Game

```bash
bun install
bun run dev    # Development server at http://localhost:5173
bun run build  # Production build
```

---

## Game Mechanics

### Resources

| Resource | Description | Starting Value |
|----------|-------------|----------------|
| Seawater | Raw water from Caspian Sea | 100 |
| Fresh Water | Desalinated drinking water | 50 |
| Heat | Thermal energy for heating | 50 |
| Electricity | Power for buildings | 200 |
| Population | City inhabitants | 100 |
| Happiness | Citizen satisfaction | 50 |

### Buildings

| Building | Placement | Cost | Consumes/tick | Produces/tick | Special |
|----------|-----------|------|---------------|---------------|---------|
| **Water Pump** | Sea tiles | ⚡20 | ⚡5 | 🌊10 seawater | Extracts from Caspian |
| **BN-350 Reactor** | Rock tiles | ⚡50 | — | 🔥50 heat, ⚡20 | +1°C/tick to reactor temp |
| **Desalination Plant** | Sand/Rock | ⚡30 | 🌊10, 🔥10 | 💧10 freshwater | Cools reactor by 0.8°C/tick |
| **Microrayon Housing** | Sand tiles | 💧20, 🔥10 | 💧5, 🔥5× season | 😊±1-2 happiness | Soviet housing blocks |
| **Water Tank** | Sand/Rock | ⚡15 | — | — | Stores up to 50 freshwater |

### Tile Types

| Type | Color | Description |
|------|-------|-------------|
| Sea | Teal `#2F8D8D` | First 10 rows, pumps only |
| Sand | Beige `#E6D5AC` | Main building area |
| Rock | Gray `#555555` | Scattered, reactors & distillers |

### Seasons

Seasons cycle every 30 days and affect heat consumption:

| Season | Heat Multiplier | Effect |
|--------|-----------------|--------|
| Spring | ×1.0 | Normal |
| Summer | ×0.5 | Half heat needed |
| Autumn | ×1.2 | 20% more heat |
| Winter | ×2.0 | Double heat needed |

### Reactor Temperature

- Each reactor adds **+1°C per tick**
- Each distiller provides **-0.8°C cooling per tick**
- Net change = `reactors - (distillers × 0.8)`
- **Warning** at 80°C (visual + sound alert)
- **Meltdown** at 100°C (game over)

### Population Dynamics

Population grows/declines based on conditions (requires at least one Microrayon):

| Condition | Effect |
|-----------|--------|
| Happiness > 60, Water > 20, Heat > 20 | +2% population growth |
| Happiness < 30 OR Water < 10 OR Heat < 10 | -5% population decline |

### Fail States

| Condition | Result |
|-----------|--------|
| Reactor Temp ≥ 100°C | ☢️ NUCLEAR MELTDOWN |
| Fresh Water < 0 | 🏜️ CITY DROUGHT |
| Heat < 0 (with population) | ❄️ CITY FROZEN |
| Population = 0 (with housing) | 💀 POPULATION EXTINCT |

### Pipe Connections

Buildings auto-connect with visual pipes when within 5 tiles:
- **Pump → Distiller/Water Tank:** Blue water pipe
- **Reactor → Distiller:** Orange heat pipe
- **Distiller → Microrayon/Water Tank:** Blue water pipe
- **Water Tank → Microrayon:** Blue water pipe

### Connection Requirements

Buildings must be connected to function properly:

| Building | Required Connections | Effect if Disconnected |
|----------|---------------------|------------------------|
| **Distiller** | Pump (water) + Reactor (heat) | No freshwater production, no reactor cooling |
| **Microrayon** | Distiller or Water Tank (water) | -2 happiness/tick instead of +1 |

**Important:** Happiness is clamped to 0-100. Disconnected housing actively hurts your city!

### Building Placement Preview

When a building is selected for placement:
- **Yellow highlight:** Valid placement location
- **Red highlight:** Invalid placement (wrong tile type, occupied, etc.)
- **Dashed preview pipes:** Show potential connections to nearby compatible buildings
  - Blue dashed lines for water connections
  - Orange dashed lines for heat connections
  - Shows both outgoing connections (what this building connects TO) and incoming connections (what CAN connect to this building)

---

## Controls

| Input | Action |
|-------|--------|
| **WASD** | Pan camera (isometric axes) |
| **Q/E** | Rotate camera |
| **Scroll** | Zoom in/out |
| **Shift+Drag** | Pan camera (mouse) |
| **Drag** | Rotate camera |
| **1-5** | Building hotkeys |
| **Esc** | Cancel building placement |
| **Click** | Place building / Select |

---

## Audio System

### Sound Effects (ZzFX)
- Independent volume, always audible
- Procedurally generated sounds for: build, pump, geiger, reactor, distiller, microrayon, water_tank, click, error, success, warning, gameover
- Geiger clicks play when hovering over reactors

### Music
- Background music tracks in `/audio/background/`
- Intro screen music: `/audio/title.mp3`
- Controlled by volume slider in HUD
- Mute toggle affects music only

---

## Asset Management

Assets configured in `public/assets/manifest.json`:

```json
{
  "version": "2.1.0",
  "useModels": true,
  "basePaths": {
    "suburban": "/models/suburban/Models/GLB format/",
    "industrial": "/models/industrial/Models/GLB format/",
    "roads": "/models/roads/Models/GLB format/"
  },
  "buildings": { ... },
  "decorations": { ... },
  "roads": { ... }
}
```

### Model Sources
- **Suburban:** Kenney City Kit (Suburban) - housing, trees, decorations
- **Industrial:** Kenney Retro Urban Kit - pumps, reactors, tanks
- **Roads:** Kenney Roads Kit - procedural road decorations
- **2D Terrain:** Kenney Roguelike spritesheet - sand/rock tile textures

### Decorations
Randomly placed on sand tiles at game start:
- Trees (large/small)
- Fences
- Planters
- Roads (straight, bends, crossroads)

Decorations are removed when buildings are placed on their tiles.

---

## Project Structure

```
public/
├── assets/
│   └── manifest.json       # Asset configuration
├── audio/
│   ├── background/         # Background music tracks
│   └── title.mp3           # Intro screen music
└── models/
    ├── suburban/           # City Kit Suburban
    ├── industrial/         # Retro Urban Kit
    └── roads/              # Roads Kit

src/
├── main.ts                 # Entry point, game initialization
├── engine/
│   ├── Engine.ts           # Babylon.js scene, sky, lighting
│   ├── Camera.ts           # Isometric camera + WASD/QE controls
│   ├── InputManager.ts     # Raycast hover/click detection
│   └── PostProcess.ts      # Film grain + heat haze shaders
├── grid/
│   ├── GridManager.ts      # Organic diorama terrain (vertex-colored mesh)
│   ├── TileTypes.ts        # Tile generation (sea/sand/rock)
│   └── GridCoords.ts       # World ↔ Grid coordinate conversion
├── config/
│   └── ConnectionRules.ts  # Pipe connections, building requirements
├── simulation/
│   ├── GameState.ts        # Core game logic, events, seasons
│   ├── TickSystem.ts       # Day progression (3s/tick)
│   ├── EventSystem.ts      # Random events (sandstorms, etc.)
│   ├── ambient/            # Ambient creatures
│   │   ├── AmbientManager.ts
│   │   ├── Camel.ts        # Roaming camels
│   │   └── Tumbleweed.ts   # Rolling tumbleweeds
│   └── buildings/
│       └── Building.ts     # Building metadata
├── managers/
│   ├── AssetManager.ts     # Model loading from manifest
│   ├── BuildingManager.ts  # Visual building creation
│   ├── DecorManager.ts     # Procedural decoration placement
│   ├── PipeManager.ts      # Auto pipe connections + preview
│   ├── MusicManager.ts     # Background music playback
│   └── SoundManager.ts     # ZzFX sound effects
├── effects/
│   └── ParticleManager.ts  # Smoke, steam, dust particles
├── ui/
│   ├── HUD.ts              # Top bar (resources, controls)
│   ├── BuildPanel.ts       # Bottom build menu
│   ├── IntroScreen.ts      # Intro overlay with lore
│   ├── Tutorial.ts         # Contextual hints
│   ├── Tooltip.ts          # Building info on hover
│   ├── FeedbackManager.ts  # Toast notifications
│   └── Icons.ts            # SVG icon definitions
├── types/
│   ├── GameTypes.ts        # All type definitions
│   └── index.ts            # Exports
└── style.css               # All UI styles
```

---

## Key Files to Modify

| Task | File(s) |
|------|---------|
| Add new building type | `types/GameTypes.ts`, `simulation/buildings/Building.ts`, `config/ConnectionRules.ts`, `manifest.json` |
| Change game balance | `types/GameTypes.ts` (costs, production) |
| Modify connection rules | `config/ConnectionRules.ts` (pipe connections, building requirements) |
| Add new resource | `types/GameTypes.ts`, `simulation/GameState.ts`, `ui/HUD.ts` |
| New visual effect | `engine/PostProcess.ts`, `effects/ParticleManager.ts` |
| New sound effect | `managers/SoundManager.ts` |
| UI changes | `ui/*.ts`, `style.css` |
| Switch to primitives | `manifest.json` (set `useModels: false`) |
| Add new 3D model | `public/models/`, `manifest.json` |
| Change tick speed | `simulation/TickSystem.ts` |
| Modify seasons | `simulation/GameState.ts` (SEASON_* constants) |
| Modify terrain visuals | `grid/GridManager.ts` (createLandMesh, createWaterMesh) |
| Camera constraints | `engine/Camera.ts` (clampCameraTarget) |
| Scene effects (fog) | `engine/Engine.ts` |

---

## What's Implemented ✅

### Core
- [x] Babylon.js rendering with isometric camera
- [x] 50×50 tile grid with sea/sand/rock
- [x] Building placement with validation
- [x] Resource production/consumption per tick
- [x] Reactor temperature mechanics
- [x] All 5 building types
- [x] Fail states and game over

### Features
- [x] Seasons affecting heat consumption
- [x] Population growth/decline
- [x] Auto-connecting pipes
- [x] Save/Load to localStorage
- [x] Speed controls (1×, 2×, 4×)
- [x] Pause/Resume
- [x] Resource trend indicators (+/-)

### Visuals
- [x] 3D models from asset packs
- [x] Procedural decorations (trees, fences, roads)
- [x] Film grain post-process
- [x] Heat haze effect near ground
- [x] Sky with gradient
- [x] Ambient dust particles
- [x] Reactor smoke particles
- [x] Distiller steam particles
- [x] Roaming camels (avoid buildings)
- [x] Rolling tumbleweeds (avoid buildings)
- [x] Organic diorama terrain (vertex-colored, non-indexed geometry)
- [x] Sand color variation (per-tile brightness randomization)
- [x] Water plane with animated WaterMaterial
- [x] Diorama base pedestal
- [x] Scene fog (hides map edges)
- [x] Camera pan constraints (clamped to grid bounds)
- [x] Building placement dust burst
- [x] Animated building placement (squash-stretch)
- [x] Pulsing pipe glow animation
- [x] Connection preview (dashed pipes when placing)
- [x] Valid/invalid tile highlight (yellow/red)

### Audio
- [x] ZzFX procedural sounds
- [x] Background music (4 tracks, shuffled)
- [x] Intro screen music
- [x] Volume control (music only)
- [x] Geiger clicks on reactor hover

### UI/UX
- [x] Intro screen with lore
- [x] HUD with all resources
- [x] Build panel with hotkeys (1-5)
- [x] Contextual tutorial hints
- [x] Toast notifications
- [x] Building tooltips
- [x] SVG icons throughout
- [x] WASD + QE camera controls

---

## What's Left 🚧

- [ ] Random events (sandstorms, accidents)
- [ ] Building upgrades
- [ ] Achievement system
- [ ] Multiple maps/scenarios
- [ ] Leaderboard (longest survival)
- [ ] Weather effects (snow)
- [ ] Mobile touch controls

---

## Development Commands

```bash
bun run dev      # Start dev server
bun run build    # Production build
bun run preview  # Preview production build
```
