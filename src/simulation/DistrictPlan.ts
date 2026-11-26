import type { BuildingType } from '../types';

interface Lot {
  type: BuildingType;
  x: number;
  z: number;
}

export const STARTER_DISTRICT: Lot[] = [
  { type: 'reactor', x: 38, z: 12 },
  { type: 'pump', x: 35, z: 9 },
  { type: 'distiller', x: 35, z: 12 },
  { type: 'microrayon', x: 37, z: 15 },
  { type: 'water_tank', x: 34, z: 15 },
  { type: 'thermal_plant', x: 42, z: 16 }
];

export interface DistrictOrder {
  id: string;
  measure: BuildingType | 'population' | 'day';
  target: number;
  reward?: { resource: 'population' | 'electricity' | 'freshWater'; amount: number };
  sites?: [number, number][];
}

export const DISTRICT_ORDERS: DistrictOrder[] = [
  {
    id: 'homes',
    measure: 'microrayon',
    target: 2,
    reward: { resource: 'population', amount: 25 },
    sites: [[39, 15]]
  },
  {
    id: 'intake',
    measure: 'pump',
    target: 2,
    reward: { resource: 'electricity', amount: 30 },
    sites: [[38, 7]]
  },
  {
    id: 'water',
    measure: 'distiller',
    target: 2,
    reward: { resource: 'freshWater', amount: 40 },
    sites: [[40, 9]]
  },
  {
    id: 'district',
    measure: 'microrayon',
    target: 4,
    reward: { resource: 'population', amount: 30 },
    sites: [
      [40, 12],
      [42, 13]
    ]
  },
  {
    id: 'residents',
    measure: 'population',
    target: 180
  },
  {
    id: 'winter',
    measure: 'day',
    target: 121
  }
];

export const CIVIC_PROJECTS = {
  public_garden: { resource: 'freshWater', offsetX: -7, offsetZ: 0 },
  district_heating: { resource: 'heat', offsetX: 6, offsetZ: -2 }
} as const;
export type CivicProjectKind = keyof typeof CIVIC_PROJECTS;
export interface CivicProject {
  kind: CivicProjectKind;
  gridX: number;
  gridZ: number;
}
export const CIVIC_POWER_COST = 80;
export const CIVIC_MATERIAL_COST = 40;
export const CIVIC_SAVINGS = 0.25;

export const WATERFRONT_EXPANSION: Record<'homes' | 'residents', DistrictOrder> = {
  homes: { id: 'fifth', measure: 'microrayon', target: 5, sites: [[37, 10]] },
  residents: { id: 'settle', measure: 'population', target: 250 }
};
