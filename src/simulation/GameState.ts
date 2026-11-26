import {
  STARTING_RESOURCES,
  RESOURCE_CAPS,
  BUILDING_PRODUCTION,
  BUILDING_COSTS,
  BUILDING_PLACEMENT,
  BUILDING_MAX_ALLOWED,
  BUILDING_SCALING_LIMITS,
  HOUSING_CAPACITY_PER_MICRORAYON,
  BUILDING_MAINTENANCE,
  COST_SCALING_FACTOR,
  GRID_SIZE
} from '../types';
import type {
  Resources,
  ReactorState,
  Building,
  BuildingType,
  GameStateData,
  GameOverReason,
  TileType
} from '../types';
import {
  DISTRICT_ORDERS,
  CIVIC_PROJECTS,
  CIVIC_POWER_COST,
  CIVIC_MATERIAL_COST,
  CIVIC_SAVINGS,
  WATERFRONT_EXPANSION,
  type DistrictOrder,
  type CivicProject,
  type CivicProjectKind
} from './DistrictPlan';
import { getCoastlineZ, getTileTypeAt } from '../grid/TileTypes';

// Maximum tiles from coastline where pumps can be placed
const MAX_PUMP_DISTANCE_FROM_COAST = 2;

// Minimum spacing between buildings (in tiles) - prevents cramped placement
const MIN_BUILDING_SPACING = 1;

function overlapsSite(site: { gridX: number; gridZ: number }, x: number, z: number): boolean {
  return (
    Math.abs(site.gridX - x) <= MIN_BUILDING_SPACING &&
    Math.abs(site.gridZ - z) <= MIN_BUILDING_SPACING
  );
}

// ============================================
// Event System Types
// ============================================

export type GameEventType =
  | 'resourceChange'
  | 'resourceTrend'
  | 'buildingPlaced'
  | 'buildingRemoved'
  | 'gameOver'
  | 'dayAdvance'
  | 'reactorWarning'
  | 'reactorTempChange'
  | 'populationChange'
  | 'seasonChange'
  | 'orderComplete'
  | 'civicProjectChange'
  | 'districtEstablished';

export type GameEventCallback = (data: unknown) => void;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_HEAT_MULTIPLIER: Record<Season, number> = {
  spring: 1.0,
  summer: 0.5,
  autumn: 1.2,
  winter: 2.0
};
export const SEASON_LENGTH = 30;

export interface ResourceTrend {
  seawater: number;
  freshWater: number;
  heat: number;
  electricity: number;
  population: number;
  happiness: number;
}

export type ConnectionChecker = (building: Building) => {
  isFullyOperational: boolean;
};

export interface EventModifiers {
  pumpEfficiency: number;
  heatMultiplier: number;
  electricityMultiplier: number;
  happinessBonus: number;
  waterMultiplier?: number;
}

export const RESERVE_POWER_COST = 60;
export const RESERVE_SUPPLIES = { freshWater: 50, heat: 75 };
export type ReserveSupply = keyof typeof RESERVE_SUPPLIES;

interface WeatherPersistence {
  save: () => unknown;
  restore: (snapshot: unknown) => boolean;
}

interface CitySave {
  resources: Resources;
  reactor: ReactorState;
  buildings: Building[];
  day: number;
  buildingIdCounter?: number;
  completedOrders?: number;
  nextDispatchDay?: number;
  weather?: unknown;
  civicProject?: CivicProject | null;
  districtEstablished?: boolean;
}

