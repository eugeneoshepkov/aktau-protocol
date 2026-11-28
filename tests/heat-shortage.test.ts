import { expect, mock, test } from 'bun:test';
import { GameState, HEAT_REPAIR_DAYS, WATER_REPAIR_DAYS } from '../src/simulation/GameState';

function onDay(day: number): GameState {
  const city = new GameState();
  while (city.getDay() < day) city.tick();
  city.setConnectionChecker(() => ({ isFullyOperational: true, hasHeat: true }));
  return city;
}

function homeOn(day: number, heat = 0): GameState {
  const city = onDay(day);
  city.placeBuilding('microrayon', 37, 15);
  city.addResources({ heat: heat - city.getResources().heat });
  return city;
}

test('a missed winter delivery starts one repair window; heat exactly meeting demand avoids it', () => {
  const city = homeOn(91, 10);
  const onHeat = mock();
  city.on('heatShortage', onHeat);
  city.tick();
  expect(city.getResources().heat).toBe(0);
  expect(city.getHeatRepairDays()).toBeNull();
  for (let remaining = HEAT_REPAIR_DAYS; remaining > 0; remaining--) {
    city.tick();
    expect(city.getHeatRepairDays()).toBe(remaining);
    expect(city.getResources().heat).toBe(0);
    expect(city.isGameOver()).toBe(false);
    expect(onHeat).toHaveBeenCalledTimes(1);
  }
  city.tick();
  expect(city.getHeatRepairDays()).toBe(0);
  expect(city.getGameOverReason()).toBe('freeze');
  expect(onHeat).toHaveBeenCalledTimes(1);
});

test('restoring heat before the deadline can save a district still short on water', () => {
  const city = homeOn(91);
  const onHeat = mock();
  const onWater = mock();
  city.on('heatShortage', onHeat);
  city.on('waterShortage', onWater);
  city.addResources({ freshWater: -city.getResources().freshWater });
  city.tick();
  expect([city.getWaterRepairDays(), city.getHeatRepairDays()]).toEqual([
    WATER_REPAIR_DAYS,
    HEAT_REPAIR_DAYS
  ]);
  city.placeBuilding('thermal_plant', 39, 15);
  city.tick();
  expect(city.getHeatRepairDays()).toBeNull();
  expect(city.getWaterRepairDays()).toBe(WATER_REPAIR_DAYS - 1);
  expect(city.getResources().heat).toBeGreaterThan(0);
  expect(onHeat).toHaveBeenCalledTimes(1);
  expect(onWater).toHaveBeenCalledTimes(1);
});

test('unheated housing only starts an emergency when residents cannot fit in heated homes', () => {
  const city = homeOn(91, 180);
  let heatingRestored = false;
  city.setConnectionChecker((building) => {
    const supplied = building.gridX === 37 || heatingRestored;
    return { isFullyOperational: supplied, hasHeat: supplied };
  });
  city.placeBuilding('microrayon', 39, 15);
  city.tick();
  expect(city.getResources().population).toBe(50);
  expect(city.hasUnheatedResidents()).toBe(false);
  expect(city.getHeatRepairDays()).toBeNull();
  city.addResources({ population: 1 });
  city.tick();
  expect(city.getResources().heat).toBeGreaterThan(0);
  expect(city.hasUnheatedResidents()).toBe(true);
  expect(city.getHeatRepairDays()).toBe(HEAT_REPAIR_DAYS);
  heatingRestored = true;
  city.tick();
  expect(city.getHeatRepairDays()).toBeNull();
});

test('warm shortages clamp at zero, and the spring thaw clears winter repairs', () => {
  const city = homeOn(90);
  const onHeat = mock();
  city.on('heatShortage', onHeat);
  city.tick();
  expect(city.getDay()).toBe(91);
  expect(city.getResources().heat).toBe(0);
  expect(city.getHeatRepairDays()).toBeNull();
  city.tick();
  expect(city.getHeatRepairDays()).toBe(HEAT_REPAIR_DAYS);
  expect(onHeat).toHaveBeenCalledTimes(1);

  const thaw = homeOn(119);
  thaw.tick();
  expect(thaw.getHeatRepairDays()).toBe(HEAT_REPAIR_DAYS);
  thaw.tick();
  expect(thaw.getDay()).toBe(121);
  expect(thaw.getHeatRepairDays()).toBeNull();

  const lastWinterDay = homeOn(120);
  lastWinterDay.on('heatShortage', onHeat);
  lastWinterDay.tick();
  expect(lastWinterDay.getSeason()).toBe('spring');
  expect(lastWinterDay.getHeatRepairDays()).toBeNull();
  expect(onHeat).toHaveBeenCalledTimes(1);

  const expired = homeOn(115);
  while (!expired.isGameOver() && expired.getDay() < 121) expired.tick();
  expect(expired.getDay()).toBe(120);
  expect(expired.getGameOverReason()).toBe('freeze');
});

test('a saved winter shortage retains time, and older saves start without a heat clock', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved = '';
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
    const city = homeOn(91);
    const onHeat = mock();
    city.tick();
    city.tick();
    expect(city.save()).toBe(true);
    const snapshot = JSON.parse(saved);
    city.reset();
    expect(city.getHeatRepairDays()).toBeNull();
    city.on('heatShortage', onHeat);
    expect(city.load()).toBe(true);
    expect(city.getHeatRepairDays()).toBe(HEAT_REPAIR_DAYS - 1);
    city.tick();
    expect(city.getHeatRepairDays()).toBe(HEAT_REPAIR_DAYS - 2);
    expect(onHeat).not.toHaveBeenCalled();
    for (const days of [0, -1, HEAT_REPAIR_DAYS + 1, 0.5, '2']) {
      saved = JSON.stringify({ ...snapshot, heatRepairDays: days });
      expect(city.load()).toBe(false);
    }
    saved = JSON.stringify({ ...snapshot, day: 121 });
    expect(city.load()).toBe(false);
    delete snapshot.heatRepairDays;
    saved = JSON.stringify(snapshot);
    expect(city.load()).toBe(true);
    expect(city.getHeatRepairDays()).toBeNull();
    city.tick();
    expect(onHeat).toHaveBeenCalledTimes(1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
