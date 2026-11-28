import { expect, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { PipeManager } from '../src/managers/PipeManager';
import { STARTER_DISTRICT } from '../src/simulation/DistrictPlan';
import { GameState, gameState } from '../src/simulation/GameState';

test('the first inland home earns a lasting district record when both services reach it', () => {
  const city = new GameState();
  using lots = spyOn(gameState, 'getBuildings').mockImplementation(() => city.getBuildings());
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  city.on('buildingPlaced', () => pipes.rebuildPipes());
  city.on('buildingRemoved', () => pipes.rebuildPipes());
  city.setConnectionChecker(home => ({ isFullyOperational: pipes.isFullyOperational(home) }));

  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved = '';
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => { saved = value; }
    }
  });
  try {
    for (const { type, x, z } of STARTER_DISTRICT) city.placeBuilding(type, x, z);
    const nearPlant = city.placeBuilding('microrayon', 38, 17)!;
    expect(pipes.isFullyOperational(nearPlant)).toBe(true);
    expect(city.hasConnectedInlandHome()).toBe(false);
    city.removeBuilding(nearPlant.id);

    const home = city.placeBuilding('microrayon', 35, 23)!;
    expect(pipes.isFullyOperational(home)).toBe(false);
    expect(city.hasConnectedInlandHome()).toBe(false);
    const main = city.placeBuilding('water_tank', 35, 19)!;
    expect(pipes.isFullyOperational(home)).toBe(true);
    expect(city.hasConnectedInlandHome()).toBe(true);

    expect(city.save()).toBe(true);
    const legacy = JSON.parse(saved);
    delete legacy.inlandHomeConnected;
    saved = JSON.stringify(legacy);
    city.reset();
    expect(city.hasConnectedInlandHome()).toBe(false);
    expect(city.load()).toBe(true);
    expect(city.hasConnectedInlandHome()).toBe(true);

    city.removeBuilding(main.id);
    city.removeBuilding(home.id);
    expect(city.save()).toBe(true);
    city.reset();
    expect(city.load()).toBe(true);
    expect(city.hasConnectedInlandHome()).toBe(true);

    city.reset();
    for (const { type, x, z } of STARTER_DISTRICT) {
      if (type !== 'water_tank') city.placeBuilding(type, x, z);
    }
    city.placeBuilding('water_tank', 35, 20);
    const waterOnly = city.placeBuilding('microrayon', 35, 17)!;
    expect(pipes.isSuppliedWith(waterOnly, 'freshWater')).toBe(true);
    expect(pipes.isSuppliedWith(waterOnly, 'heat')).toBe(false);
    expect(city.hasConnectedInlandHome()).toBe(false);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    engine.dispose();
  }
});
