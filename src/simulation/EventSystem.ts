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
  visualEffect?: 'snow' | 'frost' | 'sandstorm' | 'heat';
}

interface ActiveEvent {
  event: GameEvent;
  remainingDays: number;
}

// A subscription or save restore synchronizes the scene without replaying a weather cue.
type EventsListener = (events: ActiveEvent[], reason: 'sync' | 'change') => void;

const EVENTS: GameEvent[] = [
  // Year-round events
  {
    id: 'sandstorm',
    name: 'Sandstorm',
    icon: '🌪️',
    chance: 0.04,
    duration: 5,
    effect: () => {},
    onEnd: () => {},
    visualEffect: 'sandstorm'
  },
  {
    id: 'cold_snap',
    name: 'Cold Snap',
    icon: '🥶',
    chance: 0.04,
    duration: 3,
    effect: () => {},
    onEnd: () => {},
    visualEffect: 'frost'
  },
  {
    id: 'equipment_failure',
    name: 'Equipment Failure',
    icon: '⚠️',
    chance: 0.03,
    duration: 2,
    effect: () => {},
    onEnd: () => {}
  },
  {
    id: 'population_surge',
    name: 'Population Surge',
    icon: '📈',
    chance: 0.03,
    duration: 7,
    effect: () => {},
    onEnd: () => {}
  },
  {
    id: 'reactor_scram',
    name: 'Reactor SCRAM',
    icon: '☢️',
    chance: 0.015,
    duration: 3,
    effect: () => {
      // Instant: spike reactor temp by 15°C
      gameState.adjustReactorTemp(15);
    },
    onEnd: () => {}
  },
  {
    id: 'water_contamination',
    name: 'Water Contamination',
    icon: '☣️',
    chance: 0.02,
    duration: 4,
    effect: () => {
      // Instant: lose 30% of freshwater
      const resources = gameState.getResources();
      const loss = Math.floor(resources.freshWater * 0.3);
      gameState.addResources({ freshWater: -loss });
    },
    onEnd: () => {}
  },
  {
    id: 'favorable_winds',
    name: 'Favorable Winds',
    icon: '💨',
    chance: 0.02,
    duration: 5,
    effect: () => {},
    onEnd: () => {}
  },
  // Summer-only events
  {
    id: 'heat_wave',
    name: 'Heat Wave',
    icon: '🌡️',
    chance: 0.05,
    duration: 4,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'summer',
    visualEffect: 'heat'
  },
  {
    id: 'algae_bloom',
    name: 'Algae Bloom',
    icon: '🦠',
    chance: 0.04,
    duration: 5,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'summer'
  },
  // Winter-only events
  {
    id: 'blizzard',
    name: 'Blizzard',
    icon: '🌨️',
    chance: 0.06,
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
    chance: 0.04,
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
    chance: 0.04,
    duration: 2,
    effect: () => {},
    onEnd: () => {},
    seasonRestriction: 'winter'
  }
];

class EventSystemClass {
  private activeEvents: ActiveEvent[] = [];
  private listeners = new Set<EventsListener>();
  private modifiers = {
    pumpEfficiency: 1,
    heatMultiplier: 1,
    electricityMultiplier: 1,
    happinessBonus: 0,
    waterMultiplier: 1
  };
  
  // Guaranteed event cadence tracking
  private daysSinceLastEvent: number = 0;
  private readonly MIN_EVENT_INTERVAL = 8;
  private readonly FORCED_EVENT_INTERVAL = 20; // Force event after this many days

  constructor() {
    gameState.on('dayAdvance', this.onDayAdvance.bind(this) as GameEventCallback);
    gameState.setWeatherPersistence({
      save: () => ({
        daysSinceLastEvent: this.daysSinceLastEvent,
        activeEvents: this.activeEvents.map(({ event, remainingDays }) => ({
          id: event.id,
          remainingDays
        }))
      }),
      restore: (snapshot) => this.restore(snapshot)
    });
  }

  private restore(snapshot: unknown): boolean {
    if (snapshot === undefined) {
      this.reset();
      return true;
    }
    if (!snapshot || typeof snapshot !== 'object') return false;
    const { daysSinceLastEvent, activeEvents } = snapshot as Record<string, unknown>;
    if (
      typeof daysSinceLastEvent !== 'number' ||
      !Number.isSafeInteger(daysSinceLastEvent) ||
      daysSinceLastEvent < 0 ||
      daysSinceLastEvent > this.FORCED_EVENT_INTERVAL ||
      !Array.isArray(activeEvents)
    )
      return false;
    const restored: ActiveEvent[] = [];
    for (const entry of activeEvents) {
      const event = EVENTS.find((e) => e.id === entry?.id);
      if (
        !event ||
        !Number.isSafeInteger(entry.remainingDays) ||
        entry.remainingDays < 1 ||
        entry.remainingDays > event.duration ||
        restored.some((item) => item.event === event)
      )
        return false;
      restored.push({ event, remainingDays: entry.remainingDays });
    }
    this.daysSinceLastEvent = daysSinceLastEvent;
    this.activeEvents = restored;
    this.applyModifiers();
    this.notifyListeners('sync');
    return true;
  }

