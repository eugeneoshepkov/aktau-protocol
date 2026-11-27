import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { getTileCenter } from '../grid/GridCoords';
import type { Building, BuildingType } from '../types';
import { BUILDING_CONSUMPTION } from '../types';
import {
  PIPE_VISUAL_CONFIG,
  MAX_PIPE_DISTANCE,
  BUILDING_REQUIREMENTS
} from '../config/ConnectionRules';
import {
  RESOURCE_FLOWS,
  type PipeType,
  type ResourceFlowConfig,
  type ResourceType,
  getCapacity,
  getConsumption,
  getResourcesReceivedViaPipes,
  relayAddsCapacity,
  getPipeType
} from '../config/ResourceFlow';

interface PlacementRoute {
  flow: ResourceFlowConfig;
  endpoints: Building[];
  input?: { providers: Building[]; activeRelays: Building[] };
}

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

export interface PlacementFlowSummary {
  routes: { resource: ResourceType; points: Vector3[] }[];
  missing: PipeType[];
  restored: { building: Building; resources: ResourceType[]; missing: PipeType[] }[];
}

type SupplySnapshot = ReadonlyMap<string, readonly ResourceType[]>;

function pipeEndpoint(building: Building, type: PipeType): Vector3 {
  const point = getTileCenter(building.gridX, building.gridZ);
  point.y = type === 'heat' ? 0.42 : 0.3;
  return point;
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
  private lotRoutes = new Map<BuildingType, PlacementRoute[]>();
  private materials: Map<string, StandardMaterial> = new Map();
  private previewMaterials: Map<string, StandardMaterial> = new Map();
  private visibleLayers = { water: false, heat: false };

  // Capacity-based supply tracking
  // Maps resource type to Set of building IDs that are fully supplied for that resource
  private suppliedBuildings: Map<string, Set<string>> = new Map();
  // Detailed allocation info for pipe visualization
  private supplyAllocations: SupplyAllocation[] = [];
  // A tank can be primed by separate seawater and drinking-water networks.
  private relayFeeds = new Map<ResourceType, Map<string, { upstream: Building; relay: Building }>>();

  constructor(scene: Scene) {
    this.scene = scene;

    this.createMaterial('water', '#2F8D8D');
    this.createMaterial('heat', '#FF6B35');
    this.createPreviewMaterial('water', '#137aa7');
    this.createPreviewMaterial('heat', '#db5725');

    gameState.on('buildingPlaced', () => this.rebuildPipes());
    gameState.on('buildingRemoved', () => this.rebuildPipes());

  }

  public setVisibleLayers(water: boolean, heat: boolean): void {
    this.visibleLayers = { water, heat };
    for (const { mesh, type } of this.pipes.values()) mesh.setEnabled(this.visibleLayers[type]);
  }

  private createMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_${name}`, this.scene);
    const c = Color3.FromHexString(color);
    material.diffuseColor = c;
    material.emissiveColor = c.scale(0.16);
    material.specularColor = Color3.Black();
    this.materials.set(name, material);
  }

  private createPreviewMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_preview_${name}`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.FromHexString(color);
    this.previewMaterials.set(name, material);
  }

  // Each endpoint can accept a direct pipe from the lot. For consumers this includes
  // relay chains ending at a provider with enough unallocated capacity.
  private placementRoutes(type: BuildingType): PlacementRoute[] {
    const cached = this.lotRoutes.get(type);
    if (cached) return cached;
    const buildings = gameState.getBuildings();
    const routes: PlacementRoute[] = [];
    for (const flow of RESOURCE_FLOWS) {
      const { resource, consumers, relays } = flow;
      const isFlowRelay = (b: Building) => relays.some((relay) => relay.type === b.type);
      if (flow.producers.includes(type)) {
        routes.push({ flow, endpoints: buildings.filter((b) => consumers.includes(b.type) || isFlowRelay(b)) });
        continue;
      }
      const relayLot = relays.some((relay) => relay.type === type);
      if (!consumers.includes(type) && !relayLot) continue;
      const producers = this.getProducers(buildings, flow);
      const activeRelays = this.getActiveRelays(producers, buildings.filter(isFlowRelay));
      if (relayLot) {
        routes.push({ flow, endpoints: [...producers, ...activeRelays] });
        continue;
      }
      const providers = [...producers, ...activeRelays.filter((b) => relayAddsCapacity(b.type, resource))]
        .filter((b) => {
          const used = this.supplyAllocations.reduce((amount, a) =>
            a.producer.id === b.id && a.resource === resource ? amount + a.amount : amount, 0);
          return getCapacity(b.type, resource) - used >= getConsumption(type, resource);
        });
      const endpoints = [...new Set([...providers, ...this.getActiveRelays(providers, activeRelays)])];
      routes.push({ flow, endpoints, input: { providers, activeRelays } });
    }
    this.lotRoutes.set(type, routes);
    return routes;
  }

  public getLotConnections(type: BuildingType, x: number, z: number): { water: boolean; heat: boolean } {
    const connections = { water: false, heat: false };
    for (const { flow, endpoints } of this.placementRoutes(type)) {
      // A nearby home is an outlet for a distiller, not its seawater supply.
      if (BUILDING_CONSUMPTION[type] && !flow.consumers.includes(type)) continue;
      if (endpoints.some((b) => (x - b.gridX) ** 2 + (z - b.gridZ) ** 2 <= MAX_PIPE_DISTANCE ** 2)) {
        connections[flow.pipeType] = true;
      }
    }
    return connections;
  }

  public isSuitableLot(type: BuildingType, x: number, z: number): boolean {
    const connections = this.getLotConnections(type, x, z);
    const inputs = BUILDING_CONSUMPTION[type];
    return inputs
      ? inputs.every(({ resource }) => connections[getPipeType(resource)])
      : connections.water || connections.heat;
  }

  public showConnectionPreview(type: BuildingType, x: number, z: number): Vector3[] {
    this.hideConnectionPreview();
    const lot: Building = { type, id: 'preview_building', gridX: x, gridZ: z };
    const drawn = new Set<string>();
    const positions = [getTileCenter(x, z)];
    const draw = (a: Building, b: Building, pipe: 'water' | 'heat') => {
      const key = pipe + [a.id, b.id].sort().join(':');
      if (drawn.has(key)) return;
      drawn.add(key);
      const start = getTileCenter(a.gridX, a.gridZ);
      positions.push(start, getTileCenter(b.gridX, b.gridZ));
      start.y = 0.31;
      this.createPreviewPipe(start, b, pipe);
    };

    const operational = this.wouldBeOperational(type, x, z);
    for (const { flow, endpoints, input } of this.placementRoutes(type)) {
      if (!operational && flow.producers.includes(type)) continue;
      const near = endpoints.filter((b) => this.getDistance(lot, b) <= MAX_PIPE_DISTANCE);
      if (!near.length) continue;
      if (input) {
        const paths = input.providers
          .map((b) => this.findPathToProvider(lot, b, input.activeRelays))
          .filter((path): path is Building[] => path !== null)
          .sort((a, b) => a.length - b.length ||
            this.getDistance(lot, a[a.length - 1]) - this.getDistance(lot, b[b.length - 1]));
        const path = paths[0];
        if (path) for (let i = 1; i < path.length; i++) draw(path[i - 1], path[i], flow.pipeType);
      } else {
        near.sort((a, b) => this.getDistance(lot, a) - this.getDistance(lot, b));
        if (flow.producers.includes(type)) {
          let capacity = getCapacity(type, flow.resource);
          for (const target of near) {
            const amount = getConsumption(target.type, flow.resource);
            if (amount > capacity) continue;
            capacity -= amount;
            draw(lot, target, flow.pipeType);
          }
        } else {
          draw(near[0], lot, flow.pipeType);
        }
      }
    }
    return positions;
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
    type: 'water' | 'heat'
  ): void {
    const targetPos = getTileCenter(target.gridX, target.gridZ);
    targetPos.y = 0.3;

    const startPos = hoverPos;
    const endPos = targetPos;

    const direction = new Vector3(
      endPos.x - startPos.x,
      endPos.y - startPos.y,
      endPos.z - startPos.z
    );
    const length = direction.length();

    const segmentLength = 0.36;
    const gapLength = 0.14;
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
          diameter: 0.13,
          tessellation: 6
        },
        this.scene
      );

      pipe.position = segmentCenter;

      pipe.rotation.set(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
      // These are map annotations. Keep them legible where a rooftop crosses a route.
      pipe.renderingGroupId = 1;

      pipe.material = this.previewMaterials.get(type) ?? null;
      pipe.isPickable = false;

      this.previewPipes.push({ mesh: pipe, type });
    }
  }

  private getProducers(buildings: readonly Building[], flow: ResourceFlowConfig): Building[] {
    return buildings.filter(
      (b) => flow.producers.includes(b.type) && (b.type !== 'distiller' || this.isSupplied(b))
    );
  }

  public rebuildPipes(): void {
    this.lotRoutes.clear();
    // Clear existing pipes
    for (const pipeData of this.pipes.values()) {
      pipeData.mesh.dispose();
    }
    this.pipes.clear();

    // Reset supply tracking
    this.suppliedBuildings.clear();
    this.supplyAllocations = [];
    this.relayFeeds.clear();

    const buildings = gameState.getBuildings();

    // Allocate capacity for each resource flow using centralized config
    for (const flow of RESOURCE_FLOWS) {
      this.allocateResourceCapacity(buildings, flow);
    }

    // Create pipes based on allocations
    // Draw pipes for each hop in the path (consumer → relay → relay → producer)
    for (const allocation of this.supplyAllocations) {
      const pipeType = getPipeType(allocation.resource);
      const path = allocation.path;

      // Create pipe for each segment in the path
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        this.createPipe(from, to, pipeType);
      }
    }

    // Draw relay chain infrastructure (producer → relay → relay connections)
    // This ensures we visualize the full relay network, not just consumer paths
    for (const flow of RESOURCE_FLOWS) {
      if (flow.relays.length === 0) continue;

      const pipeType = flow.pipeType;
      const producers = this.getProducers(buildings, flow);
      const relayTypes = flow.relays.map((r) => r.type);
      const relays = buildings.filter((b) => relayTypes.includes(b.type));

      if (relays.length === 0) continue;

      // BFS from producers to find and draw relay chain connections
      // Each relay gets exactly ONE upstream pipe (chain topology, not mesh)
      const visited = new Set<string>();
      const feeds = new Map<string, { upstream: Building; relay: Building }>();
      this.relayFeeds.set(flow.resource, feeds);
      const queue: Building[] = [...producers];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        // Find unconnected relays within range, sorted by distance (closest first)
        const unconnectedRelays = relays
          .filter((relay) => !feeds.has(relay.id))
          .map((relay) => ({ relay, dist: this.getDistance(current, relay) }))
          .filter(({ dist }) => dist > 0 && dist <= MAX_PIPE_DISTANCE)
          .sort((a, b) => a.dist - b.dist);

        for (const { relay } of unconnectedRelays) {
          // Draw pipe from current to relay
          this.createPipe(current, relay, pipeType);

          feeds.set(relay.id, { upstream: current, relay });

          // Add relay to queue to continue chain
          queue.push(relay);
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
    const producers = this.getProducers(buildings, flow);

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
    const pipeId = `pipe_${type}_${[from.id, to.id].sort().join('_')}`;

    if (this.pipes.has(pipeId)) {
      return;
    }

    const startPos = pipeEndpoint(from, type);
    const endPos = pipeEndpoint(to, type);

    const direction = endPos.subtract(startPos);
    const length = direction.length();
    const center = startPos.add(direction.scale(0.5));

    const pipe = MeshBuilder.CreateCylinder(
      pipeId,
      {
        height: length,
        diameter: 0.075,
        tessellation: 8
      },
      this.scene
    );

    pipe.position = center;

    const angle = Math.atan2(direction.x, direction.z);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.z = -angle;

    pipe.material = this.materials.get(type) ?? null;
    pipe.isPickable = false;
    pipe.setEnabled(this.visibleLayers[type]);

    this.pipes.set(pipeId, { mesh: pipe, type });
  }

  private receivedResources(building: Building): ResourceType[] {
    return RESOURCE_FLOWS.filter(
      ({ resource }) =>
        this.isSuppliedWith(building, resource) || this.relayFeeds.get(resource)?.has(building.id)
    ).map(({ resource }) => resource);
  }

  public captureSupply(): SupplySnapshot {
    return new Map(gameState.getBuildings().map((b) => [b.id, this.receivedResources(b)]));
  }

  private missingInputs(building: Building): PipeType[] {
    const missing = getResourcesReceivedViaPipes(building.type)
      .filter((resource) => !this.isSuppliedWith(building, resource))
      .map(getPipeType);
    if (building.type === 'water_tank' && !this.hasTankFeed(building)) missing.push('water');
    return missing;
  }

  public getPlacementFlow(building: Building, before?: SupplySnapshot): PlacementFlowSummary {
    const routes: PlacementFlowSummary['routes'] = [];
    const restored = new Map<string, PlacementFlowSummary['restored'][number]>();
    if (before) {
      for (const lot of gameState.getBuildings()) {
        const previouslyReceived = before.get(lot.id);
        if (!previouslyReceived || lot.id === building.id) continue;
        const resources = this.receivedResources(lot).filter(
          (r) => !previouslyReceived.includes(r)
        );
        if (resources.length) {
          restored.set(lot.id, { building: lot, resources, missing: this.missingInputs(lot) });
        }
      }
    }
    const covered = new Set<string>();
    const addRoute = (resource: ResourceType, path: Building[]) => {
      const hops = path.slice(1).map((to, i) => `${resource}:${path[i].id}:${to.id}`);
      if (hops.every((key) => covered.has(key))) return;
      for (const key of hops) covered.add(key);
      routes.push({ resource, points: path.map((b) => pipeEndpoint(b, getPipeType(resource))) });
    };
    for (const { resource } of RESOURCE_FLOWS) {
      const feeds = this.relayFeeds.get(resource);
      const inletTo = (target: Building) => {
        const inlet = [target];
        let feed = feeds?.get(target.id);
        while (feed) {
          inlet.push(feed.upstream);
          feed = feeds?.get(feed.upstream.id);
        }
        return inlet.reverse();
      };
      const inlet = inletTo(building);
      for (const allocation of this.supplyAllocations) {
        if (allocation.resource !== resource) continue;
        const gained = restored.get(allocation.consumer.id)?.resources.includes(resource);
        if (!gained && !allocation.path.some((b) => b.id === building.id)) continue;
        const path = [...allocation.path].reverse();
        // A tank allocates its own capacity, but the pulse originates at its water source.
        const includeInlet = gained || allocation.producer.id === building.id;
        addRoute(
          resource,
          includeInlet ? inletTo(allocation.producer).concat(path.slice(1)) : path
        );
      }
      if (!feeds) continue;
      if (inlet.length > 1) addRoute(resource, inlet);
      for (const { upstream, relay } of feeds.values()) {
        if (restored.get(relay.id)?.resources.includes(resource))
          addRoute(resource, inletTo(relay));
        else if (upstream.id === building.id) addRoute(resource, [...inlet, relay]);
      }
    }
    return { routes, missing: this.missingInputs(building), restored: [...restored.values()] };
  }

  private hasTankFeed(tank: Building): boolean {
    for (const feeds of this.relayFeeds.values()) if (feeds.has(tank.id)) return true;
    return false;
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

    for (const [resource, feeds] of this.relayFeeds) {
      for (const { upstream, relay } of feeds.values()) {
        if (upstream.id !== building.id && relay.id !== building.id) continue;
        const incoming = relay.id === building.id;
        const other = incoming ? upstream : relay;
        const direction = incoming ? 'incoming' : 'outgoing';
        const type = getPipeType(resource);
        if (!connections.some(c => c.building.id === other.id && c.direction === direction && c.type === type)) {
          connections.push({ building: other, type, direction });
        }
      }
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
    if (building.type === 'water_tank' && building.id !== 'virtual_preview') {
      return this.hasTankFeed(building);
    }
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
    return !BUILDING_CONSUMPTION[buildingType] || this.isSuitableLot(buildingType, gridX, gridZ);
  }

  public getMissingConnections(
    building: Building
  ): { type: BuildingType; resourceType: 'water' | 'heat' }[] {
    if (building.type === 'water_tank' && building.id !== 'virtual_preview') {
      return this.hasTankFeed(building) ? [] : [{ type: 'pump', resourceType: 'water' }];
    }
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