function isCitySave(value: unknown): value is CitySave {
  const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
  const whole = (v: unknown): v is number =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  if (!record(value) || !record(value.resources) || !record(value.reactor)) return false;
  const {
    resources,
    reactor,
    buildings,
    day,
    completedOrders,
    buildingIdCounter,
    nextDispatchDay
  } = value;
  if (
    !whole(day) ||
    day < 1 ||
    !Number.isFinite(reactor.temperature) ||
    typeof reactor.coolingActive !== 'boolean'
  )
    return false;
  if (!Object.keys(STARTING_RESOURCES).every((key) => Number.isFinite(resources[key])))
    return false;
  if (
    completedOrders !== undefined &&
    (!whole(completedOrders) || completedOrders > DISTRICT_ORDERS.length)
  )
    return false;
  if (buildingIdCounter !== undefined && !whole(buildingIdCounter)) return false;
  if (nextDispatchDay !== undefined && !whole(nextDispatchDay)) return false;
  if (!Array.isArray(buildings) || buildings.length > GRID_SIZE * GRID_SIZE) return false;
  const ids = new Set<string>();
  const lots = new Set<number>();
  for (const building of buildings) {
    if (!record(building)) return false;
    const { id, type, gridX, gridZ } = building;
    if (typeof id !== 'string' || !id || ids.has(id)) return false;
    const suffix = /^building_(\d+)$/.exec(id)?.[1];
    if (suffix && !Number.isSafeInteger(Number(suffix) + 1)) return false;
    if (typeof type !== 'string' || !Object.hasOwn(BUILDING_COSTS, type)) return false;
    if (!whole(gridX) || !whole(gridZ) || gridX >= GRID_SIZE || gridZ >= GRID_SIZE) return false;
    const lot = gridX + gridZ * GRID_SIZE;
    if (lots.has(lot)) return false;
    ids.add(id);
    lots.add(lot);
  }
  const project = value.civicProject;
  if (project !== undefined && project !== null) {
    if (
      !record(project) ||
      typeof project.kind !== 'string' ||
      !Object.hasOwn(CIVIC_PROJECTS, project.kind)
    )
      return false;
    const { gridX, gridZ } = project;
    if (!whole(gridX) || !whole(gridZ) || gridX >= GRID_SIZE || gridZ >= GRID_SIZE) return false;
    if (completedOrders !== DISTRICT_ORDERS.length || getTileTypeAt(gridX, gridZ) === 'sea')
      return false;
    if (buildings.some((b) => overlapsSite(b, gridX, gridZ))) return false;
  }
  if (value.districtEstablished !== undefined && typeof value.districtEstablished !== 'boolean')
    return false;
  if (value.districtEstablished && !project) return false;
  return true;
}

export class GameState {
  private resources: Resources;
  private previousResources: Resources;
  private resourceTrend: ResourceTrend;
  private reactor: ReactorState;
  private buildings: Building[] = [];
  private day: number = 1;
  private completedOrders = 0;
  private nextDispatchDay = 0;
  private civicProject: CivicProject | null = null;
  private districtEstablished = false;
  private weatherPersistence?: WeatherPersistence;
  private gameOver: boolean = false;
  private gameOverReason?: GameOverReason;
  private buildingIdCounter: number = 0;
  private connectionChecker: ConnectionChecker | null = null;
  private eventModifiersGetter: (() => EventModifiers) | null = null;

  private listeners: Map<GameEventType, Set<GameEventCallback>> = new Map();

  constructor() {
    this.resources = { ...STARTING_RESOURCES };
    this.previousResources = { ...STARTING_RESOURCES };
    this.resourceTrend = {
      seawater: 0,
      freshWater: 0,
      heat: 0,
      electricity: 0,
      population: 0,
      happiness: 0
    };

    this.reactor = {
      temperature: 0,
      coolingActive: false
    };
  }

  // ============================================
  // Event System
  // ============================================

  public on(event: GameEventType, callback: GameEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: GameEventType, callback: GameEventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: GameEventType, data: unknown = null): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  public setConnectionChecker(checker: ConnectionChecker): void {
    this.connectionChecker = checker;
  }

  public setEventModifiersGetter(getter: () => EventModifiers): void {
    this.eventModifiersGetter = getter;
  }

  private getEventModifiers(): EventModifiers {
    return (
      this.eventModifiersGetter?.() ?? {
        pumpEfficiency: 1,
        heatMultiplier: 1,
        electricityMultiplier: 1,
        happinessBonus: 0,
        waterMultiplier: 1
      }
    );
  }

  // ============================================
  // Resource Getters
  // ============================================

  public getResources(): Readonly<Resources> {
    return this.resources;
  }

  public addResources(toAdd: Partial<Resources>): void {
    for (const [resource, amount] of Object.entries(toAdd)) {
      if (amount) {
        this.resources[resource as keyof Resources] += amount;
      }
    }
  }

