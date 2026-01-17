import { gameState, type GameEventCallback } from './GameState';

export interface GameEvent {
  id: string;
  name: string;
  icon: string;
  chance: number;
  duration: number;
  effect: () => void;
  onEnd?: () => void;
  seasonRestriction?: 'spring' | 'summer' | 'autumn' | 'winter';
  visualEffect?: 'snow' | 'frost' | 'sandstorm';
}

interface ActiveEvent {
  event: GameEvent;
  remainingDays: number;
}

const EVENTS: GameEvent[] = [
  // Year-round events
  {
    id: 'sandstorm',
    name: 'Sandstorm',
    icon: '🌪️',
    chance: 0.02,
    duration: 5,
    effect: () => {},
    onEnd: () => {},
    visualEffect: 'sandstorm'
  },
  {
    id: 'cold_snap',
    name: 'Cold Snap',
    icon: '🥶',
    chance: 0.02,
    duration: 3,
    effect: () => {},
    onEnd: () => {},
    visualEffect: 'frost'
  },
  {
    id: 'equipment_failure',
    name: 'Equipment Failure',
    icon: '⚠️',
    chance: 0.01,
    duration: 2,
    effect: () => {},
    onEnd: () => {}
  },
  {
    id: 'population_surge',
    name: 'Population Surge',
    icon: '📈',
    chance: 0.015,
    duration: 7,
    effect: () => {},
    onEnd: () => {}
  },
  // Winter-only events
  {
    id: 'blizzard',
    name: 'Blizzard',
    icon: '🌨️',
    chance: 0.04,
    duration: 4,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'winter',
    visualEffect: 'snow'
  },
  {
    id: 'arctic_front',
    name: 'Arctic Front',
    icon: '❄️',
    chance: 0.02,
    duration: 5,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'winter',
    visualEffect: 'frost'
  },
  {
    id: 'pipe_freeze',
    name: 'Pipe Freeze',
    icon: '🧊',
    chance: 0.02,
    duration: 2,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'winter'
  }
];

class EventSystemClass {
  private activeEvents: ActiveEvent[] = [];
  private listeners: Set<(events: ActiveEvent[]) => void> = new Set();
  private modifiers = {
    pumpEfficiency: 1,
    heatMultiplier: 1,
    electricityMultiplier: 1,
    happinessBonus: 0,
    waterMultiplier: 1
  };

  constructor() {
    gameState.on('dayAdvance', this.onDayAdvance.bind(this) as GameEventCallback);
  }

  private onDayAdvance(): void {
    this.tickActiveEvents();
    this.tryTriggerNewEvent();
    this.applyModifiers();
  }

  private tickActiveEvents(): void {
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      this.activeEvents[i].remainingDays--;
      if (this.activeEvents[i].remainingDays <= 0) {
        const ended = this.activeEvents.splice(i, 1)[0];
        ended.event.onEnd?.();
      }
    }
    this.notifyListeners();
  }

  private tryTriggerNewEvent(): void {
    const currentSeason = gameState.getSeason();

    for (const event of EVENTS) {
      // Skip events already active
      if (this.activeEvents.some((a) => a.event.id === event.id)) continue;

      // Skip events restricted to a different season
      if (event.seasonRestriction && event.seasonRestriction !== currentSeason) continue;

      if (Math.random() < event.chance) {
        this.activeEvents.push({
          event,
          remainingDays: event.duration
        });
        event.effect();
        this.notifyListeners();
        break;
      }
    }
  }

  private applyModifiers(): void {
    this.modifiers = {
      pumpEfficiency: 1,
      heatMultiplier: 1,
      electricityMultiplier: 1,
      happinessBonus: 0,
      waterMultiplier: 1
    };

    for (const active of this.activeEvents) {
      switch (active.event.id) {
        case 'sandstorm':
          this.modifiers.pumpEfficiency = 0.5;
          break;
        case 'cold_snap':
          // Cold snap: +50% heat consumption
          this.modifiers.heatMultiplier = Math.max(this.modifiers.heatMultiplier, 1.5);
          break;
        case 'equipment_failure':
          this.modifiers.electricityMultiplier = 0.7;
          break;
        case 'population_surge':
          this.modifiers.happinessBonus = 10;
          break;
        case 'blizzard':
          // Blizzard: +100% heat consumption (doubles it)
          this.modifiers.heatMultiplier = Math.max(this.modifiers.heatMultiplier, 2.0);
          break;
        case 'arctic_front':
          // Arctic front: +80% heat consumption
          this.modifiers.heatMultiplier = Math.max(this.modifiers.heatMultiplier, 1.8);
          break;
        case 'pipe_freeze':
          // Pipe freeze: 50% water production
          this.modifiers.waterMultiplier = 0.5;
          break;
      }
    }
  }

  public getModifiers() {
    return { ...this.modifiers };
  }

  public getActiveEvents(): readonly ActiveEvent[] {
    return this.activeEvents;
  }

  public onEventsChange(callback: (events: ActiveEvent[]) => void): void {
    this.listeners.add(callback);
  }

  public offEventsChange(callback: (events: ActiveEvent[]) => void): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb([...this.activeEvents]);
    }
  }

  public reset(): void {
    this.activeEvents = [];
    this.modifiers = {
      pumpEfficiency: 1,
      heatMultiplier: 1,
      electricityMultiplier: 1,
      happinessBonus: 0,
      waterMultiplier: 1
    };
    this.notifyListeners();
  }
}

export const eventSystem = new EventSystemClass();
