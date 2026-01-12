import type { BuildingType } from '../types';

export interface ConnectionRule {
  source: BuildingType;
  target: BuildingType;
  resourceType: 'water' | 'heat';
}

export const CONNECTION_RULES: ConnectionRule[] = [
  { source: 'pump', target: 'distiller', resourceType: 'water' },
  { source: 'pump', target: 'water_tank', resourceType: 'water' },
  { source: 'reactor', target: 'distiller', resourceType: 'heat' },
  { source: 'distiller', target: 'microrayon', resourceType: 'water' },
  { source: 'distiller', target: 'water_tank', resourceType: 'water' },
  { source: 'water_tank', target: 'microrayon', resourceType: 'water' },
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
      { type: 'reactor', resourceType: 'heat' }
    ], 
    canCoolReactor: true,
    canProduce: true
  },
  microrayon: { 
    requiredInputs: [
      { type: 'distiller', resourceType: 'water' }
    ], 
    canCoolReactor: false,
    canProduce: true
  },
  water_tank: { 
    requiredInputs: [], 
    canCoolReactor: false,
    canProduce: true
  },
};

export const PIPE_VISUAL_CONFIG: Record<BuildingType, { targets: BuildingType[]; color: string; type: 'water' | 'heat' }[]> = {
  pump: [
    { targets: ['distiller', 'water_tank'], color: '#2F8D8D', type: 'water' }
  ],
  reactor: [
    { targets: ['distiller'], color: '#FF6B35', type: 'heat' }
  ],
  distiller: [
    { targets: ['microrayon', 'water_tank'], color: '#4A90A4', type: 'water' }
  ],
  microrayon: [],
  water_tank: [
    { targets: ['microrayon'], color: '#5599CC', type: 'water' }
  ]
};

export const MAX_PIPE_DISTANCE = 5;