  public getReactorState(): Readonly<ReactorState> {
    return this.reactor;
  }

  public adjustReactorTemp(delta: number): void {
    this.reactor.temperature = Math.max(0, this.reactor.temperature + delta);
    this.emit('reactorTempChange', this.reactor.temperature);
  }

  public getDay(): number {
    return this.day;
  }

  public getCompletedOrders(): number {
    return this.completedOrders;
  }

  public setWeatherPersistence(persistence: WeatherPersistence): void {
    this.weatherPersistence = persistence;
  }

  public getNextDispatchDay(): number {
    return this.nextDispatchDay;
  }

  public dispatchSupply(resource: ReserveSupply): boolean {
    if (this.gameOver || this.completedOrders < 4 || this.day < this.nextDispatchDay) return false;
    const amount = Math.min(
      RESERVE_SUPPLIES[resource],
      RESOURCE_CAPS[resource]! - this.resources[resource]
    );
    if (amount <= 0 || this.resources.electricity < RESERVE_POWER_COST) return false;
    this.resources.electricity -= RESERVE_POWER_COST;
    this.resources[resource] += amount;
    this.nextDispatchDay = this.day + 10;
    this.emit('resourceChange', this.resources);
    return true;
  }

  public getCivicProject(): Readonly<CivicProject> | null {
    return this.civicProject;
  }

  public isDistrictEstablished(): boolean {
    return this.districtEstablished;
  }

  public commissionCivicProject(kind: CivicProjectKind): boolean {
    if (this.gameOver || this.completedOrders < DISTRICT_ORDERS.length || this.civicProject)
      return false;
    const project = CIVIC_PROJECTS[kind];
    if (
      this.resources.electricity < CIVIC_POWER_COST ||
      this.resources[project.resource] < CIVIC_MATERIAL_COST
    )
      return false;
    const reactor = this.buildings.find((b) => b.type === 'reactor');
    if (!reactor) return false;

    // Existing cities can already occupy the designated lot. Find its closest clear alternative.
    const preferredX = reactor.gridX + project.offsetX;
    const preferredZ = reactor.gridZ + project.offsetZ;
    let site: CivicProject | null = null;
    let nearest = Infinity;
    for (let gridZ = 0; gridZ < GRID_SIZE; gridZ++) {
      for (let gridX = 0; gridX < GRID_SIZE; gridX++) {
        const distance = (gridX - preferredX) ** 2 + (gridZ - preferredZ) ** 2;
        if (distance >= nearest || getTileTypeAt(gridX, gridZ) === 'sea') continue;
        if (this.buildings.some((b) => overlapsSite(b, gridX, gridZ))) continue;
        nearest = distance;
        site = { kind, gridX, gridZ };
      }
    }
    if (!site) return false;
    this.resources.electricity -= CIVIC_POWER_COST;
    this.resources[project.resource] -= CIVIC_MATERIAL_COST;
    this.civicProject = site;
    this.emit('civicProjectChange', site);
    this.checkDistrictGoal();
    this.emit('resourceChange', this.resources);
    return true;
  }

  private checkDistrictGoal(): void {
    if (
      this.civicProject &&
      !this.districtEstablished &&
      this.resources.population >= WATERFRONT_EXPANSION.residents.target &&
      this.getOperationalCount('microrayon') >= WATERFRONT_EXPANSION.homes.target
    ) {
      this.districtEstablished = true;
      this.emit('districtEstablished');
    }
  }

  public getOrderProgress(order: DistrictOrder): number {
    if (order.measure === 'population') return this.resources.population;
    if (order.measure === 'day') return this.day;
    return this.getOperationalCount(order.measure);
  }

  public getOperationalCount(type: BuildingType): number {
    return this.buildings.filter(
      (building) => building.type === type && this.connectionChecker?.(building).isFullyOperational
    ).length;
  }

