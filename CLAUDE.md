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

| Resource | Description | Starting Value | Cap |
|----------|-------------|----------------|-----|
| Seawater | Raw water from Caspian Sea | 100 | 200 |
| Fresh Water | Desalinated drinking water | 50 | 200 |
| Heat | Thermal energy for heating | 100 | 200 |
| Electricity | Power for buildings | 150 | 200 |
| Population | City inhabitants | 100 | — (housing limited) |
| Happiness | Citizen satisfaction | 50 | 100 |

### Buildings

| Building | Placement | Cost | Consumes/tick | Produces/tick | Special |
|----------|-----------|------|---------------|---------------|---------|
| **Water Pump** | Sea tiles | ⚡20 | ⚡5 | 🌊10 seawater | Extracts from Caspian |
| **BN-350 Reactor** | Rock tiles | ⚡50 | — | 🔥70 heat, ⚡20 | +1°C/tick to reactor temp |
| **Desalination Plant** | Sand/Rock | ⚡30 | 🌊10, 🔥8 | 💧10 freshwater | Cools reactor by 0.8°C/tick |
| **Microrayon Housing** | Sand tiles | 💧20, 🔥10 | 💧5, 🔥5× season | 😊±1-2 happiness | Soviet housing blocks |
| **Water Tank** | Sand/Rock | ⚡15 | — | — | Relays water, adds 💧10 capacity |
| **Thermal Plant** | Sand/Rock | ⚡40 | ⚡10 | 🔥20 heat, ⚡25 | Requires 5 microrayons per plant |

### Building Limits

| Building | Limit |
|----------|-------|
| **Reactor** | 1 (unique) |
| **Thermal Plant** | 1 free + 1 per 5 microrayons |

### Cost Scaling

Building costs increase by **15% for each building of the same type** already placed:

| Building | Base Cost | 5th Copy | 10th Copy |
|----------|-----------|----------|-----------|
| **Water Pump** | ⚡20 | ⚡32 | ⚡47 |
| **Desalination Plant** | ⚡30 | ⚡48 | ⚡70 |
| **Microrayon** | 💧20, 🔥10 | 💧32, 🔥16 | 💧47, 🔥23 |
| **Water Tank** | ⚡15 | ⚡24 | ⚡35 |
| **Thermal Plant** | ⚡40 | ⚡64 | ⚡94 |

Formula: `baseCost × (1 + count × 0.15)`

### Maintenance Costs

Active buildings consume electricity for upkeep each tick:

| Building | Maintenance |
|----------|-------------|
| **Water Pump** | ⚡1/tick |
| **Desalination Plant** | ⚡1/tick |
| **Thermal Plant** | ⚡2/tick |
| **Microrayon** | Free (housing) |
| **Water Tank** | Free (passive) |
| **Reactor** | Free (produces power) |

Maintenance is intentionally light to avoid death spirals.

### Tile Types

| Type | Color | Description |
|------|-------|-------------|
| Sea | Teal `#2F8D8D` | First 10 rows, pumps only |
| Sand | Beige `#E6D5AC` | Main building area |
| Rock | Gray `#555555` | Scattered, reactors & distillers |

### Seasons

Seasons cycle every 30 days and affect heat consumption for **both microrayons and distillers**:

| Season | Heat Multiplier | Effect |
|--------|-----------------|--------|
| Spring | ×1.0 | Normal |
| Summer | ×0.5 | Half heat needed |
| Autumn | ×1.2 | 20% more heat |
| Winter | ×2.0 | Double heat needed |

**Note:** In winter, distillers consume 16 heat (8 × 2) instead of 8.

#### Escalating Winters

Each year (120 days), winter severity increases by 10%, simulating aging infrastructure and climate stress:

| Year | Winter Multiplier | Effect |
|------|-------------------|--------|
| Year 1 | ×2.0 | Normal winter |
| Year 2 | ×2.1 | Slightly harder |
| Year 3 | ×2.2 | Noticeably harder |
| Year 5 | ×2.4 | Challenging |
| Year 10 | ×3.0 | Very challenging |

### Random Events

Random events create unpredictability and prevent the game from becoming trivial at equilibrium. Events are checked each day with varying chances.

#### Year-Round Events

| Event | Icon | Chance | Duration | Effect |
|-------|------|--------|----------|--------|
| **Sandstorm** | 🌪️ | 4% | 5 days | Pump efficiency -50% |
| **Cold Snap** | 🥶 | 4% | 3 days | Heat consumption +50% |
| **Equipment Failure** | ⚠️ | 3% | 2 days | Electricity production -30% |
| **Population Surge** | 📈 | 3% | 7 days | Happiness +10 |
| **Reactor SCRAM** | ☢️ | 1.5% | 3 days | Instant +15°C, power -50% |
| **Water Contamination** | ☣️ | 2% | 4 days | Instant -30% water, production -50% |
| **Favorable Winds** | 💨 | 2% | 5 days | Pump efficiency +20% |