  private onDayAdvance(): void {
    if (gameState.getDay() <= 8) return;
    this.tickActiveEvents();
    this.daysSinceLastEvent++;
    if (this.daysSinceLastEvent < this.MIN_EVENT_INTERVAL) {
      this.applyModifiers();
      return;
    }

    // Scale event chances based on time since last event
    const urgencyMultiplier = Math.min(3, 1 + (this.daysSinceLastEvent / this.MIN_EVENT_INTERVAL));
    
    if (!this.tryTriggerNewEvent(urgencyMultiplier)) {
      // Force an event if it's been too long
      if (this.daysSinceLastEvent >= this.FORCED_EVENT_INTERVAL) {
        this.forceRandomEvent();
      }
    }
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

  private tryTriggerNewEvent(urgencyMultiplier: number = 1): boolean {
    const currentSeason = gameState.getSeason();

    for (const event of EVENTS) {
      // Skip events already active
      if (this.activeEvents.some((a) => a.event.id === event.id)) continue;

      // Skip events restricted to a different season
      if (event.seasonRestriction && event.seasonRestriction !== currentSeason) continue;

      // Apply urgency multiplier to increase chance over time
      const adjustedChance = event.chance * urgencyMultiplier;
      
      if (Math.random() < adjustedChance) {
        this.activeEvents.push({
          event,
          remainingDays: event.duration
        });
        event.effect();
        this.daysSinceLastEvent = 0; // Reset counter on successful trigger
        this.notifyListeners();
        return true;
      }
    }
    return false;
  }

  private forceRandomEvent(): void {
    const currentSeason = gameState.getSeason();
    
    // Get eligible events (not active, correct season)
    const eligibleEvents = EVENTS.filter(event => {
      if (this.activeEvents.some(a => a.event.id === event.id)) return false;
      if (event.seasonRestriction && event.seasonRestriction !== currentSeason) return false;
      return true;
    });
    
    if (eligibleEvents.length === 0) return;
    
    // Pick a random eligible event
    const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
    
    this.activeEvents.push({
      event,
      remainingDays: event.duration
    });
    event.effect();
    this.daysSinceLastEvent = 0; // Reset counter
    this.notifyListeners();
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
        case 'heat_wave':
          // Heat wave: pumps work harder, 30% less electricity production
          this.modifiers.electricityMultiplier = Math.min(this.modifiers.electricityMultiplier, 0.7);
          break;
        case 'algae_bloom':
          // Algae clogs intake: 40% pump efficiency
          this.modifiers.pumpEfficiency = Math.min(this.modifiers.pumpEfficiency, 0.6);
          break;
        case 'reactor_scram':
          // Emergency shutdown: reactor produces less power, 50% electricity
          this.modifiers.electricityMultiplier = Math.min(this.modifiers.electricityMultiplier, 0.5);
          break;
        case 'water_contamination':
          // Contaminated: 50% water production
          this.modifiers.waterMultiplier = Math.min(this.modifiers.waterMultiplier, 0.5);
          break;
        case 'favorable_winds':
          // Good cooling: +20% pump efficiency
          this.modifiers.pumpEfficiency = Math.max(this.modifiers.pumpEfficiency, 1.2);
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
  
  public getDaysSinceLastEvent(): number {
    return this.daysSinceLastEvent;
  }

  public onEventsChange(callback: EventsListener): () => void {
    this.listeners.add(callback);
    callback([...this.activeEvents], 'sync');
    return () => this.offEventsChange(callback);
  }

  public offEventsChange(callback: EventsListener): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(reason: 'sync' | 'change' = 'change'): void {
    for (const cb of this.listeners) {
      cb([...this.activeEvents], reason);
    }
  }

  public reset(): void {
    this.activeEvents = [];
    this.daysSinceLastEvent = 0;
    this.modifiers = {
      pumpEfficiency: 1,
      heatMultiplier: 1,
      electricityMultiplier: 1,
      happinessBonus: 0,
      waterMultiplier: 1
    };
    this.notifyListeners('sync');
  }
}

export const eventSystem = new EventSystemClass();
