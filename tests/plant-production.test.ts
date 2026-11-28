import { expect, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { PipeManager } from '../src/managers/PipeManager';
import { STARTER_DISTRICT } from '../src/simulation/DistrictPlan';
import { GameState, gameState } from '../src/simulation/GameState';

test('an intake slowdown keeps one desalination line running and cooling the reactor', () => {
  const city = new GameState();
  for (const { type, x, z } of STARTER_DISTRICT) city.placeBuilding(type, x, z);
  city.placeBuilding('pump', 38, 7);
  city.placeBuilding('distiller', 40, 9);
  city.placeBuilding('microrayon', 39, 15);
  using lots = spyOn(gameState, 'getBuildings').mockReturnValue(city.getBuildings());
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  try {
    pipes.rebuildPipes();
    city.setConnectionChecker((b) => ({ isFullyOperational: pipes.isFullyOperational(b) }));
    expect(city.getOperationalCount('distiller')).toBe(2);
    expect(city.getOperationalCount('microrayon')).toBe(2);
    city.tick(); // Settle the district plan's one-time rewards before measuring production.
    const stocks = city.getResources();
    city.addResources({ freshWater: 1 - stocks.freshWater, seawater: -stocks.seawater });
    city.adjustReactorTemp(30 - city.getReactorState().temperature);
    const weather = {
      pumpEfficiency: 0.5,
      heatMultiplier: 1,
      electricityMultiplier: 1,
      happinessBonus: 0
    };
    city.setEventModifiersGetter(() => weather);

    city.tick();
    expect(stocks.seawater).toBe(0);
    expect(stocks.freshWater).toBe(3); // One plant makes 12 and the two homes use 10.
    expect(city.getWaterRepairDays()).toBeNull();
    expect(city.getReactorState().temperature).toBeCloseTo(30.2);

    weather.pumpEfficiency = 1;
    city.addResources({ electricity: -stocks.electricity });
    city.tick();
    expect(stocks.freshWater).toBe(17);
    expect(city.getReactorState().temperature).toBeCloseTo(29.6);

    weather.pumpEfficiency = 0;
    city.tick();
    expect(stocks.freshWater).toBe(7);
    expect(city.getReactorState().coolingActive).toBe(false);
    expect(city.getReactorState().temperature).toBeCloseTo(30.6);
  } finally {
    pipes.dispose();
    engine.dispose();
  }
});
