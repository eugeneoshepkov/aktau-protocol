import type { BuildingType, ProductionRule, TileType } from '../../types';
import { BUILDING_COSTS, BUILDING_PRODUCTION, BUILDING_PLACEMENT } from '../../types';

/**
 * Building metadata and helpers
 */
export interface BuildingMeta {
  type: BuildingType;
  name: string;
  description: string;
  allowedTiles: TileType[];
  costs: Partial<Record<string, number>>;
  production: ProductionRule;
}

export const BUILDING_META: Record<BuildingType, BuildingMeta> = {
  pump: {
    type: 'pump',
    name: 'Water Pump',
    description: 'Extracts seawater from the Caspian Sea. Build on SEA tiles (teal).',
    allowedTiles: BUILDING_PLACEMENT.pump,
    costs: BUILDING_COSTS.pump,
    production: BUILDING_PRODUCTION.pump
  },
  reactor: {
    type: 'reactor',
    name: 'BN-350 Reactor',
    description: 'Nuclear reactor providing heat and electricity. Build on ROCK tiles (gray). Warning: +1°C/tick!',
    allowedTiles: BUILDING_PLACEMENT.reactor,
    costs: BUILDING_COSTS.reactor,
    production: BUILDING_PRODUCTION.reactor
  },
  distiller: {
    type: 'distiller',
    name: 'Desalination Plant',
    description: 'Converts seawater to freshwater using heat. Also cools the reactor by -0.8°C/tick.',
    allowedTiles: BUILDING_PLACEMENT.distiller,
    costs: BUILDING_COSTS.distiller,
    production: BUILDING_PRODUCTION.distiller
  },
  microrayon: {
    type: 'microrayon',
    name: 'Microrayon Housing',
    description: 'Soviet-style housing block. Consumes water and heat, generates happiness. Build on SAND tiles.',
    allowedTiles: BUILDING_PLACEMENT.microrayon,
    costs: BUILDING_COSTS.microrayon,
    production: BUILDING_PRODUCTION.microrayon
  },
  water_tank: {
    type: 'water_tank',
    name: 'Water Tank',
    description: 'Stores up to 50 freshwater. Buffers supply/demand fluctuations.',
    allowedTiles: BUILDING_PLACEMENT.water_tank,
    costs: BUILDING_COSTS.water_tank,
    production: BUILDING_PRODUCTION.water_tank
  }
};

/**
 * Get building metadata by type
 */
export function getBuildingMeta(type: BuildingType): BuildingMeta {
  return BUILDING_META[type];
}

/**
 * Get all building types
 */
export function getAllBuildingTypes(): BuildingType[] {
  return Object.keys(BUILDING_META) as BuildingType[];
}
