/**
 * ResourceFlow.ts - Single source of truth for resource capacity and flow logic
 *
 * This config drives:
 * - Building placements (can this building work here?)
 * - Connection preview (what pipes would be drawn?)
 * - Ghost preview colors (green/gray/red)
 * - Capacity allocation (which buildings get resources?)
 */

import type { BuildingType } from '../types';
import { BUILDING_CAPACITY, BUILDING_CONSUMPTION } from '../types';

// ============================================
// Types
// ============================================

export type ResourceType = 'seawater' | 'freshWater' | 'heat';
export type PipeType = 'water' | 'heat';

export interface RelayConfig {
  type: BuildingType;
  addsCapacity: boolean; // true = adds own capacity, false = just extends range
}

export interface ResourceFlowConfig {
  resource: ResourceType;
  pipeType: PipeType;
  pipeColor: string;

  // Buildings that CREATE this resource (have capacity in BUILDING_CAPACITY)
  producers: BuildingType[];

  // Buildings that RELAY this resource (extend range, may or may not add capacity)
  relays: RelayConfig[];

  // Buildings that CONSUME this resource (have entry in BUILDING_CONSUMPTION)
  consumers: BuildingType[];

  // Priority for allocation (lower = allocated first)
  consumerPriority: Partial<Record<BuildingType, number>>;
}

// ============================================
// Resource Flow Configuration
// ============================================

export const RESOURCE_FLOWS: ResourceFlowConfig[] = [
  {
    resource: 'seawater',
    pipeType: 'water',
    pipeColor: '#2F8D8D',
    producers: ['pump'],
    relays: [{ type: 'water_tank', addsCapacity: false }], // relay only, no extra capacity
    consumers: ['distiller'],
    consumerPriority: { distiller: 1 }
  },
  {
    resource: 'freshWater',
    pipeType: 'water',
    pipeColor: '#4A90A4',
    producers: ['distiller'],
    relays: [{ type: 'water_tank', addsCapacity: true }], // relay AND adds capacity
    consumers: ['microrayon'],
    consumerPriority: { microrayon: 1 }
  },
  {
    resource: 'heat',
    pipeType: 'heat',
    pipeColor: '#FF6B35',
    producers: ['reactor', 'thermal_plant'],
    relays: [], // heat doesn't relay through pipes
    consumers: ['distiller'], // microrayons use global heat pool, not pipes
    consumerPriority: { distiller: 1 }
  }
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get flow config for a specific resource
 */
export function getResourceFlow(resource: ResourceType): ResourceFlowConfig | undefined {
  return RESOURCE_FLOWS.find((flow) => flow.resource === resource);
}

/**
 * Get flow config by pipe type (for visual pipe creation)
 */
export function getFlowsByPipeType(pipeType: PipeType): ResourceFlowConfig[] {
  return RESOURCE_FLOWS.filter((flow) => flow.pipeType === pipeType);
}

/**
 * Check if a building type produces a resource
 */
export function isProducer(buildingType: BuildingType, resource: ResourceType): boolean {
  const flow = getResourceFlow(resource);
  return flow?.producers.includes(buildingType) ?? false;
}

/**
 * Check if a building type can relay a resource
 */
export function isRelay(buildingType: BuildingType, resource: ResourceType): boolean {
  const flow = getResourceFlow(resource);
  return flow?.relays.some((r) => r.type === buildingType) ?? false;
}

/**
 * Check if a relay building adds capacity or just extends range
 */
export function relayAddsCapacity(buildingType: BuildingType, resource: ResourceType): boolean {
  const flow = getResourceFlow(resource);
  const relay = flow?.relays.find((r) => r.type === buildingType);
  return relay?.addsCapacity ?? false;
}

/**
 * Check if a building type consumes a resource via pipes
 */
export function isConsumer(buildingType: BuildingType, resource: ResourceType): boolean {
  const flow = getResourceFlow(resource);
  return flow?.consumers.includes(buildingType) ?? false;
}

/**
 * Check if a building type is involved in a resource flow (producer, relay, or consumer)
 */
export function isInvolvedInFlow(buildingType: BuildingType, resource: ResourceType): boolean {
  return (
    isProducer(buildingType, resource) ||
    isRelay(buildingType, resource) ||
    isConsumer(buildingType, resource)
  );
}

/**
 * Get all resources a building type interacts with
 */
export function getBuildingResources(buildingType: BuildingType): {
  produces: ResourceType[];
  relays: ResourceType[];
  consumes: ResourceType[];
} {
  const produces: ResourceType[] = [];
  const relays: ResourceType[] = [];
  const consumes: ResourceType[] = [];

  for (const flow of RESOURCE_FLOWS) {
    if (flow.producers.includes(buildingType)) {
      produces.push(flow.resource);
    }
    if (flow.relays.some((r) => r.type === buildingType)) {
      relays.push(flow.resource);
    }
    if (flow.consumers.includes(buildingType)) {
      consumes.push(flow.resource);
    }
  }

  return { produces, relays, consumes };
}

/**
 * Get the capacity a building provides for a resource (from BUILDING_CAPACITY)
 */
export function getCapacity(buildingType: BuildingType, resource: ResourceType): number {
  const config = BUILDING_CAPACITY[buildingType];
  if (config && config.resource === resource) {
    return config.provides;
  }
  return 0;
}

/**
 * Get the amount a building consumes of a resource (from BUILDING_CONSUMPTION)
 */
export function getConsumption(buildingType: BuildingType, resource: ResourceType): number {
  const configs = BUILDING_CONSUMPTION[buildingType];
  const config = configs?.find((c) => c.resource === resource);
  return config?.amount ?? 0;
}

/**
 * Get consumer priority for allocation (lower = higher priority)
 */
export function getConsumerPriority(buildingType: BuildingType, resource: ResourceType): number {
  const flow = getResourceFlow(resource);
  return flow?.consumerPriority[buildingType] ?? 999;
}

/**
 * Get all building types that can provide a resource (producers + relays that add capacity)
 */
export function getProviders(resource: ResourceType): BuildingType[] {
  const flow = getResourceFlow(resource);
  if (!flow) return [];

  const providers = [...flow.producers];

  for (const relay of flow.relays) {
    if (relay.addsCapacity) {
      providers.push(relay.type);
    }
  }

  return providers;
}

/**
 * Get all building types that can extend range for a resource (all relays)
 */
export function getRelayTypes(resource: ResourceType): BuildingType[] {
  const flow = getResourceFlow(resource);
  return flow?.relays.map((r) => r.type) ?? [];
}

/**
 * Get resources that a building receives via pipe connections
 * (Used for ghost preview - only check capacity for piped resources)
 */
export function getResourcesReceivedViaPipes(buildingType: BuildingType): ResourceType[] {
  const resources: ResourceType[] = [];

  for (const flow of RESOURCE_FLOWS) {
    if (flow.consumers.includes(buildingType)) {
      resources.push(flow.resource);
    }
  }

  return resources;
}

/**
 * Get pipe color for a resource
 */
export function getPipeColor(resource: ResourceType): string {
  const flow = getResourceFlow(resource);
  return flow?.pipeColor ?? '#FFFFFF';
}

/**
 * Get pipe type for a resource
 */
export function getPipeType(resource: ResourceType): PipeType {
  const flow = getResourceFlow(resource);
  return flow?.pipeType ?? 'water';
}
