import {
  STARTING_RESOURCES,
  BUILDING_PRODUCTION,
  BUILDING_COSTS,
  BUILDING_PLACEMENT,
  BUILDING_MAX_ALLOWED
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
  | 'populationChange'
  | 'seasonChange';

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

export type ConnectionChecker = (building: Building) => { isFullyOperational: boolean };

export class GameState {
  private resources: Resources;
  private previousResources: Resources;
  private resourceTrend: ResourceTrend;
  private reactor: ReactorState;
  private buildings: Building[] = [];
  private day: number = 1;
  private gameOver: boolean = false;
  private gameOverReason?: GameOverReason;
  private buildingIdCounter: number = 0;
  private connectionChecker: ConnectionChecker | null = null;

  private listeners: Map<GameEventType, Set<GameEventCallback>> = new Map();

  constructor() {
    this.resources = { ...STARTING_RESOURCES };
    this.previousResources = { ...STARTING_RESOURCES };
    this.resourceTrend = { seawater: 0, freshWater: 0, heat: 0, electricity: 0, population: 0, happiness: 0 };

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
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  public setConnectionChecker(checker: ConnectionChecker): void {
    this.connectionChecker = checker;
  }

  // ============================================
  // Resource Getters
  // ============================================

  public getResources(): Readonly<Resources> {
    return this.resources;
  }

  public getReactorState(): Readonly<ReactorState> {
    return this.reactor;
  }

  public getDay(): number {
    return this.day;
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
    return SEASON_HEAT_MULTIPLIER[this.getSeason()];
  }

  // ============================================
  // Building Management
  // ============================================


  /**
   * Returns the effective cost for placing a building.
   * First reactor is free to prevent energy deadlock.
   */
  public getEffectiveCost(type: BuildingType): Partial<Resources> | null {
    const count = this.buildings.filter(b => b.type === type).length;
    const maxAllowed = BUILDING_MAX_ALLOWED[type];

    // Return null if max limit reached (can't build more)
    if (maxAllowed !== undefined && count >= maxAllowed) {
      return null;
    }

    // First reactor is free
    if (type === 'reactor' && count === 0) {
      return {};
    }

    return BUILDING_COSTS[type];
  }

  public canPlaceBuilding(type: BuildingType, gridX: number, gridZ: number, tileType: TileType): { canPlace: boolean; reason?: string } {
    // Check if game is over
    if (this.gameOver) {
      return { canPlace: false, reason: 'Game is over' };
    }

    // Check tile type compatibility
    const allowedTiles = BUILDING_PLACEMENT[type];
    if (!allowedTiles.includes(tileType)) {
      return { canPlace: false, reason: `${type} cannot be placed on ${tileType}` };
    }

    // Check if tile is occupied
    const occupied = this.buildings.some(b => b.gridX === gridX && b.gridZ === gridZ);
    if (occupied) {
      return { canPlace: false, reason: 'Tile is already occupied' };
    }

    // Check if max limit reached
    const cost = this.getEffectiveCost(type);
    if (cost === null) {
      return { canPlace: false, reason: 'Maximum limit reached' };
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
    this.emit('resourceChange', this.resources);

    return building;
  }

  public removeBuilding(buildingId: string): boolean {
    const index = this.buildings.findIndex(b => b.id === buildingId);
    if (index === -1) return false;

    const [removed] = this.buildings.splice(index, 1);
    this.emit('buildingRemoved', removed);
    return true;
  }

  public getBuildingAt(gridX: number, gridZ: number): Building | undefined {
    return this.buildings.find(b => b.gridX === gridX && b.gridZ === gridZ);
  }

  // ============================================
  // Simulation Tick
  // ============================================

  public tick(): void {
    if (this.gameOver) return;

    this.previousResources = { ...this.resources };
    const prevSeason = this.getSeason();

    this.processBuildings();
    this.processPopulation();
    this.processReactor();
    this.checkFailStates();

    if (!this.gameOver) {
      this.calculateTrend();
      this.day++;

      const newSeason = this.getSeason();
      if (newSeason !== prevSeason) {
        this.emit('seasonChange', { season: newSeason, multiplier: SEASON_HEAT_MULTIPLIER[newSeason] });
      }

      this.emit('dayAdvance', this.day);
      this.emit('resourceChange', this.resources);
      this.emit('resourceTrend', this.resourceTrend);
    }
  }

  private calculateTrend(): void {
    this.resourceTrend = {
      seawater: this.resources.seawater - this.previousResources.seawater,
      freshWater: this.resources.freshWater - this.previousResources.freshWater,
      heat: this.resources.heat - this.previousResources.heat,
      electricity: this.resources.electricity - this.previousResources.electricity,
      population: this.resources.population - this.previousResources.population,
      happiness: this.resources.happiness - this.previousResources.happiness,
    };
  }

  private processPopulation(): void {
    const { happiness, freshWater, heat, population } = this.resources;

    if (population <= 0) return;

    const hasMicrorayons = this.buildings.some(b => b.type === 'microrayon');
    if (!hasMicrorayons) return;

    if (happiness > 60 && freshWater > 20 && heat > 20) {
      const growth = Math.max(1, Math.floor(population * 0.02));
      this.resources.population += growth;
      this.emit('populationChange', { delta: growth, reason: 'growth' });
    } else if (happiness < 30 || freshWater < 10 || heat < 10) {
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
          // Still count for consumption (they use resources even when unhappy)
          buildingCounts[building.type]++;
        }
      } else {
        buildingCounts[building.type]++;
      }
    }

    const seasonMultiplier = this.getSeasonMultiplier();

    for (const [type, count] of Object.entries(buildingCounts)) {
      if (count === 0) continue;

      const production = BUILDING_PRODUCTION[type as BuildingType];

      let canProduce = true;
      for (const [resource, amount] of Object.entries(production.consumes)) {
        let required = (amount ?? 0) * count;
        if (resource === 'heat' && type === 'microrayon') {
          required = Math.ceil(required * seasonMultiplier);
        }
        if (this.resources[resource as keyof Resources] < required) {
          canProduce = false;
          break;
        }
      }

      if (canProduce) {
        for (const [resource, amount] of Object.entries(production.consumes)) {
          let consumed = (amount ?? 0) * count;
          if (resource === 'heat' && type === 'microrayon') {
            consumed = Math.ceil(consumed * seasonMultiplier);
          }
          this.resources[resource as keyof Resources] -= consumed;
        }

        for (const [resource, amount] of Object.entries(production.produces)) {
          // Skip happiness for microrayons - handled separately below
          if (type === 'microrayon' && resource === 'happiness') continue;
          this.resources[resource as keyof Resources] += (amount ?? 0) * count;
        }
      }
    }

    // Handle microrayon happiness separately based on connection status
    // Connected microrayons produce happiness, disconnected ones deduct it
    const happinessGain = connectedMicrorayons * 1;
    const happinessLoss = disconnectedMicrorayons * 2;
    this.resources.happiness += happinessGain - happinessLoss;

    // Clamp happiness to 0-100 range
    this.resources.happiness = Math.max(0, Math.min(100, this.resources.happiness));
  }

  private processReactor(): void {
    const reactorCount = this.buildings.filter(b => b.type === 'reactor').length;
    const distillers = this.buildings.filter(b => b.type === 'distiller');
    
    let connectedDistillerCount = 0;
    if (this.connectionChecker) {
      connectedDistillerCount = distillers.filter(d => 
        this.connectionChecker!(d).isFullyOperational
      ).length;
    }

    if (reactorCount > 0) {
      const heatGenerated = reactorCount * 1;
      const coolingCapacity = connectedDistillerCount * 0.8;

      const netHeatIncrease = Math.max(0, heatGenerated - coolingCapacity);
      this.reactor.temperature += netHeatIncrease;
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

    if (this.resources.population <= 0 && this.buildings.some(b => b.type === 'microrayon')) {
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
    this.resourceTrend = { seawater: 0, freshWater: 0, heat: 0, electricity: 0, population: 0, happiness: 0 };
    this.reactor = { temperature: 0, coolingActive: false };
    this.buildings = [];
    this.day = 1;
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
        buildings: this.buildings.map(b => ({ id: b.id, type: b.type, gridX: b.gridX, gridZ: b.gridZ })),
        day: this.day,
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

      const data = JSON.parse(saved);
      this.resources = data.resources;
      this.previousResources = { ...data.resources };
      this.reactor = data.reactor;
      this.buildings = [];
      this.day = data.day;
      this.buildingIdCounter = data.buildingIdCounter || 0;
      this.gameOver = false;
      this.gameOverReason = undefined;
      this.resourceTrend = { seawater: 0, freshWater: 0, heat: 0, electricity: 0, population: 0, happiness: 0 };

      for (const b of data.buildings) {
        const building: Building = { id: b.id, type: b.type, gridX: b.gridX, gridZ: b.gridZ };
        this.buildings.push(building);
        this.emit('buildingPlaced', building);
      }

      this.emit('resourceChange', this.resources);
      this.emit('dayAdvance', this.day);
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
