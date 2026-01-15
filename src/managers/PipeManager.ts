import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Observer,
  Vector3
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { getTileCenter } from '../grid/GridCoords';
import type { Building, BuildingType } from '../types';
import { BUILDING_CAPACITY, BUILDING_CONSUMPTION } from '../types';
import {
  PIPE_VISUAL_CONFIG,
  MAX_PIPE_DISTANCE,
  BUILDING_REQUIREMENTS
} from '../config/ConnectionRules';
import {
  RESOURCE_FLOWS,
  type ResourceFlowConfig,
  type ResourceType,
  getCapacity,
  getConsumption,
  getResourcesReceivedViaPipes,
  relayAddsCapacity,
  isRelay,
  getPipeType
} from '../config/ResourceFlow';

interface PipeData {
  mesh: Mesh;
  type: 'water' | 'heat';
}

interface PreviewPipe {
  mesh: Mesh;
  type: 'water' | 'heat';
}

const PIPE_CONNECTIONS = PIPE_VISUAL_CONFIG;

export interface BuildingConnection {
  building: Building;
  type: 'water' | 'heat';
  direction: 'outgoing' | 'incoming';
}

// Track which consumer is supplied by which producer for a resource
interface SupplyAllocation {
  consumer: Building;
  producer: Building;
  resource: ResourceType;
  amount: number;
  path: Building[]; // Full path from consumer to producer (includes both endpoints)
}

export { PIPE_CONNECTIONS, MAX_PIPE_DISTANCE };

export class PipeManager {
  private scene: Scene;
  private pipes: Map<string, PipeData> = new Map();
  private previewPipes: PreviewPipe[] = [];
  private materials: Map<string, StandardMaterial> = new Map();
  private previewMaterials: Map<string, StandardMaterial> = new Map();
  private baseColors: Map<string, Color3> = new Map();
  private animationTime = 0;
  private renderObserver: Observer<Scene> | null = null;

  // Capacity-based supply tracking
  // Maps resource type to Set of building IDs that are fully supplied for that resource
  private suppliedBuildings: Map<string, Set<string>> = new Map();
  // Detailed allocation info for pipe visualization
  private supplyAllocations: SupplyAllocation[] = [];

