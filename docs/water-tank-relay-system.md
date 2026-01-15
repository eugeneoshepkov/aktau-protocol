# Water Tank Relay System Design

## Problem Statement

Currently, the water distribution is limited by proximity constraints:
- **Pumps** must be within 2 tiles of the coastline
- **Distillers** need a pump within 5 tiles (MAX_PIPE_DISTANCE)
- **Result**: Distillers can only be ~7 tiles from coast maximum

This prevents players from expanding deep into the desert, which is historically inaccurate (Aktau's infrastructure reached far inland) and limits gameplay variety.

## Solution: Dual-Resource Water Tank Relay

Water tanks become true infrastructure that relay **both** seawater and freshwater:

```
SEAWATER FLOW (to distillers):
Coast → Pump → Tank → Tank → Tank → Distiller
                ↓       ↓       ↓
           (seawater capacity relayed through chain)

FRESHWATER FLOW (to microrayons):
Distiller → Tank → Tank → Tank → Microrayon
                ↓       ↓       ↓
           (freshwater capacity relayed through chain)
```

## Capacity Rules

| Building | Seawater Capacity | FreshWater Capacity | Requirements |
|----------|-------------------|---------------------|--------------|
| **Pump** | 10 (1 distiller) | — | Near coast |
| **Water Tank** | 10 (1 distiller) | 10 (2 microrayons) | Connected to source via chain |
| **Distiller** | — | 10 (2 microrayons) | Pump chain + Reactor |

### Chain Validation

A water tank is "active" for a resource if it has a valid supply chain:
- **Seawater active**: Connected to a pump (directly or via other seawater-active tanks)
- **FreshWater active**: Connected to a distiller (directly or via other freshwater-active tanks)

A tank can be active for both, one, or neither resource depending on its connections.

## Implementation Plan

### Step 1: Update GameTypes.ts

Water tanks already have freshWater capacity. No changes needed here since seawater capacity for tanks will be handled differently (they relay, not produce).

Actually, we need to think about this differently:
- Pumps PRODUCE seawater
- Water tanks RELAY seawater (they don't produce, they extend the network)
- Distillers CONSUME seawater

So for seawater, water tanks don't need capacity - they just need to be in the chain between pump and distiller.

### Step 2: Update allocateSeawaterCapacity() in PipeManager.ts

Current logic:
```typescript
pump (10 seawater) → distiller (consumes 10)
```

New logic:
```typescript
pump (10 seawater) → [tank chain] → distiller (consumes 10)
```

Changes needed:
1. Find pumps
2. Find distillers
3. For each distiller, check if it can reach a pump:
   - Directly (within MAX_PIPE_DISTANCE), OR
   - Via water tank chain (each hop within MAX_PIPE_DISTANCE)
4. Allocate capacity from nearest reachable pump

### Step 3: Update getActiveWaterTanks() or create getSeawaterActiveTanks()

Create a method to find water tanks that are part of a seawater supply chain:
```typescript
getSeawaterActiveTanks(pumps, waterTanks): Building[]
```
Uses BFS from pumps to find all connected tanks.

### Step 4: Update Connection Preview

When placing a distiller:
- Show seawater preview pipes through tank chains to pumps
- Show heat preview pipes to reactors

When placing a water tank:
- Show potential seawater relay connections (to pumps or other tanks near pumps)
- Show potential freshwater relay connections (to distillers or other tanks near distillers)

### Step 5: Visual Pipes

Pipes should be drawn for:
- Pump → Tank (seawater relay)
- Tank → Tank (seawater or freshwater relay)
- Tank → Distiller (seawater delivery)
- Distiller → Tank (freshwater relay)
- Tank → Microrayon (freshwater delivery)

## Example Scenarios

### Scenario 1: Basic Inland Distiller
```
Coast:  [Pump]
         ↓ (5 tiles)
        [Tank]
         ↓ (5 tiles)
        [Tank]
         ↓ (5 tiles)
Desert: [Distiller] ← also needs reactor heat within 5 tiles
```
Result: Distiller can be ~15 tiles from coast

### Scenario 2: Branching Network
```
        [Pump]
           ↓
        [Tank] ←→ [Tank]
         ↓           ↓
     [Distiller] [Distiller]
         ↓           ↓
      [Tank]      [Tank]
       ↓   ↓       ↓   ↓
      [M] [M]     [M] [M]
```
Result: 2 distillers share pump via tank, each supplies 4 microrayons via tanks

### Scenario 3: Long Desert Pipeline
```
[Pump]→[Tank]→[Tank]→[Tank]→[Distiller]→[Tank]→[Tank]→[M][M][M][M][M][M]
```
Result: Single pipeline reaching deep into desert

## Edge Cases

1. **Circular tank chains**: BFS with visited set prevents infinite loops
2. **Tank connected to both pump and distiller**: Can relay both resources
3. **Orphan tanks**: Tanks not connected to any source provide no capacity
4. **Multiple pumps**: Each pump's capacity is allocated independently

## Testing Checklist

- [ ] Distiller far from coast connects via tank chain
- [ ] Ghost preview shows green for distiller with tank chain to pump
- [ ] Ghost preview shows gray for distiller with no pump access
- [ ] Connection preview shows pipes through tank chain
- [ ] Removing a tank in the middle breaks downstream connections
- [ ] Tank chains work for both seawater and freshwater simultaneously

## Centralized Capacity Logic

### Current Problem

Capacity logic is scattered across multiple files:
- `GameTypes.ts` - BUILDING_CAPACITY, BUILDING_CONSUMPTION configs
- `ConnectionRules.ts` - PIPE_VISUAL_CONFIG, BUILDING_REQUIREMENTS
- `PipeManager.ts` - hardcoded building types in allocate*Capacity(), wouldHaveCapacity(), etc.

This makes it hard to:
- Understand the full resource flow at a glance
- Add new buildings or resources
- Ensure consistency across placement, preview, and allocation

### Solution: ResourceFlowConfig

Create a single source of truth in `src/config/ResourceFlow.ts`:

```typescript
export type ResourceType = 'seawater' | 'freshWater' | 'heat';
export type PipeType = 'water' | 'heat';

export interface ResourceFlowConfig {
  resource: ResourceType;
  pipeType: PipeType;
  pipeColor: string;

  // Buildings that CREATE this resource (have capacity in BUILDING_CAPACITY)
  producers: BuildingType[];

  // Buildings that RELAY this resource (extend range, may or may not add capacity)
  relays: {
    type: BuildingType;
    addsCapacity: boolean;  // true = adds own capacity, false = just extends range
  }[];

  // Buildings that CONSUME this resource (have entry in BUILDING_CONSUMPTION)
  consumers: BuildingType[];

  // Priority for allocation (lower = allocated first)
  consumerPriority: Partial<Record<BuildingType, number>>;
}

export const RESOURCE_FLOWS: ResourceFlowConfig[] = [
  {
    resource: 'seawater',
    pipeType: 'water',
    pipeColor: '#2F8D8D',
    producers: ['pump'],
    relays: [{ type: 'water_tank', addsCapacity: false }],  // relay only, no extra capacity
    consumers: ['distiller'],
    consumerPriority: { distiller: 1 }
  },
  {
    resource: 'freshWater',
    pipeType: 'water',
    pipeColor: '#4A90A4',
    producers: ['distiller'],
    relays: [{ type: 'water_tank', addsCapacity: true }],  // relay AND adds capacity
    consumers: ['microrayon'],
    consumerPriority: { microrayon: 1 }
  },
  {
    resource: 'heat',
    pipeType: 'heat',
    pipeColor: '#FF6B35',
    producers: ['reactor', 'thermal_plant'],
    relays: [],  // heat doesn't relay through pipes
    consumers: ['distiller'],  // microrayons use global heat pool, not pipes
    consumerPriority: { distiller: 1 }  // distillers get heat before microrayons (for global pool)
  }
];
```

### Helper Functions

```typescript
// Get flow config for a resource
export function getResourceFlow(resource: ResourceType): ResourceFlowConfig | undefined;

// Check if building produces a resource
export function isProducer(buildingType: BuildingType, resource: ResourceType): boolean;

// Check if building can relay a resource
export function isRelay(buildingType: BuildingType, resource: ResourceType): boolean;

// Check if relay adds capacity or just extends range
export function relayAddsCapacity(buildingType: BuildingType, resource: ResourceType): boolean;

// Check if building consumes a resource via pipes
export function isConsumer(buildingType: BuildingType, resource: ResourceType): boolean;

// Get all resources a building type interacts with
export function getBuildingResources(buildingType: BuildingType): {
  produces: ResourceType[];
  relays: ResourceType[];
  consumes: ResourceType[];
};
```

### Refactored PipeManager

With centralized config, PipeManager methods become generic:

```typescript
// Before (hardcoded):
private allocateSeawaterCapacity(buildings) {
  const pumps = buildings.filter(b => b.type === 'pump');
  const distillers = buildings.filter(b => b.type === 'distiller');
  // ... seawater-specific logic
}

// After (config-driven):
private allocateResourceCapacity(buildings, resourceFlow: ResourceFlowConfig) {
  const producers = buildings.filter(b => resourceFlow.producers.includes(b.type));
  const relayTypes = resourceFlow.relays.map(r => r.type);
  const relays = buildings.filter(b => relayTypes.includes(b.type));
  const consumers = buildings.filter(b => resourceFlow.consumers.includes(b.type));

  // Find active relays (connected to producers)
  const activeRelays = this.getActiveRelays(producers, relays);

  // Build capacity map
  const capacityMap = this.buildCapacityMap(producers, activeRelays, resourceFlow);

  // Allocate to consumers
  this.allocateToConsumers(consumers, capacityMap, resourceFlow);
}

// Main allocation method
public rebuildPipes() {
  for (const flow of RESOURCE_FLOWS) {
    this.allocateResourceCapacity(buildings, flow);
  }
}
```

### Benefits

1. **Single source of truth** - All resource flow logic in one file
2. **Easy to modify** - Change capacity rules without touching PipeManager
3. **Self-documenting** - Config clearly shows how resources flow
4. **Extensible** - Add new resources or buildings by updating config
5. **Testable** - Can unit test config helpers independently

### Migration Plan

1. Create `src/config/ResourceFlow.ts` with config and helpers
2. Update `PipeManager.ts` to use config instead of hardcoded types
3. Keep `BUILDING_CAPACITY` and `BUILDING_CONSUMPTION` in GameTypes.ts (numeric values)
4. ResourceFlow config references building types, actual capacity values come from GameTypes
5. Remove redundant configs from `ConnectionRules.ts` if fully covered by ResourceFlow

## Files to Modify

### Phase 1: Create Centralized Config

1. `src/config/ResourceFlow.ts` (NEW)
   - ResourceFlowConfig interface and types
   - RESOURCE_FLOWS array with all three resources
   - Helper functions (isProducer, isRelay, isConsumer, etc.)

### Phase 2: Refactor PipeManager to Use Config

2. `src/managers/PipeManager.ts`
   - Import RESOURCE_FLOWS and helpers
   - Replace `allocateSeawaterCapacity()`, `allocateFreshWaterCapacity()`, `allocateHeatCapacity()` with single generic `allocateResourceCapacity(flow)`
   - Replace `getActiveWaterTanks()` with generic `getActiveRelays(producers, relays, flow)`
   - Update `wouldHaveCapacityForResource()` to use config
   - Update `showConnectionPreview()` to use config
   - Update `hasRemainingCapacityFor()` to use config
   - Update `getResourcesWithPipeConnections()` to use config

### Phase 3: Cleanup Redundant Configs

3. `src/config/ConnectionRules.ts`
   - Review PIPE_VISUAL_CONFIG - may be replaced by ResourceFlow pipeColor
   - Keep BUILDING_REQUIREMENTS for non-capacity logic (reactor cooling, etc.)

4. `src/types/GameTypes.ts`
   - Keep BUILDING_CAPACITY (numeric capacity values)
   - Keep BUILDING_CONSUMPTION (numeric consumption values)
   - These are referenced by ResourceFlow but not duplicated

### Phase 4: Documentation

5. `CLAUDE.md`
   - Update Capacity System section
   - Add reference to ResourceFlow.ts as single source of truth

6. `README.md`
   - Update Water Tank description if needed

## Implementation Order

```
1. Create ResourceFlow.ts with config and helpers
2. Add seawater relay support to RESOURCE_FLOWS
3. Write generic allocateResourceCapacity() method
4. Migrate allocateSeawaterCapacity() to use generic method
5. Migrate allocateFreshWaterCapacity() to use generic method
6. Migrate allocateHeatCapacity() to use generic method
7. Update preview methods to use config
8. Remove old hardcoded methods
9. Test all scenarios
10. Update documentation
```
