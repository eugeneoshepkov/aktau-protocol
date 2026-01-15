import type { Mesh } from '@babylonjs/core';

// ============================================
// Resource Types
// ============================================

export interface Resources {
  seawater: number;
  freshWater: number;
  heat: number;
  electricity: number;
  population: number;
  happiness: number;
}

export const STARTING_RESOURCES: Resources = {
  seawater: 100,
  freshWater: 50,
  heat: 50,
  electricity: 100,
  population: 100,
  happiness: 50
};

// ============================================
// Tile Types
// ============================================

export type TileType = 'sand' | 'sea' | 'rock';

export interface TileConfig {
  type: TileType;
  color: string;
}

export const TILE_COLORS: Record<TileType, string> = {
  sand: '#E6D5AC',
  sea: '#2F8D8D',
  rock: '#555555'
};

// ============================================
// Building Types
// ============================================

export type BuildingType =
  | 'pump'
  | 'reactor'
  | 'distiller'
  | 'microrayon'
  | 'water_tank'
  | 'thermal_plant';

export interface Building {
  id: string;
  type: BuildingType;
  gridX: number;
  gridZ: number;
  mesh?: Mesh;
}

export interface ProductionRule {
  consumes: Partial<Resources>;
  produces: Partial<Resources>;
  special?: 'tempIncrease';
}

export const BUILDING_COSTS: Record<BuildingType, Partial<Resources>> = {
  pump: { electricity: 20 },
  reactor: { electricity: 50 },
  distiller: { electricity: 30 },
  microrayon: { freshWater: 20, heat: 10 },
  water_tank: { electricity: 15 },
  thermal_plant: { electricity: 40 }
};

// Housing capacity: each connected microrayon provides housing for this many people
export const HOUSING_CAPACITY_PER_MICRORAYON = 50;

export const BUILDING_PRODUCTION: Record<BuildingType, ProductionRule> = {
  pump: { consumes: { electricity: 5 }, produces: { seawater: 10 } },
  reactor: {
    consumes: {},
    produces: { heat: 50, electricity: 20 },
    special: 'tempIncrease'
  },
  distiller: {
    consumes: { seawater: 10, heat: 10 },
    produces: { freshWater: 10 }
  },
  microrayon: {
    consumes: { freshWater: 5, heat: 5 },
    produces: { happiness: 1 }
  },
  water_tank: { consumes: {}, produces: {} },
  thermal_plant: { consumes: { electricity: 10 }, produces: { heat: 15, electricity: 25 } }
};

export const BUILDING_PLACEMENT: Record<BuildingType, TileType[]> = {
  pump: ['sea'],
  reactor: ['rock'],
  distiller: ['sand', 'rock'],
  microrayon: ['sand'],
  water_tank: ['sand', 'rock'],
  thermal_plant: ['sand', 'rock']
};

// Maximum number of each building type allowed (undefined = unlimited)
export const BUILDING_MAX_ALLOWED: Partial<Record<BuildingType, number>> = {
  reactor: 1 // BN-350 is unique - the heart of Aktau
};

// Building limits based on count of other buildings
// E.g., thermal_plant requires 5 microrayons per plant (first one free)
export interface BuildingScalingLimit {
  requiredBuilding: BuildingType;
  countPerAllowed: number; // How many of requiredBuilding needed per one of this building
  freeCount: number; // How many can be built without requirements
}

export const BUILDING_SCALING_LIMITS: Partial<Record<BuildingType, BuildingScalingLimit>> = {
  thermal_plant: {
    requiredBuilding: 'microrayon',
    countPerAllowed: 5, // Need 5 microrayons per thermal plant (after free ones)
    freeCount: 1 // First thermal plant is free
  }
};

export const WATER_TANK_CAPACITY = 50;

// ============================================
// Building Capacity System
// ============================================

// What resource each building provides and how much capacity
export interface CapacityConfig {
  resource: 'seawater' | 'freshWater' | 'heat';
  provides: number;
}

export const BUILDING_CAPACITY: Partial<Record<BuildingType, CapacityConfig>> = {
  pump: { resource: 'seawater', provides: 10 },
  distiller: { resource: 'freshWater', provides: 10 },
  water_tank: { resource: 'freshWater', provides: 10 }, // Relay capacity (requires distiller supply chain)
  reactor: { resource: 'heat', provides: 50 },
  thermal_plant: { resource: 'heat', provides: 15 }
};

// What resource each building consumes (for capacity allocation)
export interface ConsumptionConfig {
  resource: 'seawater' | 'freshWater' | 'heat';
  amount: number;
  priority: number; // Lower = higher priority (distillers get heat before microrayons)
}

export const BUILDING_CONSUMPTION: Partial<Record<BuildingType, ConsumptionConfig[]>> = {
  distiller: [
    { resource: 'seawater', amount: 10, priority: 1 },
    { resource: 'heat', amount: 10, priority: 1 } // Distillers get heat first
  ],
  microrayon: [
    { resource: 'freshWater', amount: 5, priority: 1 },
    { resource: 'heat', amount: 5, priority: 2 } // Microrayons get heat after distillers
  ]
};

// ============================================
// Reactor State
// ============================================

export interface ReactorState {
  temperature: number; // 0-100, >100 = meltdown
  coolingActive: boolean;
}

// ============================================
// Game State
// ============================================

export type GameOverReason = 'meltdown' | 'drought' | 'freeze' | 'extinction' | 'revolt';

export interface GameStateData {
  resources: Resources;
  reactor: ReactorState;
  buildings: Building[];
  day: number;
  gameOver: boolean;
  gameOverReason?: GameOverReason;
}

// ============================================
// Grid Constants
// ============================================

export const GRID_SIZE = 50;
export const TILE_SIZE = 1;
export const SEA_ROWS = 10; // First 10 rows are sea

// ============================================
// Camera Constants
// ============================================

export const ISOMETRIC_ALPHA = Math.PI / 4; // 45 degrees
export const ISOMETRIC_BETA = Math.PI / 3; // ~60 degrees
export const MIN_ZOOM = 15;
export const MAX_ZOOM = 55; // Reduced to keep map in view
export const DEFAULT_ZOOM = 35;
