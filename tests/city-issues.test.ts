import { expect, spyOn, test } from 'bun:test';
import { gameState } from '../src/simulation/GameState';
import { STARTING_RESOURCES, type Building } from '../src/types';

test('city status warns about imminent shortages and groups buildings by the supply they actually lack', async () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'en' } });
  try {
    const { getCityIssues } = await import('../src/ui/cityIssues');
    const resources = { ...STARTING_RESOURCES, heat: 151 };
    const trends = { heat: -49, freshWater: 0, seawater: 0, happiness: 0, electricity: 0, population: 0 };
    const buildings: Building[] = [];
    using stock = spyOn(gameState, 'getResources').mockReturnValue(resources);
    using change = spyOn(gameState, 'getResourceTrend').mockReturnValue(trends);
    using lots = spyOn(gameState, 'getBuildings').mockReturnValue(buildings);
    using active = spyOn(gameState, 'isGameOver').mockReturnValue(false);
    using reactor = spyOn(gameState, 'getReactorState').mockReturnValue({ temperature: 0, coolingActive: false });
    const pipes = { isSuppliedWith: (_b: Building, resource: string) => resource === 'heat' };

    expect(getCityIssues(pipes)).toEqual([]);
    resources.heat = 98;
    expect(getCityIssues(pipes)).toMatchObject([{ id: 'heat', critical: false }]);
    resources.heat = 6;
    expect(getCityIssues(pipes)).toMatchObject([{ id: 'heat', critical: true }]);

    buildings.push(
      { type: 'microrayon', id: 'first', gridX: 35, gridZ: 12 },
      { type: 'microrayon', id: 'second', gridX: 38, gridZ: 12 }
    );
    expect(getCityIssues(pipes)).toMatchObject([
      { id: 'heat', critical: true },
      { id: 'microrayon.water', buildings: [...buildings] }
    ]);
    resources.heat = 151;
    expect(getCityIssues({ isSuppliedWith: () => true })).toEqual([]);
  } finally {
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
