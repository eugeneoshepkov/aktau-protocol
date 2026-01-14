import { gameState, type GameEventCallback } from './GameState';

export interface GameEvent {
  id: string;
  name: string;
  icon: string;
  chance: number;
  duration: number;
  effect: () => void;
  onEnd?: () => void;
}

interface ActiveEvent {
  event: GameEvent;
  remainingDays: number;
}

const EVENTS: GameEvent[] = [
  {
    id: 'sandstorm',
    name: 'Sandstorm',
    icon: '🌪️',
    chance: 0.02,
    duration: 5,
    effect: () => {},
    onEnd: () => {}
  },
  {
    id: 'cold_snap',
    name: 'Cold Snap',
    icon: '🥶',
    chance: 0.02,
    duration: 3,
    effect: () => {},
    onEnd: () => {}
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
  }
];

class EventSystemClass {
  private activeEvents: ActiveEvent[] = [];
  private listeners: Set<(events: ActiveEvent[]) => void> = new Set();
  private modifiers = {
    pumpEfficiency: 1,
    heatMultiplier: 1,
    electricityMultiplier: 1,
    happinessBonus: 0
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
    for (const event of EVENTS) {
      if (this.activeEvents.some((a) => a.event.id === event.id)) continue;

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
      happinessBonus: 0
    };

    for (const active of this.activeEvents) {
      switch (active.event.id) {
        case 'sandstorm':
          this.modifiers.pumpEfficiency = 0.5;
          break;
        case 'cold_snap':
          this.modifiers.heatMultiplier = 1.5;
          break;
        case 'equipment_failure':
          this.modifiers.electricityMultiplier = 0.7;
          break;
        case 'population_surge':
          this.modifiers.happinessBonus = 10;
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
      happinessBonus: 0
    };
    this.notifyListeners();
  }
}

export const eventSystem = new EventSystemClass();