  private advanceOrders(grantRewards = true): void {
    let order = DISTRICT_ORDERS[this.completedOrders];
    while (order && this.getOrderProgress(order) >= order.target) {
      this.completedOrders++;
      if (grantRewards && order.reward) {
        const { resource, amount } = order.reward;
        const capacity =
          resource === 'population'
            ? this.getOperationalCount('microrayon') * HOUSING_CAPACITY_PER_MICRORAYON
            : RESOURCE_CAPS[resource]!;
        this.resources[resource] += Math.max(
          0,
          Math.min(amount, capacity - this.resources[resource])
        );
      }
      if (grantRewards) this.emit('orderComplete', order);
      order = DISTRICT_ORDERS[this.completedOrders];
    }
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public getGameOverReason(): GameOverReason | undefined {
    return this.gameOverReason;
  }

  public getBuildings(): readonly Building[] {
    return this.buildings;
  }

  public getState(): GameStateData {
    return {
      resources: { ...this.resources },
      reactor: { ...this.reactor },
      buildings: [...this.buildings],
      day: this.day,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason
    };
  }

  public getResourceTrend(): Readonly<ResourceTrend> {
    return this.resourceTrend;
  }

  public getSeason(): Season {
    const seasonIndex = Math.floor(((this.day - 1) % (SEASON_LENGTH * 4)) / SEASON_LENGTH);
    return SEASONS[seasonIndex];
  }

  public getSeasonMultiplier(): number {
    const baseMult = SEASON_HEAT_MULTIPLIER[this.getSeason()];

    // Each year (120 days), winter gets 10% harder
    const yearsElapsed = Math.floor((this.day - 1) / (SEASON_LENGTH * 4));
    const winterEscalation = this.getSeason() === 'winter' ? yearsElapsed * 0.1 : 0;

    return baseMult + winterEscalation;
  }

  /**
   * Calculate population-based consumption penalty.
   * More people = higher per-capita consumption, creating pressure as population grows.
   * Every 50 people above 100 adds 3% consumption.
   * At 100 pop: 1.0× (baseline)
   * At 200 pop: 1.06× consumption
   * At 500 pop: 1.24× consumption
   * At 1000 pop: 1.54× consumption
   */
  public getPopulationEfficiencyPenalty(): number {
    const pop = this.resources.population;
    if (pop <= 100) return 1.0;

    const excessPop = pop - 100;
    return 1 + (excessPop / 50) * 0.03;
  }

  // ============================================
  // Building Management
  // ============================================

  /**
   * Returns the effective cost for placing a building.
   * First reactor is free to prevent energy deadlock.
   * Returns null if building limit is reached.
   */
  public getEffectiveCost(type: BuildingType): Partial<Resources> | null {
    const count = this.buildings.filter((b) => b.type === type).length;
    const maxAllowed = BUILDING_MAX_ALLOWED[type];

    // Return null if max limit reached (can't build more)
    if (maxAllowed !== undefined && count >= maxAllowed) {
      return null;
    }

    // Check scaling limits (e.g., thermal plants require microrayons)
    const scalingLimit = BUILDING_SCALING_LIMITS[type];
    if (scalingLimit) {
      const requiredCount = this.buildings.filter(
        (b) => b.type === scalingLimit.requiredBuilding
      ).length;
      const maxAllowedByScaling =
        scalingLimit.freeCount + Math.floor(requiredCount / scalingLimit.countPerAllowed);

      if (count >= maxAllowedByScaling) {
        return null;
      }
    }

    // First reactor is free
    if (type === 'reactor' && count === 0) {
      return {};
    }

    // Apply scaling: each building costs 15% more than the previous
    const baseCost = BUILDING_COSTS[type];
    const scalingMultiplier = 1 + count * COST_SCALING_FACTOR;

    const scaledCost: Partial<Resources> = {};
    for (const [resource, amount] of Object.entries(baseCost)) {
      if (amount !== undefined) {
        scaledCost[resource as keyof Resources] = Math.ceil(amount * scalingMultiplier);
      }
    }

    return scaledCost;
  }

  public canPlaceBuilding(
    type: BuildingType,
    gridX: number,
    gridZ: number,
    tileType: TileType
  ): { canPlace: boolean; reason?: string } {
    // Check if game is over
    if (this.gameOver) {
      return { canPlace: false, reason: 'Game is over' };
    }

    // Check tile type compatibility
    const allowedTiles = BUILDING_PLACEMENT[type];
    if (!allowedTiles.includes(tileType)) {
      return {
        canPlace: false,
        reason: `${type} cannot be placed on ${tileType}`
      };
    }

    // Pumps must be near the coastline
    if (type === 'pump') {
      const coastlineZ = getCoastlineZ(gridX);
      const distanceFromCoast = coastlineZ - gridZ;
      if (distanceFromCoast > MAX_PUMP_DISTANCE_FROM_COAST) {
        return {
          canPlace: false,
          reason: 'Pump must be placed near the coastline'
        };
      }
    }

    // Check if tile is occupied
    const occupied = this.buildings.some((b) => b.gridX === gridX && b.gridZ === gridZ);
    if (occupied) {
      return { canPlace: false, reason: 'Tile is already occupied' };
    }

    if (this.civicProject && overlapsSite(this.civicProject, gridX, gridZ)) {
      return { canPlace: false, reason: 'Civic project lot is occupied' };
    }

    // Check minimum spacing between buildings
    const tooClose = this.buildings.some((b) => overlapsSite(b, gridX, gridZ));
    if (tooClose) {
      return { canPlace: false, reason: 'Too close to another building' };
    }

    // Check if max limit reached
    const cost = this.getEffectiveCost(type);
    if (cost === null) {
      return { canPlace: false, reason: 'Maximum limit reached' };
    }

    // Check scaling limits (e.g., thermal plants require microrayons)
    const scalingLimit = BUILDING_SCALING_LIMITS[type];
    if (scalingLimit) {
      const currentCount = this.buildings.filter((b) => b.type === type).length;
      const requiredCount = this.buildings.filter(
        (b) => b.type === scalingLimit.requiredBuilding
      ).length;
      const maxAllowedByScaling =
        scalingLimit.freeCount + Math.floor(requiredCount / scalingLimit.countPerAllowed);

      if (currentCount >= maxAllowedByScaling) {
        return {
          canPlace: false,
          reason: `Need ${scalingLimit.countPerAllowed} more ${scalingLimit.requiredBuilding}s`
        };
      }
    }

    // Check if we have enough resources
    for (const [resource, amount] of Object.entries(cost)) {
      if (this.resources[resource as keyof Resources] < (amount ?? 0)) {
        return { canPlace: false, reason: `Not enough ${resource}` };
      }
    }

    return { canPlace: true };
  }

  public placeBuilding(type: BuildingType, gridX: number, gridZ: number): Building | null {
    // Deduct costs
    const cost = this.getEffectiveCost(type);
    if (cost === null) {
      return null; // Max limit reached
    }
    for (const [resource, amount] of Object.entries(cost)) {
      this.resources[resource as keyof Resources] -= amount ?? 0;
    }

    // Create building
    const building: Building = {
      id: `building_${this.buildingIdCounter++}`,
      type,
      gridX,
      gridZ
    };

    this.buildings.push(building);
    this.emit('buildingPlaced', building);
    this.advanceOrders();
    this.checkDistrictGoal();
    this.emit('resourceChange', this.resources);

    return building;
  }

  public removeBuilding(buildingId: string): boolean {
    const index = this.buildings.findIndex((b) => b.id === buildingId);
    if (index === -1) return false;

    const [removed] = this.buildings.splice(index, 1);
    this.emit('buildingRemoved', removed);
    this.emit('resourceChange', this.resources);
    return true;
  }

  public getBuildingAt(gridX: number, gridZ: number): Building | undefined {
    return this.buildings.find((b) => b.gridX === gridX && b.gridZ === gridZ);
  }

  // ============================================
  // Simulation Tick
  // ============================================

  public tick(): void {
    if (this.gameOver) return;

    this.previousResources = { ...this.resources };
    const prevSeason = this.getSeason();

    this.processBuildings();
    this.processMaintenanceCosts();
    this.processPopulation();
    this.processReactor();

    // Apply resource caps to prevent unbounded accumulation
    for (const [resource, cap] of Object.entries(RESOURCE_CAPS)) {
      if (cap !== undefined) {
        const key = resource as keyof Resources;
        this.resources[key] = Math.min(this.resources[key], cap);
      }
    }

    this.checkFailStates();

    if (!this.gameOver) {
      this.day++;
      this.advanceOrders();
      this.checkDistrictGoal();
      this.calculateTrend();

      const newSeason = this.getSeason();
      if (newSeason !== prevSeason) {
        this.emit('seasonChange', {
          season: newSeason,
          multiplier: SEASON_HEAT_MULTIPLIER[newSeason]
        });
      }

      this.emit('dayAdvance', this.day);
      this.emit('resourceChange', this.resources);
      this.emit('resourceTrend', this.resourceTrend);
    }
  }

  private processMaintenanceCosts(): void {
    // All buildings consume maintenance costs (primarily electricity)
    for (const building of this.buildings) {
      const maintenance = BUILDING_MAINTENANCE[building.type];
      for (const [resource, amount] of Object.entries(maintenance)) {
        if (amount !== undefined) {
          this.resources[resource as keyof Resources] -= amount;
        }
      }
    }
  }

  private calculateTrend(): void {
    this.resourceTrend = {
      seawater: this.resources.seawater - this.previousResources.seawater,
      freshWater: this.resources.freshWater - this.previousResources.freshWater,
      heat: this.resources.heat - this.previousResources.heat,
      electricity: this.resources.electricity - this.previousResources.electricity,
      population: this.resources.population - this.previousResources.population,
      happiness: this.resources.happiness - this.previousResources.happiness
    };
  }

  private processPopulation(): void {
    const { happiness, freshWater, population } = this.resources;

    if (population <= 0) return;

    // Count connected microrayons for housing capacity
    const connectedMicrorayons = this.getOperationalCount('microrayon');

    if (connectedMicrorayons === 0) return;

    const housingCapacity = connectedMicrorayons * HOUSING_CAPACITY_PER_MICRORAYON;

    // Growth: Only when happy AND have water AND below housing capacity
    if (happiness > 60 && freshWater > 20 && population < housingCapacity) {
      const maxGrowth = Math.max(1, Math.floor(population * 0.02));
      const roomLeft = housingCapacity - population;
      const growth = Math.min(maxGrowth, roomLeft);
      this.resources.population += growth;
      this.emit('populationChange', { delta: growth, reason: 'growth' });
    }
    // Decline: When unhappy OR low water (heat removed - always abundant)
    else if (happiness < 40 || freshWater < 15) {
      const decline = Math.max(1, Math.floor(population * 0.05));
      this.resources.population = Math.max(0, population - decline);
      this.emit('populationChange', { delta: -decline, reason: 'decline' });
    }
  }

  private processBuildings(): void {
    const buildingCounts: Record<BuildingType, number> = {
      pump: 0,
      reactor: 0,
      distiller: 0,
      microrayon: 0,
      water_tank: 0,
      thermal_plant: 0
    };

    let connectedMicrorayons = 0;
    let disconnectedMicrorayons = 0;

    for (const building of this.buildings) {
      // Distillers only produce when fully connected (pump + reactor)
      if (building.type === 'distiller') {
        if (this.connectionChecker && this.connectionChecker(building).isFullyOperational) {
          buildingCounts[building.type]++;
        }
      } else if (building.type === 'microrayon') {
        // Microrayons need connection to distiller for happiness
        if (this.connectionChecker && this.connectionChecker(building).isFullyOperational) {
          connectedMicrorayons++;
          buildingCounts[building.type]++;
        } else {
          disconnectedMicrorayons++;
          // Disconnected microrayons do NOT consume resources - they're not operational
          // They only cause happiness penalty
        }
      } else {
        buildingCounts[building.type]++;
      }
    }

    const seasonMultiplier = this.getSeasonMultiplier();
    const eventModifiers = this.getEventModifiers();
    // Combine season and event heat multipliers
    const heatingEfficiency =
      this.civicProject?.kind === 'district_heating' ? 1 - CIVIC_SAVINGS : 1;
    const totalHeatMultiplier =
      seasonMultiplier * eventModifiers.heatMultiplier * heatingEfficiency;
    // Population-based consumption penalty for microrayons
    const populationPenalty = this.getPopulationEfficiencyPenalty();

    for (const [type, count] of Object.entries(buildingCounts)) {
      if (count === 0) continue;

      const production = BUILDING_PRODUCTION[type as BuildingType];

      const demand: Partial<Resources> = {};
      let canProduce = true;
      for (const [name, baseAmount] of Object.entries(production.consumes)) {
        const resource = name as keyof Resources;
        let amount = baseAmount * count;
        if (resource === 'heat') amount = Math.ceil(amount * totalHeatMultiplier);
        if (type === 'microrayon') {
          if (resource === 'freshWater' && this.civicProject?.kind === 'public_garden') {
            amount *= 1 - CIVIC_SAVINGS;
          }
          amount = Math.ceil(amount * populationPenalty);
        }
        demand[resource] = amount;
        if (this.resources[resource] < amount) canProduce = false;
      }

      // Homes still draw on reserves during a shortage.
      if (canProduce || type === 'microrayon') {
        for (const [resource, amount] of Object.entries(demand)) {
          this.resources[resource as keyof Resources] -= amount;
        }

        for (const [resource, amount] of Object.entries(production.produces)) {
          // Skip happiness for microrayons - handled separately below
          if (type === 'microrayon' && resource === 'happiness') continue;

          let produced = (amount ?? 0) * count;

          // Apply event modifiers to production
          if (type === 'pump' && resource === 'seawater') {
            produced = Math.floor(produced * eventModifiers.pumpEfficiency);
          }
          if (resource === 'electricity' && (type === 'reactor' || type === 'thermal_plant')) {
            produced = Math.floor(produced * eventModifiers.electricityMultiplier);
          }
          if (type === 'distiller' && resource === 'freshWater') {
            const waterMult = eventModifiers.waterMultiplier ?? 1;
            produced = Math.floor(produced * waterMult);
          }

          this.resources[resource as keyof Resources] += produced;
        }
      }
    }

    // Handle microrayon happiness separately based on connection status
    // Connected microrayons produce happiness, disconnected ones deduct it
    const happinessGain = connectedMicrorayons * 1;
    const happinessLoss = disconnectedMicrorayons * 2;
    this.resources.happiness += happinessGain - happinessLoss + eventModifiers.happinessBonus;

    // Clamp happiness to 0-100 range
    this.resources.happiness = Math.max(0, Math.min(100, this.resources.happiness));
  }

  private processReactor(): void {
    const reactorCount = this.buildings.filter((b) => b.type === 'reactor').length;
    const distillers = this.buildings.filter((b) => b.type === 'distiller');

    let connectedDistillerCount = 0;
    if (this.connectionChecker) {
      connectedDistillerCount = distillers.filter(
        (d) => this.connectionChecker!(d).isFullyOperational
      ).length;
    }

    if (reactorCount > 0) {
      const heatGenerated = reactorCount * 1;
      const coolingCapacity = connectedDistillerCount * 0.8;

      this.reactor.temperature = Math.max(
        0,
        this.reactor.temperature + heatGenerated - coolingCapacity
      );
      this.reactor.coolingActive = connectedDistillerCount > 0;

      if (this.reactor.temperature >= 80 && this.reactor.temperature < 100) {
        this.emit('reactorWarning', this.reactor.temperature);
      }
    }
  }

  private checkFailStates(): void {
    if (this.reactor.temperature >= 100) {
      this.triggerGameOver('meltdown');
      return;
    }

    if (this.resources.freshWater < 0) {
      this.resources.freshWater = 0;
      this.triggerGameOver('drought');
      return;
    }

    if (this.resources.heat < 0 && this.resources.population > 0) {
      this.resources.heat = 0;
      this.triggerGameOver('freeze');
      return;
    }

    if (this.resources.population <= 0 && this.buildings.some((b) => b.type === 'microrayon')) {
      this.resources.population = 0;
      this.triggerGameOver('extinction');
      return;
    }

    if (this.resources.happiness <= 0 && this.resources.population > 0) {
      this.resources.happiness = 0;
      this.triggerGameOver('revolt');
      return;
    }
  }

  private triggerGameOver(reason: GameOverReason): void {
    this.gameOver = true;
    this.gameOverReason = reason;
    this.emit('gameOver', { reason, day: this.day });
    console.log(`GAME OVER - ${reason.toUpperCase()} on Day ${this.day}`);
  }

  // ============================================
  // Reset
  // ============================================

  public reset(): void {
    this.resources = { ...STARTING_RESOURCES };
    this.previousResources = { ...STARTING_RESOURCES };
    this.resourceTrend = {
      seawater: 0,
      freshWater: 0,
      heat: 0,
      electricity: 0,
      population: 0,
      happiness: 0
    };
    this.reactor = { temperature: 0, coolingActive: false };
    this.buildings = [];
    this.day = 1;
    this.completedOrders = 0;
    this.nextDispatchDay = 0;
    this.civicProject = null;
    this.districtEstablished = false;
    this.emit('civicProjectChange', null);
    this.weatherPersistence?.restore(undefined);
    this.gameOver = false;
    this.gameOverReason = undefined;
    this.buildingIdCounter = 0;
    this.emit('resourceChange', this.resources);
    this.emit('resourceTrend', this.resourceTrend);
  }

  public save(): boolean {
    try {
      const saveData = {
        resources: this.resources,
        reactor: this.reactor,
        buildings: this.buildings.map((b) => ({
          id: b.id,
          type: b.type,
          gridX: b.gridX,
          gridZ: b.gridZ
        })),
        day: this.day,
        completedOrders: this.completedOrders,
        nextDispatchDay: this.nextDispatchDay,
        civicProject: this.civicProject,
        districtEstablished: this.districtEstablished,
        weather: this.weatherPersistence?.save(),
        buildingIdCounter: this.buildingIdCounter
      };
      localStorage.setItem('aktau-save', JSON.stringify(saveData));
      return true;
    } catch {
      return false;
    }
  }

  public load(): boolean {
    try {
      const saved = localStorage.getItem('aktau-save');
      if (!saved) return false;

      const data: unknown = JSON.parse(saved);
      if (!isCitySave(data)) return false;
      if (this.weatherPersistence && !this.weatherPersistence.restore(data.weather)) return false;

      this.resources = data.resources;
      this.previousResources = { ...data.resources };
      this.reactor = data.reactor;
      const previousBuildings = this.buildings;
      this.buildings = [];
      for (const building of previousBuildings) this.emit('buildingRemoved', building);
      this.completedOrders = data.completedOrders ?? 0;
      this.nextDispatchDay = data.nextDispatchDay ?? 0;
      this.civicProject = data.civicProject ?? null;
      this.districtEstablished = data.districtEstablished ?? false;
      this.day = data.day;
      this.buildingIdCounter = data.buildingIdCounter ?? 0;
      for (const { id } of data.buildings) {
        const suffix = /^building_(\d+)$/.exec(id)?.[1];
        if (suffix) this.buildingIdCounter = Math.max(this.buildingIdCounter, Number(suffix) + 1);
      }
      this.gameOver = false;
      this.gameOverReason = undefined;
      this.resourceTrend = {
        seawater: 0,
        freshWater: 0,
        heat: 0,
        electricity: 0,
        population: 0,
        happiness: 0
      };

      for (const b of data.buildings) {
        const building: Building = {
          id: b.id,
          type: b.type,
          gridX: b.gridX,
          gridZ: b.gridZ
        };
        this.buildings.push(building);
        this.emit('buildingPlaced', building);
      }

      // Legacy cities keep their saved balances while receiving credit for existing infrastructure.
      this.advanceOrders(data.completedOrders !== undefined);
      this.emit('civicProjectChange', this.civicProject);
      this.checkDistrictGoal();
      this.emit('resourceChange', this.resources);
      this.emit('seasonChange', {
        season: this.getSeason(),
        multiplier: this.getSeasonMultiplier()
      });
      this.emit('resourceTrend', this.resourceTrend);
      return true;
    } catch {
      return false;
    }
  }

  public hasSave(): boolean {
    return localStorage.getItem('aktau-save') !== null;
  }

  public deleteSave(): void {
    localStorage.removeItem('aktau-save');
  }
}

// Singleton instance
export const gameState = new GameState();
