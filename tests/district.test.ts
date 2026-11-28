import { expect, mock, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { findSuitableLot, isBuildableLot } from '../src/grid/BuildingLots';
import { getTileTypeAt } from '../src/grid/TileTypes';
import { PipeManager } from '../src/managers/PipeManager';
import {
  CIVIC_PROJECTS,
  DISTRICT_ORDERS,
  FIELD_HOUSING,
  FIELD_RETURN_DELAY,
  STARTER_DISTRICT,
  type CivicProjectKind
} from '../src/simulation/DistrictPlan';
import { gameState } from '../src/simulation/GameState';
import { eventSystem } from '../src/simulation/EventSystem';
import type { BuildingType } from '../src/types';

test('the suggested district can earn its charter and host the Melovoye field season with connected housing', () => {
  using random = spyOn(Math, 'random').mockReturnValue(0.9999);
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    }
  });
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const pipes = new PipeManager(scene);
  gameState.setConnectionChecker((building) => ({
    isFullyOperational: pipes.isFullyOperational(building)
  }));
  const place = (type: BuildingType, x: number, z: number) => {
    expect(gameState.canPlaceBuilding(type, x, z, getTileTypeAt(x, z)).canPlace).toBe(true);
    return gameState.placeBuilding(type, x, z)!;
  };

  for (const { type, x, z } of STARTER_DISTRICT) place(type, x, z);
  const anchor = { x: 38, z: 12 };
  expect(findSuitableLot('microrayon', pipes, anchor, [[37, 15], [39, 15]])).toEqual({ x: 39, z: 15 });
  const waterBefore = gameState.getResources().freshWater;
  gameState.addResources({ freshWater: -waterBefore });
  expect(findSuitableLot('microrayon', pipes, anchor, [[39, 15]])).toEqual({ x: 39, z: 15 });
  expect(gameState.canPlaceBuilding('microrayon', 39, 15, getTileTypeAt(39, 15)).canPlace).toBe(false);
  gameState.addResources({ freshWater: waterBefore });
  for (const type of ['pump', 'water_tank'] as const) {
    const lot = findSuitableLot(type, pipes, { x: 0, z: 49 })!;
    expect(isBuildableLot(type, lot.x, lot.z)).toBe(true);
    expect(pipes.getLotConnections(type, lot.x, lot.z).water).toBe(true);
  }
  expect(pipes.getLotConnections('water_tank', 3, 28).water).toBe(false);
  // The starter reservoir and substation carry both utilities beyond the shore plants.
  expect(pipes.getLotConnections('microrayon', 35, 19)).toEqual({ water: true, heat: true });
  expect(pipes.getLotConnections('microrayon', 47, 16)).toEqual({ water: false, heat: true });
  // The existing distiller takes the pump's entire capacity. The tap readout and dashed
  // pipes must agree, even though the candidate is right beside a pump and a house.
  expect(findSuitableLot('distiller', pipes, anchor)).toBeNull();
  expect(pipes.getLotConnections('distiller', 35, 11)).toEqual({ water: false, heat: true });
  pipes.showConnectionPreview('distiller', 35, 11);
  const previewMaterials = scene.meshes.filter((m) => m.name.startsWith('preview_pipe_')).map((m) => m.material?.name);
  expect(previewMaterials).toContain('pipe_preview_heat');
  expect(previewMaterials).not.toContain('pipe_preview_water');
  pipes.hideConnectionPreview();
  expect(gameState.getCompletedOrders()).toBe(0);
  expect(gameState.startFieldSeason()).toBe(false);
  expect(gameState.commissionCivicProject('public_garden')).toBe(false);
  expect(gameState.getOrderProgress(DISTRICT_ORDERS[0])).toBe(1);
  const offGridHouse = place('microrayon', 25, 25);
  expect(gameState.getCompletedOrders()).toBe(0);
  gameState.removeBuilding(offGridHouse.id);
  const before = gameState.getResources().population;

  for (const [i, order] of DISTRICT_ORDERS.entries()) {
    if (!order.sites || order.measure === 'day' || order.measure === 'population') continue;
    for (const [x, z] of order.sites) {
      expect(pipes.wouldBeOperational(order.measure, x, z)).toBe(true);
      place(order.measure, x, z);
    }
    expect(gameState.getCompletedOrders()).toBe(i + 1);
    if (i === 0) {
      expect(gameState.getResources().population).toBe(before + 25);
      expect(gameState.save()).toBe(true);
      expect(gameState.load()).toBe(true);
      expect(gameState.getResources().population).toBe(before + 25);
      expect(gameState.getCompletedOrders()).toBe(1);
    }
  }
  const balance = { ...gameState.getResources() };
  expect(gameState.dispatchSupply('freshWater')).toBe(true);
  expect(gameState.getResources().electricity).toBe(balance.electricity - 60);
  expect(gameState.getResources().freshWater).toBe(balance.freshWater + 50);
  expect(gameState.dispatchSupply('heat')).toBe(false);
  expect(gameState.save()).toBe(true);
  expect(gameState.load()).toBe(true);
  expect(gameState.getNextDispatchDay()).toBe(11);
  expect(gameState.dispatchSupply('freshWater')).toBe(false);
  for (let i = 0; i < 120; i++) gameState.tick();
  expect(gameState.getDay()).toBe(121);
  expect(gameState.isGameOver()).toBe(false);
  expect(gameState.getResources().population).toBeGreaterThanOrEqual(180);
  expect(gameState.getCompletedOrders()).toBe(DISTRICT_ORDERS.length);

  expect(gameState.save()).toBe(true);
  const city = JSON.parse(storage.get('aktau-save')!);
  const charter = JSON.stringify(city);
  for (const kind of Object.keys(CIVIC_PROJECTS) as CivicProjectKind[]) {
    const material = CIVIC_PROJECTS[kind].resource;
    storage.set(
      'aktau-save',
      JSON.stringify({ ...city, resources: { ...city.resources, [material]: 39 } })
    );
    expect(gameState.load()).toBe(true);
    expect(gameState.commissionCivicProject(kind)).toBe(false);

    storage.set('aktau-save', charter);
    expect(gameState.load()).toBe(true);
    expect(gameState.commissionCivicProject(kind)).toBe(true);
    expect(gameState.getResources().electricity).toBe(city.resources.electricity - 80);
    expect(gameState.getResources()[material]).toBe(city.resources[material] - 40);
    expect(
      gameState.commissionCivicProject(
        kind === 'public_garden' ? 'district_heating' : 'public_garden'
      )
    ).toBe(false);
    const project = gameState.getCivicProject()!;
    expect(
      gameState.canPlaceBuilding('microrayon', project.gridX, project.gridZ, 'sand').canPlace
    ).toBe(false);
    expect(gameState.save()).toBe(true);
    expect(gameState.load()).toBe(true);
    expect(gameState.getCivicProject()).toEqual(project);
    expect(pipes.wouldBeOperational('microrayon', 37, 10)).toBe(true);
    place('microrayon', 37, 10);
    for (let day = 0; day < 30 && !gameState.isDistrictEstablished(); day++) {
      if (gameState.getResources().freshWater < 50) gameState.dispatchSupply('freshWater');
      gameState.tick();
    }
    expect(gameState.getResources().population).toBe(250);
    expect(gameState.isDistrictEstablished()).toBe(true);
    gameState.save();
    gameState.load();
    expect(gameState.isDistrictEstablished()).toBe(true);

    if (kind === 'public_garden') {
      const established = JSON.parse(storage.get('aktau-save')!);
      delete established.fieldSeason; // District saved before the field chapter existed.
      storage.set('aktau-save', JSON.stringify({ ...established, day: 151 }));
      expect(gameState.load()).toBe(true);
      expect(gameState.startFieldSeason()).toBe(false);
      storage.set('aktau-save', JSON.stringify(established));
      expect(gameState.load()).toBe(true);
      expect(gameState.getFieldSeason()).toBeNull();
      expect(gameState.startFieldSeason()).toBe(true);
      expect(gameState.startFieldSeason()).toBe(false);
      expect(gameState.chooseFieldCrew(false)).toBe(false);
      const [x, z] = FIELD_HOUSING.sites![0];
      expect(pipes.wouldBeOperational('microrayon', x, z)).toBe(true);
      place('microrayon', x, z);
      expect(gameState.getOrderProgress(FIELD_HOUSING)).toBe(6);

      gameState.save();
      const housing = storage.get('aktau-save')!;
      for (const send of [true, false]) {
        storage.set('aktau-save', housing);
        expect(gameState.load()).toBe(true);
        expect(gameState.getFieldSeason()).toEqual({ phase: 'housing' });
        const day = gameState.getDay();
        if (!send) {
          expect(gameState.dispatchSupply('freshWater')).toBe(true);
          expect(gameState.chooseFieldCrew(true)).toBe(false);
        }
        const nextDispatch = gameState.getNextDispatchDay();
        const power = gameState.getResources().electricity;
        const completionDay = day + (send ? 10 : 20);
        expect(gameState.chooseFieldCrew(send)).toBe(true);
        expect(gameState.chooseFieldCrew(!send)).toBe(false);
        expect(gameState.getNextDispatchDay()).toBe(send ? day + 10 : nextDispatch);
        expect(gameState.getResources().electricity).toBe(power);
        if (send) expect(gameState.dispatchSupply('freshWater')).toBe(false);

        gameState.save();
        gameState.load();
        expect(gameState.getFieldSeason()).toEqual({ phase: 'trial', sentCrew: send, completionDay });
        for (let d = day; d < completionDay - 1; d++) gameState.tick();
        expect(gameState.getFieldSeason()?.phase).toBe('trial');
        gameState.tick();
        expect(gameState.getFieldSeason()?.phase).toBe('tower');
        gameState.save();
        const tower = JSON.parse(storage.get('aktau-save')!);
        storage.set('aktau-save', JSON.stringify({ ...tower, day: completionDay + FIELD_RETURN_DELAY - 1 }));
        expect(gameState.load()).toBe(true);
        expect(gameState.getFieldSeason()?.phase).toBe('tower');
        const fieldChanged = mock(() => {});
        gameState.on('fieldSeasonChange', fieldChanged);
        gameState.tick();
        gameState.tick();
        expect(fieldChanged).toHaveBeenCalledTimes(1);
        gameState.off('fieldSeasonChange', fieldChanged);
        expect(gameState.getFieldSeason()?.phase).toBe('returned');
        gameState.save();
        expect(gameState.load()).toBe(true);
        expect(gameState.getFieldSeason()?.phase).toBe('returned');
        expect(gameState.startFieldSeason()).toBe(false);
      }
    }

    // Compare one day of operation on identical uncapped reserves.
    const starting = { ...city.resources, freshWater: 90, heat: 60 };
    const use = (withProject: boolean) => {
      storage.set(
        'aktau-save',
        JSON.stringify({ ...city, resources: starting, civicProject: withProject ? project : null })
      );
      expect(gameState.load()).toBe(true);
      gameState.tick();
      return gameState.getResources()[material];
    };
    expect(use(true)).toBeGreaterThan(use(false));
  }
  storage.set('aktau-save', charter);
  gameState.load();
  place('microrayon', 31, 12);
  expect(gameState.commissionCivicProject('public_garden')).toBe(true);
  expect(gameState.getCivicProject()).not.toMatchObject({ gridX: 31, gridZ: 12 });

  // Loading a storm must not sound a fresh arrival. A new storm still lasts five days.
  const beforeStorm = { ...city, day: 16, weather: { daysSinceLastEvent: 7, activeEvents: [] } };
  storage.set('aktau-save', JSON.stringify(beforeStorm));
  expect(gameState.load()).toBe(true);
  const weatherChanges = mock((_reason: string, _days: number) => {});
  const stopWeather = eventSystem.onEventsChange((events, reason) =>
    weatherChanges(reason, events.find(({ event }) => event.id === 'sandstorm')?.remainingDays ?? 0)
  );
  expect(weatherChanges).toHaveBeenLastCalledWith('sync', 0);
  random.mockReturnValue(0);
  gameState.tick();
  random.mockReturnValue(0.9999);
  expect(weatherChanges).toHaveBeenLastCalledWith('change', 5);
  expect(gameState.save()).toBe(true);
  expect(gameState.load()).toBe(true);
  expect(weatherChanges).toHaveBeenLastCalledWith('sync', 5);
  for (let day = 0; day < 5; day++) {
    expect(eventSystem.getModifiers().pumpEfficiency).toBe(0.5);
    gameState.tick();
  }
  expect(weatherChanges).toHaveBeenLastCalledWith('change', 0);
  expect(eventSystem.getModifiers().pumpEfficiency).toBe(1);
  stopWeather();

  city.day = 98;
  city.weather = { daysSinceLastEvent: 2, activeEvents: [{ id: 'blizzard', remainingDays: 3 }] };
  storage.set('aktau-save', JSON.stringify(city));
  expect(gameState.load()).toBe(true);
  expect(eventSystem.getActiveEvents()[0].remainingDays).toBe(3);
  expect(eventSystem.getDaysSinceLastEvent()).toBe(2);
  expect(eventSystem.getModifiers().heatMultiplier).toBe(2);
  expect(gameState.save()).toBe(true);
  expect(JSON.parse(storage.get('aktau-save')!).weather).toEqual(city.weather);

  const preserved = gameState.getState();
  const malformedBuildings = [null, ...city.buildings];
  for (const invalid of [
    { ...city, resources: {} },
    { ...city, civicProject: { kind: 'other', gridX: 33, gridZ: 12 } },
    { ...city, civicProject: { kind: 'public_garden', gridX: 38, gridZ: 12 } },
    { ...city, districtEstablished: true, civicProject: null },
    { ...city, fieldSeason: { phase: 'housing' } },
    { ...city, day: 1, buildings: malformedBuildings },
    { ...city, day: 1, weather: { daysSinceLastEvent: 2, activeEvents: [{ id: 'unknown' }] } }
  ]) {
    storage.set('aktau-save', JSON.stringify(invalid));
    expect(gameState.load()).toBe(false);
    expect(gameState.getState()).toEqual(preserved);
    expect(eventSystem.getActiveEvents()[0].remainingDays).toBe(3);
  }
  // Older saves predate the district plan, civic project and weather state.
  delete city.weather;
  delete city.completedOrders;
  delete city.nextDispatchDay;
  delete city.civicProject;
  delete city.districtEstablished;
  storage.set('aktau-save', JSON.stringify(city));
  expect(gameState.load()).toBe(true);
  expect(eventSystem.getActiveEvents()).toHaveLength(0);
  expect(gameState.getNextDispatchDay()).toBe(0);
  expect(gameState.getFieldSeason()).toBeNull();
  expect(gameState.getResources()).toEqual(city.resources);

  for (const building of [...gameState.getBuildings()]) {
    if (building.type === 'pump') gameState.removeBuilding(building.id);
  }
  expect(gameState.getOrderProgress(DISTRICT_ORDERS[0])).toBe(0);
  expect(gameState.getOrderProgress(DISTRICT_ORDERS[2])).toBe(0);
  pipes.dispose();
  engine.dispose();
});
