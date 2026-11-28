import { expect, test } from 'bun:test';
import { GameState } from '../src/simulation/GameState';

test('a diagnostic report captures the live district without overwriting the save or logging previews', () => {
  const city = new GameState();
  const pump = city.placeBuilding('pump', 35, 9)!;
  city.setWeatherPersistence({
    save: () => ({ activeEvents: ['sandstorm'] }),
    restore: () => true
  });
  const first = city.getDiagnosticReport();
  expect(first.actions).toEqual([]); // Initial map construction is not a player action.
  const check = city.canPlaceBuilding('pump', 24, 24, 'rock');
  expect(check.canPlace).toBe(false);
  expect(city.getDiagnosticReport().actions).toEqual([]);

  city.recordBuildRejected('pump', check.reason!, { x: 24, z: 24 });
  city.tick();
  city.recordBuildRejected('thermal_plant', 'Needs 4 housing blocks');
  const report = city.getDiagnosticReport(() => ({
    operational: true,
    missing: []
  }));
  expect(report.formatVersion).toBe(1);
  expect(report.city.weather).toEqual({ activeEvents: ['sandstorm'] });
  expect(report.buildingStatus).toEqual([
    { id: pump.id, operational: true, missing: [] }
  ]);
  expect(report.actions).toMatchObject([
    {
      day: 1,
      step: 1,
      action: 'buildRejected',
      subject: 'pump',
      gridX: 24,
      gridZ: 24,
      reason: check.reason
    },
    { day: 2, step: 2, action: 'buildRejected', subject: 'thermal_plant' }
  ]);
  expect(first.city.resources.electricity).toBeGreaterThan(report.city.resources.electricity);
  expect(report.actions[0].resources).toEqual(first.city.resources);
  expect(report.actions[1].resources).toEqual(report.city.resources);

  city.removeBuilding(pump.id);
  city.adjustReactorTemp(100);
  const powerBefore = city.getResources().electricity;
  city.tick();
  const ending = city.getDiagnosticReport();
  expect(ending.actions.at(-1)).toMatchObject({ action: 'gameOver', subject: 'meltdown' });
  expect(ending.resourceTrend.electricity).toBe(ending.city.resources.electricity - powerBefore);
  expect(ending.resourceTrend.electricity).not.toBe(report.resourceTrend.electricity);
});

test('save and load preserve bounded, ordered history, including legacy and incomplete logs', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved: string | null = null;
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
    const city = new GameState();
    for (let i = 0; i < 170; i++) city.recordBuildRejected('pump', 'Invalid lot', { x: 1, z: 1 });
    const entries = city.getDiagnosticReport().actions;
    expect(entries).toHaveLength(160);
    expect(entries[0].step).toBe(11);
    expect(entries.at(-1)?.step).toBe(170);
    expect(city.save()).toBe(true);
    const archived = JSON.parse(saved!);
    city.recordAction('weather', 'blizzard');
    expect(city.getDiagnosticReport().actions.at(-1)?.subject).toBe('blizzard');
    expect(JSON.parse(saved!).actions).toEqual(entries);
    expect(city.load()).toBe(true);
    expect(city.getDiagnosticReport().actions.at(-1)).toMatchObject({
      action: 'loaded',
      step: 171
    });
    expect(city.getDiagnosticReport().actions.some((e) => e.subject === 'blizzard')).toBe(false);

    saved = JSON.stringify({ ...archived, actions: [null, { bad: 'entry' }, entries[0]] });
    expect(city.load()).toBe(true);
    expect(city.getDiagnosticReport().actions.map((e) => e.action)).toEqual([
      'buildRejected',
      'loaded'
    ]);
    delete archived.actions;
    saved = JSON.stringify(archived);
    expect(city.load()).toBe(true);
    expect(city.getDiagnosticReport().actions).toMatchObject([
      { action: 'loaded', reason: 'Earlier actions were not recorded' }
    ]);
    city.reset();
    expect(city.getDiagnosticReport().actions).toEqual([]);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