#### Summer Events (June-August)

| Event | Icon | Chance | Duration | Effect |
|-------|------|--------|----------|--------|
| **Heat Wave** | 🌡️ | 5% | 4 days | Electricity production -30% |
| **Algae Bloom** | 🦠 | 4% | 5 days | Pump efficiency -60% |

#### Winter Events (December-February)

| Event | Icon | Chance | Duration | Effect |
|-------|------|--------|----------|--------|
| **Blizzard** | 🌨️ | 6% | 4 days | Heat consumption ×2 |
| **Arctic Front** | ❄️ | 4% | 5 days | Heat consumption +80% |
| **Pipe Freeze** | 🧊 | 4% | 2 days | Water production -50% |

**Note:** Only one event of each type can be active at a time. Dramatic events like Reactor SCRAM and Water Contamination have instant effects plus ongoing modifiers.

#### Guaranteed Event Cadence

To prevent long stretches of quiet gameplay, the event system ensures regular disruption:

| Days Since Last Event | Effect |
|-----------------------|--------|
| 0-15 days | Normal event chances |
| 15-20 days | Event chances scale up to ×3 |
| 20+ days | Random eligible event is forced |

This ensures at least one event triggers every 20 days maximum.

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

#### Population Consumption Scaling

Larger populations consume more resources per person, creating pressure as the city grows:

| Population | Consumption Multiplier |
|------------|------------------------|
| ≤100 | ×1.0 (baseline) |
| 200 | ×1.06 |
| 500 | ×1.24 |
| 1000 | ×1.54 |

Formula: `1 + ((population - 100) / 50) × 0.03` (for population > 100)

This affects all microrayon resource consumption (water and heat).

### Fail States

| Condition | Result |
|-----------|--------|
| Reactor Temp ≥ 100°C | ☢️ NUCLEAR MELTDOWN |
| Fresh Water < 0 | 🏜️ CITY DROUGHT |
| Heat < 0 (with population) | ❄️ CITY FROZEN |
| Population = 0 (with housing) | 💀 POPULATION EXTINCT |
| Happiness = 0 (with population) | ✊ CITIZENS REVOLT |

### Pipe Connections

Buildings auto-connect with visual pipes when within 5 tiles:
- **Pump → Distiller/Water Tank:** Blue water pipe
- **Reactor → Distiller/Microrayon:** Orange heat pipe
- **Thermal Plant → Distiller/Microrayon:** Orange heat pipe
- **Distiller → Microrayon/Water Tank:** Blue water pipe
- **Water Tank → Microrayon:** Blue water pipe

### Capacity System

Each producer building has limited capacity based on production/consumption ratios. Connections are allocated by distance (nearest first). Once capacity is exhausted, additional buildings remain disconnected.

| Producer | Capacity | Can Supply |
|----------|----------|------------|
| **Pump** | 10 seawater | 1 distiller |
| **Distiller** | 10 freshWater | 2 microrayons |
| **Water Tank** | 10 freshWater | 2 microrayons (requires distiller chain) |
| **Reactor** | 70 heat | 8 distillers OR 14 microrayons |
| **Thermal Plant** | 20 heat | 2 distillers OR 4 microrayons |

**Water Distribution Network:** Water tanks act as capacity relays. They provide 10 freshWater capacity each, but only if connected to a distiller (directly or via other tanks). This allows building extensive housing networks with minimal distillers:
- 1 distiller = 2 microrayons
- 1 distiller + 1 tank = 4 microrayons
- 1 distiller + 2 tanks = 6 microrayons

**Heat Priority:** Distillers receive heat before microrayons (priority 1 vs 2). This ensures water production and reactor cooling are prioritized—without water, housing is useless anyway.

### Connection Requirements

Buildings must be connected to function properly:

| Building | Required Connections | Effect if Disconnected |
|----------|---------------------|------------------------|
| **Distiller** | Pump (water) + Reactor/Thermal Plant (heat) | No freshwater production, no reactor cooling |
| **Microrayon** | Distiller/Water Tank (water) + Reactor/Thermal Plant (heat) | -2 happiness/tick, no resource consumption |

**Important:** Disconnected buildings do NOT consume resources—only connected buildings produce and consume. Disconnected microrayons cause happiness loss but don't drain water/heat.

### Building Placement Preview

