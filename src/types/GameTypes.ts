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
  electricity: 200,
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

export type BuildingType = 'pump' | 'reactor' | 'distiller' | 'microrayon' | 'water_tank';

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
  water_tank: { electricity: 15 }
};

export const BUILDING_PRODUCTION: Record<BuildingType, ProductionRule> = {
  pump: { consumes: { electricity: 5 }, produces: { seawater: 10 } },
  reactor: { consumes: {}, produces: { heat: 50, electricity: 20 }, special: 'tempIncrease' },
  distiller: { consumes: { seawater: 10, heat: 10 }, produces: { freshWater: 10 } },
  microrayon: { consumes: { freshWater: 5, heat: 5 }, produces: { happiness: 1 } },
  water_tank: { consumes: {}, produces: {} }
};

export const BUILDING_PLACEMENT: Record<BuildingType, TileType[]> = {
  pump: ['sea'],
  reactor: ['rock'],
  distiller: ['sand', 'rock'],
  microrayon: ['sand'],
  water_tank: ['sand', 'rock']
};

export const WATER_TANK_CAPACITY = 50;

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

export type GameOverReason = 'meltdown' | 'drought' | 'freeze' | 'extinction';

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

export const ISOMETRIC_ALPHA = Math.PI / 4;      // 45 degrees
export const ISOMETRIC_BETA = Math.PI / 3;       // ~60 degrees
export const MIN_ZOOM = 15;
export const MAX_ZOOM = 55;  // Reduced to keep map in view
export const DEFAULT_ZOOM = 35;
