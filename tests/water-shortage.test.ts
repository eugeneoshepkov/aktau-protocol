import { expect, mock, test } from 'bun:test';
import { STARTER_DISTRICT } from '../src/simulation/DistrictPlan';
import { GameState, WATER_REPAIR_DAYS } from '../src/simulation/GameState';

// Three connected homes draw 15 water a day from the starter plant's output of 12.
function districtWithDeficit(stock = 0): GameState {
  const city = new GameState();
  city.setConnectionChecker(() => ({ isFullyOperational: true }));
  for (const { type, x, z } of STARTER_DISTRICT) city.placeBuilding(type, x, z);
  city.placeBuilding('microrayon', 39, 15);
  city.placeBuilding('microrayon', 40, 12);
  city.addResources({ freshWater: stock - city.getResources().freshWater });
  return city;
}

test('only a missed delivery starts the seven-day drought clock', () => {
  const city = districtWithDeficit(3);
  const onShortage = mock();
  city.on('waterShortage', onShortage);
  city.tick();
  expect(city.getResources().freshWater).toBe(0);
  expect(city.getWaterRepairDays()).toBeNull();

  for (let days = WATER_REPAIR_DAYS; days > 0; days--) {
    city.tick();
    expect(city.getWaterRepairDays()).toBe(days);
    expect(city.getResources().freshWater).toBe(0);
    expect(city.isGameOver()).toBe(false);
    expect(onShortage).toHaveBeenCalledTimes(1);
  }
  city.tick();
  expect(city.getWaterRepairDays()).toBe(0);
  expect(city.getGameOverReason()).toBe('drought');
  expect(onShortage).toHaveBeenCalledTimes(1);
});

test('covering demand ends a shortage, even exactly at zero, and a new line restores the reserve', () => {
  const city = districtWithDeficit();
  const onShortage = mock();
  city.on('waterShortage', onShortage);
  city.tick();
  city.addResources({ freshWater: 3 });
  city.tick();
  expect(city.getResources().freshWater).toBe(0);
  expect(city.getWaterRepairDays()).toBeNull();

  city.tick();
  expect(onShortage).toHaveBeenCalledTimes(2);
  expect(city.getWaterRepairDays()).toBe(WATER_REPAIR_DAYS);
  city.placeBuilding('pump', 38, 7);
  city.placeBuilding('distiller', 40, 9);
  city.tick();
  expect(city.getWaterRepairDays()).toBeNull();
  expect(city.getResourceTrend().freshWater).toBeGreaterThan(0);
  expect(city.isGameOver()).toBe(false);
});

test('another fatal condition still ends a run during a water shortage', () => {
  const city = districtWithDeficit();
  const onShortage = mock();
  city.on('waterShortage', onShortage);
  city.addResources({ heat: -1000 });
  city.tick();
  expect(city.getGameOverReason()).toBe('freeze');
  expect(onShortage).not.toHaveBeenCalled();
});

test('saving preserves the remaining repair window and legacy cities start without one', () => {
  let saved: string;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      }
    }
  });
  try {
    const city = districtWithDeficit();
    city.tick();
    city.tick();
    expect(city.save()).toBe(true);
    const snapshot = JSON.parse(saved!);
    city.reset();
    expect(city.getWaterRepairDays()).toBeNull();
    const onShortage = mock();
    city.on('waterShortage', onShortage);
    expect(city.load()).toBe(true);
    expect(city.getWaterRepairDays()).toBe(WATER_REPAIR_DAYS - 1);
    city.tick();
    expect(city.getWaterRepairDays()).toBe(WATER_REPAIR_DAYS - 2);
    expect(onShortage).not.toHaveBeenCalled();

    for (const invalid of [0, -1, 1.5, WATER_REPAIR_DAYS + 1, '7']) {
      saved = JSON.stringify({ ...snapshot, waterRepairDays: invalid });
      expect(city.load()).toBe(false);
      expect(city.getWaterRepairDays()).toBe(WATER_REPAIR_DAYS - 2);
    }
    delete snapshot.waterRepairDays;
    saved = JSON.stringify(snapshot);
    expect(city.load()).toBe(true);
    expect(city.getWaterRepairDays()).toBeNull();
    city.tick();
    expect(onShortage).toHaveBeenCalledTimes(1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