When a building is selected for placement:
- **Yellow highlight:** Valid placement location
- **Red highlight:** Invalid placement (wrong tile type, occupied, etc.)
- **Ghost building preview:**
  - **Green:** Valid placement AND would be connected (producer has capacity)
  - **Gray:** Valid placement but NOT connected (no producer with capacity nearby)
  - **Red:** Invalid placement (wrong tile type, occupied, etc.)
- **Dashed preview pipes:** Show connections to buildings with available capacity
  - Blue dashed lines for water connections
  - Orange dashed lines for heat connections
  - Only shows pipes to/from producers that have remaining capacity

**Building Spacing:** Buildings must be at least 1 tile apart from each other (diagonal counts). This prevents cramped placement and ensures visual clarity.

---

## Demolish Mode

Press **X** (or **Ч** on Russian keyboard) to toggle demolish mode:

- Click any building to demolish it
- **50% refund** of base cost (not scaled cost)
- **Reactor cannot be demolished** (shows error)
- Press X again or select a building to exit demolish mode
- Visual feedback: red-themed button, panel border glows red

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
| **X** | Toggle demolish mode |
| **Esc** | Cancel building placement / Exit demolish mode |
| **Click** | Place building / Select / Demolish (in demolish mode) |

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
├── i18n/
│   ├── index.ts            # i18n singleton, locale detection, t() function
│   ├── en.ts               # English translations (~400 keys)
│   └── ru.ts               # Russian translations
├── utils/
│   └── keyboard.ts         # Russian keyboard layout support
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
│   ├── TutorialManager.ts  # Mission objectives system
│   ├── Tooltip.ts          # Building info on hover
│   ├── FeedbackManager.ts  # Toast notifications
│   ├── ShortcutsModal.ts   # Keyboard shortcuts modal
│   ├── Chronicle.ts        # Historical facts archive
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
| Change game balance | `types/GameTypes.ts` (costs, production, capacity) |
| Modify capacity/connections | `config/ResourceFlow.ts` (single source of truth), `types/GameTypes.ts` (numeric values) |
| Modify connection rules | `config/ResourceFlow.ts` (resource flows), `config/ConnectionRules.ts` (requirements) |
| Add new resource | `types/GameTypes.ts`, `simulation/GameState.ts`, `ui/HUD.ts` |
| Demolish feature | `managers/BuildingManager.ts` (demolish mode), `ui/BuildPanel.ts` (button), `simulation/GameState.ts` (removeBuilding, addResources) |
| New visual effect | `engine/PostProcess.ts`, `effects/ParticleManager.ts` |
| New sound effect | `managers/SoundManager.ts` |
| UI changes | `ui/*.ts`, `style.css` |
| Switch to primitives | `manifest.json` (set `useModels: false`) |
| Add new 3D model | `public/models/`, `manifest.json` |
| Change tick speed | `simulation/TickSystem.ts` |
| Modify seasons | `simulation/GameState.ts` (SEASON_* constants, season multiplier logic) |
| Modify terrain visuals | `grid/GridManager.ts` (createLandMesh, createWaterMesh) |
| Camera constraints | `engine/Camera.ts` (clampCameraTarget) |
| Scene effects (fog) | `engine/Engine.ts` |
| Modify tutorial objectives | `ui/TutorialManager.ts` (STEP_CONFIGS) |
| Modify diagnostics | `ui/DiagnosticManager.ts` (checkIssues, building highlighting) |
| Add/modify translations | `i18n/en.ts`, `i18n/ru.ts` |
| Add keyboard shortcut | `utils/keyboard.ts` (add Russian mapping), relevant handler file |

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
- [x] Seasons affecting heat consumption (microrayons AND distillers)
- [x] Population growth/decline
- [x] Auto-connecting pipes
- [x] Save/Load to localStorage
- [x] Speed controls (1×, 2×, 4×)
- [x] Pause/Resume
- [x] Resource trend indicators (+/-)
- [x] Demolish mode (X key, 50% refund)

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
- [x] Intro screen with lore and historical image
- [x] HUD with all resources
- [x] Build panel with hotkeys (1-5)
- [x] Mission objectives system (guides new players through Power → Water → Housing)
- [x] Toast notifications
- [x] Building tooltips
- [x] Historical facts archive (Chronicle) with unread tracking
- [x] Keyboard shortcuts modal
- [x] SVG icons throughout
- [x] WASD + QE camera controls
- [x] Auto-pause when modals open

### Localization
- [x] i18n system with auto locale detection (`navigator.language`)
- [x] English and Russian translations (~400 keys)
- [x] Russian keyboard layout support (WASD → ЦФЫВ, QE → ЙУ, etc.)
- [x] Locale-specific Wikipedia links in Chronicle (en/ru)

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