  constructor(scene: Scene) {
    this.scene = scene;

    this.createMaterial('water', '#2F8D8D');
    this.createMaterial('heat', '#FF6B35');
    this.createPreviewMaterial('water', '#2F8D8D');
    this.createPreviewMaterial('heat', '#FF6B35');

    gameState.on('buildingPlaced', () => this.rebuildPipes());
    gameState.on('buildingRemoved', () => this.rebuildPipes());

    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.animatePipes();
    });
  }

  private createMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_${name}`, this.scene);
    const c = this.hexToColor3(color);
    material.diffuseColor = c;
    material.emissiveColor = c.scale(0.3);
    material.alpha = 0.8;
    this.materials.set(name, material);
    this.baseColors.set(name, c);
  }

  private createPreviewMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_preview_${name}`, this.scene);
    const c = this.hexToColor3(color);
    material.diffuseColor = c.scale(0.6);
    material.emissiveColor = c.scale(0.4);
    material.alpha = 0.4;
    this.previewMaterials.set(name, material);
  }

  private hexToColor3(hex: string): Color3 {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Color3(1, 1, 1);
    return new Color3(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    );
  }

  private animatePipes(): void {
    this.animationTime += this.scene.getEngine().getDeltaTime() / 1000;

    const waterPulse = (Math.sin(this.animationTime * Math.PI) + 1) / 2;
    const heatPulse = (Math.sin(this.animationTime * Math.PI * 1.5) + 1) / 2;

    const waterMat = this.materials.get('water');
    const heatMat = this.materials.get('heat');
    const waterBase = this.baseColors.get('water');
    const heatBase = this.baseColors.get('heat');

    if (waterMat && waterBase) {
      const minGlow = 0.2;
      const maxGlow = 0.6;
      const glow = minGlow + (maxGlow - minGlow) * waterPulse;
      waterMat.emissiveColor = waterBase.scale(glow);
    }

    if (heatMat && heatBase) {
      const minGlow = 0.3;
      const maxGlow = 0.8;
      const glow = minGlow + (maxGlow - minGlow) * heatPulse;
      heatMat.emissiveColor = heatBase.scale(glow);
    }
  }

  public update(): void {}

  public showConnectionPreview(buildingType: BuildingType, gridX: number, gridZ: number): void {
    this.hideConnectionPreview();

    const buildings = gameState.getBuildings();
    const hoverPos = getTileCenter(gridX, gridZ);
    hoverPos.y = 0.3;

    // Show outgoing connections (from the building being placed to existing buildings)
    // Only show if the building being placed would have capacity
    const connections = PIPE_CONNECTIONS[buildingType];
    if (connections && connections.length > 0) {
      const capacityConfig = BUILDING_CAPACITY[buildingType];

      for (const connRule of connections) {
        const targets = buildings.filter((b) => {
          if (!connRule.targets.includes(b.type)) return false;
          const dx = gridX - b.gridX;
          const dz = gridZ - b.gridZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });

        // For producers, check capacity and only show connections to buildings that would be supplied
        if (capacityConfig) {
          const sortedTargets = [...targets].sort((a, b) => {
            const distA = Math.sqrt((gridX - a.gridX) ** 2 + (gridZ - a.gridZ) ** 2);
            const distB = Math.sqrt((gridX - b.gridX) ** 2 + (gridZ - b.gridZ) ** 2);
            return distA - distB;
          });

          let remainingCapacity = capacityConfig.provides;
          for (const target of sortedTargets) {
            const consumptionConfig = BUILDING_CONSUMPTION[target.type]?.find(
              (c) => c.resource === capacityConfig.resource
            );
            if (consumptionConfig && remainingCapacity >= consumptionConfig.amount) {
              this.createPreviewPipe(hoverPos, target, connRule.type);
              remainingCapacity -= consumptionConfig.amount;
            }
          }
        } else {
          // Non-producers (like water_tank) show all potential connections
          for (const target of targets) {
            this.createPreviewPipe(hoverPos, target, connRule.type);
          }
        }
      }
    }

    // Show incoming connections (from existing buildings to the building being placed)
    // Check both direct connections and relay chain connections
    const virtualBuilding: Building = {
      id: 'preview_building',
      type: buildingType,
      gridX,
      gridZ
    };

    // Get resources this building type consumes via pipes
    const resourcesViaPipes = getResourcesReceivedViaPipes(buildingType);

    for (const resource of resourcesViaPipes) {
      const flow = RESOURCE_FLOWS.find((f) => f.resource === resource);
      if (!flow) continue;

      const pipeType = flow.pipeType;

      // Get producers and relays for this resource
      const producers = buildings.filter((b) => flow.producers.includes(b.type));
      const relayTypes = flow.relays.map((r) => r.type);
      const relays = buildings.filter((b) => relayTypes.includes(b.type));
      const activeRelays = this.getActiveRelays(producers, relays);

      // Get all providers (producers + active relays that add capacity)
      const allProviders: Building[] = [...producers];
      for (const relay of activeRelays) {
        if (relayAddsCapacity(relay.type, resource)) {
          allProviders.push(relay);
        }
      }

      // Find the path to the nearest provider with capacity
      const neededAmount = getConsumption(buildingType, resource);
      let foundConnection = false;

      for (const provider of allProviders) {
        // Check if provider has remaining capacity
        const capacity = getCapacity(provider.type, resource);
        const allocatedAmount = this.supplyAllocations
          .filter((a) => a.producer.id === provider.id && a.resource === resource)
          .reduce((sum, a) => sum + a.amount, 0);
        const remainingCapacity = capacity - allocatedAmount;

        if (remainingCapacity < neededAmount) continue;

        // Find path to this provider
        const path = this.findPathToProvider(virtualBuilding, provider, activeRelays);
        if (path && path.length >= 2) {
          // Draw preview pipes for each hop in the path
          for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];

            // For the first hop (from virtual building), use hoverPos
            if (i === 0) {
              this.createPreviewPipe(hoverPos, to, pipeType, true);
            } else {
              // For intermediate hops, create pipe between buildings
              const fromPos = getTileCenter(from.gridX, from.gridZ);
              fromPos.y = 0.3;
              this.createPreviewPipe(fromPos, to, pipeType, true);
            }
          }
          foundConnection = true;
          break; // Only show one path per resource
        }
      }

      // Fallback: show direct connections using PIPE_CONNECTIONS (for non-resource connections)
      if (!foundConnection) {
        for (const [sourceType, rules] of Object.entries(PIPE_CONNECTIONS)) {
          for (const rule of rules) {
            if (!rule.targets.includes(buildingType)) continue;
            if (rule.type !== pipeType) continue;

            const sources = buildings.filter((b) => {
              if (b.type !== sourceType) return false;
              const dx = gridX - b.gridX;
              const dz = gridZ - b.gridZ;
              const dist = Math.sqrt(dx * dx + dz * dz);
              return dist > 0 && dist <= MAX_PIPE_DISTANCE;
            });

            for (const source of sources) {
              if (this.hasRemainingCapacityFor(source, buildingType)) {
                this.createPreviewPipe(hoverPos, source, rule.type, true);
              }
            }
          }
        }
      }
    }

    // Also show direct connections for non-piped resources (backwards compatibility)
    for (const [sourceType, rules] of Object.entries(PIPE_CONNECTIONS)) {
      for (const rule of rules) {
        if (!rule.targets.includes(buildingType)) continue;

        // Skip if we already handled this via resource flow
        const isResourcePipe = resourcesViaPipes.some((r) => {
          const flow = RESOURCE_FLOWS.find((f) => f.resource === r);
          return flow?.pipeType === rule.type;
        });
        if (isResourcePipe) continue;

        const sources = buildings.filter((b) => {
          if (b.type !== sourceType) return false;
          const dx = gridX - b.gridX;
          const dz = gridZ - b.gridZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });

        for (const source of sources) {
          if (this.hasRemainingCapacityFor(source, buildingType)) {
            this.createPreviewPipe(hoverPos, source, rule.type, true);
          }
        }
      }
    }
  }

  /**
   * Check if a producer building has remaining capacity to supply a new consumer type
   */
  private hasRemainingCapacityFor(producer: Building, consumerType: BuildingType): boolean {
    const capacityConfig = BUILDING_CAPACITY[producer.type];
    if (!capacityConfig) return true; // Non-producers always "connect"

    const resource = capacityConfig.resource;

    // For relay buildings, check if they're active (connected to source)
    if (isRelay(producer.type, resource)) {
      const buildings = gameState.getBuildings();
      const flow = RESOURCE_FLOWS.find((f) => f.resource === resource);
      if (flow) {
        const producers = buildings.filter((b) => flow.producers.includes(b.type));
        const relayTypes = flow.relays.map((r) => r.type);
        const relays = buildings.filter((b) => relayTypes.includes(b.type));
        const activeRelays = this.getActiveRelays(producers, relays);
        if (!activeRelays.some((r) => r.id === producer.id)) {
          return false; // This relay is not connected to producer chain
        }
      }
    }

    // Check if the consumer needs this resource via pipes
    const resourcesViaPipes = getResourcesReceivedViaPipes(consumerType);
    if (!resourcesViaPipes.includes(resource)) {
      return true; // Consumer doesn't need this resource via pipes
    }

    // Get consumption amount for this consumer type
    const neededAmount = getConsumption(consumerType, resource);
    if (neededAmount === 0) return true;

    // Calculate remaining capacity
    const allocatedAmount = this.supplyAllocations
      .filter((a) => a.producer.id === producer.id && a.resource === resource)
      .reduce((sum, a) => sum + a.amount, 0);

    const remainingCapacity = capacityConfig.provides - allocatedAmount;

    return remainingCapacity >= neededAmount;
  }

  public hideConnectionPreview(): void {
    for (const preview of this.previewPipes) {
      preview.mesh.dispose();
    }
    this.previewPipes = [];
  }

  private createPreviewPipe(
    hoverPos: { x: number; y: number; z: number },
    target: Building,
    type: 'water' | 'heat',
    incoming = false
  ): void {
    const targetPos = getTileCenter(target.gridX, target.gridZ);
    targetPos.y = 0.3;

    const startPos = incoming ? targetPos : hoverPos;
    const endPos = incoming ? hoverPos : targetPos;

    const direction = new Vector3(
      endPos.x - startPos.x,
      endPos.y - startPos.y,
      endPos.z - startPos.z
    );
    const length = direction.length();

    const segmentLength = 0.3;
    const gapLength = 0.2;
    const totalSegmentLength = segmentLength + gapLength;
    const numSegments = Math.floor(length / totalSegmentLength);

    for (let i = 0; i < numSegments; i++) {
      const t = (i * totalSegmentLength + segmentLength / 2) / length;
      const segmentCenter = new Vector3(
        startPos.x + direction.x * t,
        startPos.y + direction.y * t,
        startPos.z + direction.z * t
      );

      const pipe = MeshBuilder.CreateCylinder(
        `preview_pipe_${this.previewPipes.length}`,
        {
          height: segmentLength,
          diameter: 0.12,
          tessellation: 6
        },
        this.scene
      );

      pipe.position = segmentCenter;

      const angle = Math.atan2(direction.x, direction.z);
      pipe.rotation.x = Math.PI / 2;
      pipe.rotation.z = -angle;

      pipe.material = this.previewMaterials.get(type) ?? null;

      this.previewPipes.push({ mesh: pipe, type });
    }
  }

  public rebuildPipes(): void {
    // Clear existing pipes
    for (const pipeData of this.pipes.values()) {
      pipeData.mesh.dispose();
    }
    this.pipes.clear();

    // Reset supply tracking
    this.suppliedBuildings.clear();
    this.supplyAllocations = [];

    const buildings = gameState.getBuildings();

    // Allocate capacity for each resource flow using centralized config
    for (const flow of RESOURCE_FLOWS) {
      this.allocateResourceCapacity(buildings, flow);
    }

    // Create pipes based on allocations
    // Draw pipes for each hop in the path (consumer → relay → relay → producer)
    const drawnPipes = new Set<string>(); // Avoid duplicate pipes

    for (const allocation of this.supplyAllocations) {
      const pipeType = getPipeType(allocation.resource);
      const path = allocation.path;

      // Create pipe for each segment in the path
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        // Create unique key for this pipe segment (order-independent)
        const pipeKey = [from.id, to.id].sort().join('_') + '_' + pipeType;
        if (drawnPipes.has(pipeKey)) continue;
        drawnPipes.add(pipeKey);

        this.createPipe(from, to, pipeType);
      }
    }

    // Draw relay chain infrastructure (producer → relay → relay connections)
    // This ensures we visualize the full relay network, not just consumer paths
    for (const flow of RESOURCE_FLOWS) {
      if (flow.relays.length === 0) continue;

      const pipeType = flow.pipeType;
      const producers = buildings.filter((b) => flow.producers.includes(b.type));
      const relayTypes = flow.relays.map((r) => r.type);
      const relays = buildings.filter((b) => relayTypes.includes(b.type));

      if (relays.length === 0) continue;

      // BFS from producers to find and draw relay chain connections
      const visited = new Set<string>();
      const queue: Building[] = [...producers];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        // Find relays within range and draw pipes to them
        for (const relay of relays) {
          const dist = this.getDistance(current, relay);
          if (dist > 0 && dist <= MAX_PIPE_DISTANCE) {
            // Draw pipe from current to relay
            const pipeKey = [current.id, relay.id].sort().join('_') + '_' + pipeType;
            if (!drawnPipes.has(pipeKey)) {
              drawnPipes.add(pipeKey);
              this.createPipe(current, relay, pipeType);
            }

            // Add relay to queue to continue chain
            if (!visited.has(relay.id)) {
              queue.push(relay);
            }
          }
        }
      }
    }
  }

  /**
   * Generic resource capacity allocation using centralized config.
   * Handles producers, relays (with or without capacity), and consumers.
   */
  private allocateResourceCapacity(buildings: readonly Building[], flow: ResourceFlowConfig): void {
    const resource = flow.resource;

    // Get producers (buildings that create this resource)
    const producers = buildings.filter((b) => flow.producers.includes(b.type));

    // Get relay types and find relay buildings
    const relayTypes = flow.relays.map((r) => r.type);
    const relays = buildings.filter((b) => relayTypes.includes(b.type));

    // Get consumers (buildings that need this resource)
    const consumers = buildings.filter((b) => flow.consumers.includes(b.type));

    if (consumers.length === 0) return;
    if (producers.length === 0 && relays.length === 0) return;

    // Initialize supplied set for this resource
    if (!this.suppliedBuildings.has(resource)) {
      this.suppliedBuildings.set(resource, new Set());
    }
    const suppliedSet = this.suppliedBuildings.get(resource)!;

    // Find active relays (connected to producers via chain)
    const activeRelays = this.getActiveRelays(producers, relays);

    // Build capacity map for all providers
    // Providers = producers + relays that add capacity (and are active)
    const providerCapacity = new Map<string, number>();
    const allProviders: Building[] = [];

    // Add producers
    for (const producer of producers) {
      const capacity = getCapacity(producer.type, resource);
      if (capacity > 0) {
        providerCapacity.set(producer.id, capacity);
        allProviders.push(producer);
      }
    }

    // Add active relays that add capacity
    for (const relay of activeRelays) {
      if (relayAddsCapacity(relay.type, resource)) {
        const capacity = getCapacity(relay.type, resource);
        if (capacity > 0) {
          providerCapacity.set(relay.id, capacity);
          allProviders.push(relay);
        }
      }
    }

    // For relays that DON'T add capacity (just extend range), consumers can connect
    // to them but capacity comes from the original producer.
    // We need to handle this case: consumer → relay → relay → producer
    // The relay acts as a "bridge" - consumer connects to relay, relay connects to producer

    if (allProviders.length === 0) return;

    // Sort consumers by priority, then by distance to nearest provider
    const sortedConsumers = [...consumers].sort((a, b) => {
      const priorityA = flow.consumerPriority[a.type] ?? 999;
      const priorityB = flow.consumerPriority[b.type] ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Same priority, sort by distance to nearest provider
      const distA = Math.min(...allProviders.map((p) => this.getDistance(a, p)));
      const distB = Math.min(...allProviders.map((p) => this.getDistance(b, p)));
      return distA - distB;
    });

    // Allocate capacity to consumers
    for (const consumer of sortedConsumers) {
      const neededAmount = getConsumption(consumer.type, resource);
      if (neededAmount === 0) continue;

      // Find provider with available capacity that consumer can reach
      // Consumer can reach provider directly OR via relay chain
      // We need the path for pipe visualization
      const reachableProviderPaths: Array<{ provider: Building; path: Building[] }> = [];

      for (const p of allProviders) {
        const remaining = providerCapacity.get(p.id) ?? 0;
        if (remaining < neededAmount) continue;

        // Find path to this provider (directly or via relays)
        const path = this.findPathToProvider(consumer, p, activeRelays);
        if (path) {
          reachableProviderPaths.push({ provider: p, path });
        }
      }

      if (reachableProviderPaths.length === 0) continue;

      // Sort by path length (shortest path first), then by distance
      reachableProviderPaths.sort((a, b) => {
        if (a.path.length !== b.path.length) return a.path.length - b.path.length;
        return this.getDistance(consumer, a.provider) - this.getDistance(consumer, b.provider);
      });

      const { provider, path } = reachableProviderPaths[0];
      const remaining = providerCapacity.get(provider.id) ?? 0;
      providerCapacity.set(provider.id, remaining - neededAmount);

      suppliedSet.add(consumer.id);
      this.supplyAllocations.push({
        consumer,
        producer: provider,
        resource,
        amount: neededAmount,
        path
      });
    }
  }

  /**
   * Find relays that are connected to producers (directly or via other relays).
   * Uses BFS to find all reachable relays from producers.
   */
  private getActiveRelays(producers: readonly Building[], relays: readonly Building[]): Building[] {
    if (producers.length === 0 || relays.length === 0) return [];

    const activeRelayIds = new Set<string>();
    const queue: Building[] = [...producers];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Find relays within range of current building
      for (const relay of relays) {
        if (activeRelayIds.has(relay.id)) continue;

        const dist = this.getDistance(current, relay);
        if (dist > 0 && dist <= MAX_PIPE_DISTANCE) {
          activeRelayIds.add(relay.id);
          queue.push(relay); // Continue BFS from this relay
        }
      }
    }

    return relays.filter((r) => activeRelayIds.has(r.id));
  }

  /**
   * Check if a consumer can reach a provider (directly or via relay chain).
   */
  private canReach(
    consumer: Building,
    provider: Building,
    activeRelays: readonly Building[]
  ): boolean {
    // Direct connection
    const directDist = this.getDistance(consumer, provider);
    if (directDist > 0 && directDist <= MAX_PIPE_DISTANCE) {
      return true;
    }

    // Check via relay chain using BFS
    const visited = new Set<string>();
    const queue: Building[] = [consumer];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Check if we can reach the provider from current position
      const distToProvider = this.getDistance(current, provider);
      if (distToProvider > 0 && distToProvider <= MAX_PIPE_DISTANCE) {
        return true;
      }

      // Add reachable relays to queue
      for (const relay of activeRelays) {
        if (visited.has(relay.id)) continue;
        const distToRelay = this.getDistance(current, relay);
        if (distToRelay > 0 && distToRelay <= MAX_PIPE_DISTANCE) {
          queue.push(relay);
        }
      }
    }

    return false;
  }

  /**
   * Find path from consumer to provider via relay chain.
   * Returns the full path [consumer, relay1, relay2, ..., provider] or null if unreachable.
   */
  private findPathToProvider(
    consumer: Building,
    provider: Building,
    activeRelays: readonly Building[]
  ): Building[] | null {
    // Direct connection - path is just [consumer, provider]
    const directDist = this.getDistance(consumer, provider);
    if (directDist > 0 && directDist <= MAX_PIPE_DISTANCE) {
      return [consumer, provider];
    }

    // BFS to find shortest path via relay chain
    const visited = new Set<string>();
    // Queue stores [building, path from consumer to this building]
    const queue: Array<{ building: Building; path: Building[] }> = [
      { building: consumer, path: [consumer] }
    ];

    while (queue.length > 0) {
      const { building: current, path } = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Check if we can reach the provider from current position
      const distToProvider = this.getDistance(current, provider);
      if (distToProvider > 0 && distToProvider <= MAX_PIPE_DISTANCE) {
        return [...path, provider];
      }

      // Add reachable relays to queue
      for (const relay of activeRelays) {
        if (visited.has(relay.id)) continue;
        const distToRelay = this.getDistance(current, relay);
        if (distToRelay > 0 && distToRelay <= MAX_PIPE_DISTANCE) {
          queue.push({ building: relay, path: [...path, relay] });
        }
      }
    }

    return null;
  }

  /**
   * Check if a building is supplied with a specific resource
   */
  public isSuppliedWith(building: Building, resource: ResourceType): boolean {
    const suppliedSet = this.suppliedBuildings.get(resource);
    return suppliedSet?.has(building.id) ?? false;
  }

  /**
   * Check if a building is fully supplied with all required resources
   */
  public isSupplied(building: Building): boolean {
    // Get resources this building receives via pipes (from centralized config)
    const resourcesViaPipes = getResourcesReceivedViaPipes(building.type);

    if (resourcesViaPipes.length === 0) {
      return true; // Buildings with no pipe requirements are always "supplied"
    }

    for (const resource of resourcesViaPipes) {
      if (!this.isSuppliedWith(building, resource)) {
        return false;
      }
    }
    return true;
  }

  private getDistance(a: Building, b: Building): number {
    const dx = a.gridX - b.gridX;
    const dz = a.gridZ - b.gridZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private createPipe(from: Building, to: Building, type: 'water' | 'heat'): void {
    const pipeId = `pipe_${from.id}_${to.id}`;

    if (this.pipes.has(pipeId) || this.pipes.has(`pipe_${to.id}_${from.id}`)) {
      return;
    }

    const startPos = getTileCenter(from.gridX, from.gridZ);
    const endPos = getTileCenter(to.gridX, to.gridZ);

    startPos.y = 0.3;
    endPos.y = 0.3;

    const direction = endPos.subtract(startPos);
    const length = direction.length();
    const center = startPos.add(direction.scale(0.5));

    const pipe = MeshBuilder.CreateCylinder(
      pipeId,
      {
        height: length,
        diameter: 0.15,
        tessellation: 8
      },
      this.scene
    );

    pipe.position = center;

    const angle = Math.atan2(direction.x, direction.z);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.z = -angle;

    pipe.material = this.materials.get(type) ?? null;

    this.pipes.set(pipeId, { mesh: pipe, type });
  }

  public getConnectionsForBuilding(building: Building): BuildingConnection[] {
    const connections: BuildingConnection[] = [];
    const buildings = gameState.getBuildings();

    // Check outgoing connections based on supply allocations
    const outgoingAllocations = this.supplyAllocations.filter((a) => a.producer.id === building.id);
    for (const allocation of outgoingAllocations) {
      const pipeType = allocation.resource === 'heat' ? 'heat' : 'water';
      connections.push({
        building: allocation.consumer,
        type: pipeType,
        direction: 'outgoing'
      });
    }

    // Check incoming connections based on supply allocations
    const incomingAllocations = this.supplyAllocations.filter((a) => a.consumer.id === building.id);
    for (const allocation of incomingAllocations) {
      const pipeType = allocation.resource === 'heat' ? 'heat' : 'water';
      connections.push({
        building: allocation.producer,
        type: pipeType,
        direction: 'incoming'
      });
    }

    // For virtual buildings (preview), use proximity-based logic
    if (building.id === 'virtual_preview') {
      const outgoingRules = PIPE_CONNECTIONS[building.type];
      if (outgoingRules) {
        for (const rule of outgoingRules) {
          const targets = buildings.filter((b) => {
            if (!rule.targets.includes(b.type)) return false;
            const dist = this.getDistance(building, b);
            return dist > 0 && dist <= MAX_PIPE_DISTANCE;
          });
          for (const target of targets) {
            connections.push({
              building: target,
              type: rule.type,
              direction: 'outgoing'
            });
          }
        }
      }

      for (const [sourceType, rules] of Object.entries(PIPE_CONNECTIONS)) {
        for (const rule of rules) {
          if (!rule.targets.includes(building.type)) continue;

          const sources = buildings.filter((b) => {
            if (b.type !== sourceType) return false;
            const dist = this.getDistance(building, b);
            return dist > 0 && dist <= MAX_PIPE_DISTANCE;
          });

          for (const source of sources) {
            connections.push({
              building: source,
              type: rule.type,
              direction: 'incoming'
            });
          }
        }
      }
    }

    return connections;
  }

  public isConnectedToReactor(building: Building): boolean {
    const connections = this.getConnectionsForBuilding(building);
    return connections.some((c) => c.building.type === 'reactor' && c.direction === 'incoming');
  }

  /**
   * Check if a water_tank has a valid supply chain back to a primary water source
   * (pump for seawater, distiller for freshwater)
   */
  private hasWaterSupplyChain(tank: Building, visited: Set<string> = new Set()): boolean {
    if (visited.has(tank.id)) return false; // Prevent infinite loops
    visited.add(tank.id);

    const connections = this.getConnectionsForBuilding(tank);
    const incomingWater = connections.filter(
      (c) => c.direction === 'incoming' && c.type === 'water'
    );

    for (const conn of incomingWater) {
      // Primary sources - direct supply
      if (conn.building.type === 'pump' || conn.building.type === 'distiller') {
        return true;
      }
      // Relay through another tank - recursive check
      if (conn.building.type === 'water_tank') {
        if (this.hasWaterSupplyChain(conn.building, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  public isFullyOperational(building: Building): boolean {
    // First check capacity-based supply for buildings that consume resources
    const consumptionConfigs = BUILDING_CONSUMPTION[building.type];
    if (consumptionConfigs && consumptionConfigs.length > 0) {
      // Use capacity-based supply tracking
      return this.isSupplied(building);
    }

    // For buildings without consumption configs (pumps, reactors, etc.)
    // use the original connection-based logic
    const requirements = BUILDING_REQUIREMENTS[building.type];
    if (!requirements || requirements.requiredInputs.length === 0) {
      return true;
    }

    const connections = this.getConnectionsForBuilding(building);
    const incomingConnections = connections.filter((c) => c.direction === 'incoming');

    // Group requirements by resourceType - need at least ONE provider for each resourceType
    const resourceTypes = new Set(requirements.requiredInputs.map((r) => r.resourceType));

    for (const resourceType of resourceTypes) {
      // Get all building types that can provide this resource
      const providers = requirements.requiredInputs
        .filter((r) => r.resourceType === resourceType)
        .map((r) => r.type);

      let hasProvider = false;

      // Check direct connections
      for (const conn of incomingConnections) {
        if (conn.type !== resourceType) continue;

        // Direct connection from a primary source
        if (providers.includes(conn.building.type) && conn.building.type !== 'water_tank') {
          hasProvider = true;
          break;
        }

        // Water tank relay - check if tank has valid supply chain
        if (conn.building.type === 'water_tank' && resourceType === 'water') {
          if (this.hasWaterSupplyChain(conn.building)) {
            hasProvider = true;
            break;
          }
        }
      }

      if (!hasProvider) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a hypothetical building at the given position would be operational
   * (have all required connections) without actually placing it.
   */
  public wouldBeOperational(buildingType: BuildingType, gridX: number, gridZ: number): boolean {
    // Check consumption requirements for capacity-based supply
    const consumptionConfigs = BUILDING_CONSUMPTION[buildingType];
    if (consumptionConfigs && consumptionConfigs.length > 0) {
      // Check if there would be capacity available for each required resource
      return this.wouldHaveCapacity(buildingType, gridX, gridZ);
    }

    // For buildings without consumption configs, use connection-based logic
    const requirements = BUILDING_REQUIREMENTS[buildingType];
    if (!requirements || requirements.requiredInputs.length === 0) {
      return true;
    }

    // Create a virtual building to check connections
    const virtualBuilding: Building = {
      id: 'virtual_preview',
      type: buildingType,
      gridX,
      gridZ
    };

    const connections = this.getConnectionsForBuilding(virtualBuilding);
    const incomingConnections = connections.filter((c) => c.direction === 'incoming');

    // Group requirements by resourceType - need at least ONE provider for each resourceType
    const resourceTypes = new Set(requirements.requiredInputs.map((r) => r.resourceType));

    for (const resourceType of resourceTypes) {
      const providers = requirements.requiredInputs
        .filter((r) => r.resourceType === resourceType)
        .map((r) => r.type);

      let hasProvider = false;

      for (const conn of incomingConnections) {
        if (conn.type !== resourceType) continue;

        // Direct connection from a primary source
        if (providers.includes(conn.building.type) && conn.building.type !== 'water_tank') {
          hasProvider = true;
          break;
        }

        // Water tank relay - check if tank has valid supply chain
        if (conn.building.type === 'water_tank' && resourceType === 'water') {
          if (this.hasWaterSupplyChain(conn.building)) {
            hasProvider = true;
            break;
          }
        }
      }

      if (!hasProvider) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a hypothetical building at the given location would have capacity
   * from producers for all required resources
   */
  private wouldHaveCapacity(buildingType: BuildingType, gridX: number, gridZ: number): boolean {
    // Get resources this building receives via pipes (from centralized config)
    const resourcesViaPipes = getResourcesReceivedViaPipes(buildingType);

    if (resourcesViaPipes.length === 0) return true;

    const buildings = gameState.getBuildings();
    const virtualBuilding: Building = {
      id: 'virtual_preview',
      type: buildingType,
      gridX,
      gridZ
    };

    for (const resource of resourcesViaPipes) {
      const neededAmount = getConsumption(buildingType, resource);
      if (neededAmount === 0) continue;

      const hasCapacity = this.wouldHaveCapacityForResource(
        virtualBuilding,
        resource,
        neededAmount,
        buildings
      );
      if (!hasCapacity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if there's remaining capacity for a specific resource at a location
   */
  private wouldHaveCapacityForResource(
    virtualBuilding: Building,
    resource: ResourceType,
    neededAmount: number,
    buildings: readonly Building[]
  ): boolean {
    // Get flow config for this resource
    const flow = RESOURCE_FLOWS.find((f) => f.resource === resource);
    if (!flow) return false;

    // Get producers
    const producers = buildings.filter((b) => flow.producers.includes(b.type));

    // Get active relays that add capacity
    const relayTypes = flow.relays.map((r) => r.type);
    const relays = buildings.filter((b) => relayTypes.includes(b.type));
    const activeRelays = this.getActiveRelays(producers, relays);

    // Build list of all providers (producers + active relays that add capacity)
    const allProviders: Building[] = [...producers];
    for (const relay of activeRelays) {
      if (relayAddsCapacity(relay.type, resource)) {
        allProviders.push(relay);
      }
    }

    // Check if virtual building can reach any provider (directly or via relay chain)
    const reachableProviders = allProviders.filter((p) =>
      this.canReach(virtualBuilding, p, activeRelays)
    );

    if (reachableProviders.length === 0) return false;

    // Check if any reachable provider has capacity
    for (const provider of reachableProviders) {
      const capacity = getCapacity(provider.type, resource);
      if (capacity === 0) continue;

      // Subtract already allocated capacity
      const allocatedAmount = this.supplyAllocations
        .filter((a) => a.producer.id === provider.id && a.resource === resource)
        .reduce((sum, a) => sum + a.amount, 0);

      const remainingCapacity = capacity - allocatedAmount;

      if (remainingCapacity >= neededAmount) {
        return true;
      }
    }

    return false;
  }

  public getMissingConnections(
    building: Building
  ): { type: BuildingType; resourceType: 'water' | 'heat' }[] {
    const requirements = BUILDING_REQUIREMENTS[building.type];
    if (!requirements || requirements.requiredInputs.length === 0) {
      return [];
    }

    const connections = this.getConnectionsForBuilding(building);
    const incomingConnections = connections.filter((c) => c.direction === 'incoming');
    const missing: { type: BuildingType; resourceType: 'water' | 'heat' }[] = [];

    // Group requirements by resourceType
    const resourceTypes = new Set(requirements.requiredInputs.map((r) => r.resourceType));

    for (const resourceType of resourceTypes) {
      // Get all building types that can provide this resource
      const providers = requirements.requiredInputs
        .filter((r) => r.resourceType === resourceType)
        .map((r) => r.type);

      let hasProvider = false;

      // Check direct connections and relay chains
      for (const conn of incomingConnections) {
        if (conn.type !== resourceType) continue;

        // Direct connection from a primary source
        if (providers.includes(conn.building.type) && conn.building.type !== 'water_tank') {
          hasProvider = true;
          break;
        }

        // Water tank relay - check if tank has valid supply chain
        if (conn.building.type === 'water_tank' && resourceType === 'water') {
          if (this.hasWaterSupplyChain(conn.building)) {
            hasProvider = true;
            break;
          }
        }
      }

      if (!hasProvider) {
        // Return the first provider type as the missing one (for display purposes)
        missing.push({ type: providers[0], resourceType });
      }
    }

    return missing;
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
    }
    this.hideConnectionPreview();
    for (const pipeData of this.pipes.values()) {
      pipeData.mesh.dispose();
    }
    this.pipes.clear();
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
    for (const mat of this.previewMaterials.values()) {
      mat.dispose();
    }
    this.previewMaterials.clear();
  }
}
