import type { BuildingType } from '../types';

export interface ConnectionRule {
  source: BuildingType;
  target: BuildingType;
  resourceType: 'water' | 'heat';
}

export const CONNECTION_RULES: ConnectionRule[] = [
  // Water from pumps
  { source: 'pump', target: 'distiller', resourceType: 'water' },
  { source: 'pump', target: 'water_tank', resourceType: 'water' },
  // Heat sources
  { source: 'reactor', target: 'distiller', resourceType: 'heat' },
  { source: 'thermal_plant', target: 'distiller', resourceType: 'heat' },
  // Water distribution
  { source: 'distiller', target: 'microrayon', resourceType: 'water' },
  { source: 'distiller', target: 'water_tank', resourceType: 'water' },
  { source: 'water_tank', target: 'microrayon', resourceType: 'water' },
  // Water tank relay chains
  { source: 'water_tank', target: 'water_tank', resourceType: 'water' },
  { source: 'water_tank', target: 'distiller', resourceType: 'water' }
];

export interface BuildingRequirement {
  type: BuildingType;
  resourceType: 'water' | 'heat';
}

export interface BuildingRequirements {
  requiredInputs: BuildingRequirement[];
  canCoolReactor: boolean;
  canProduce: boolean;
}

export const BUILDING_REQUIREMENTS: Record<BuildingType, BuildingRequirements> = {
  pump: {
    requiredInputs: [],
    canCoolReactor: false,
    canProduce: true
  },
  reactor: {
    requiredInputs: [],
    canCoolReactor: false,
    canProduce: true
  },
  distiller: {
    requiredInputs: [
      { type: 'pump', resourceType: 'water' },
      { type: 'water_tank', resourceType: 'water' }, // Can receive water via tank relay
      { type: 'reactor', resourceType: 'heat' },
      { type: 'thermal_plant', resourceType: 'heat' }
    ],
    canCoolReactor: true,
    canProduce: true
  },
  microrayon: {
    requiredInputs: [
      { type: 'distiller', resourceType: 'water' },
      { type: 'water_tank', resourceType: 'water' } // Can receive water via tank relay
    ],
    canCoolReactor: false,
    canProduce: true
  },
  water_tank: {
    requiredInputs: [],
    canCoolReactor: false,
    canProduce: true
  },
  thermal_plant: {
    requiredInputs: [],
    canCoolReactor: false,
    canProduce: true
  }
};

export const PIPE_VISUAL_CONFIG: Record<
  BuildingType,
  { targets: BuildingType[]; color: string; type: 'water' | 'heat' }[]
> = {
  pump: [{ targets: ['distiller', 'water_tank'], color: '#2F8D8D', type: 'water' }],
  reactor: [{ targets: ['distiller'], color: '#FF6B35', type: 'heat' }],
  distiller: [{ targets: ['microrayon', 'water_tank'], color: '#4A90A4', type: 'water' }],
  microrayon: [],
  water_tank: [
    {
      targets: ['microrayon', 'distiller', 'water_tank'],
      color: '#5599CC',
      type: 'water'
    }
  ],
  thermal_plant: [{ targets: ['distiller'], color: '#D97706', type: 'heat' }]
};

export const MAX_PIPE_DISTANCE = 5;
