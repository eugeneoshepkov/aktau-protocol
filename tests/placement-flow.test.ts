import { expect, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { PipeManager, type PlacementFlowSummary } from '../src/managers/PipeManager';
import type { ResourceType } from '../src/config/ResourceFlow';
import { gameState } from '../src/simulation/GameState';
import type { Building, BuildingType } from '../src/types';

function lot(type: BuildingType, x: number, z: number): Building {
  return {
    id: `${type}-${x}-${z}`,
    type,
    gridX: x,
    gridZ: z
  };
}

test('placement reports real pipe hops in flow order and identifies missing inputs', () => {
  const pump = lot('pump', 2, 4);
  const firstTank = lot('water_tank', 7, 4);
  const lastTank = lot('water_tank', 12, 4);
  const sideTank = lot('water_tank', 7, 8);
  const tankSuppliedHouse = lot('microrayon', 4, 4);
  const distiller = lot('distiller', 16, 4);
  const heat = lot('reactor', 16, 6);
  const secondDistiller = lot('distiller', 17, 5);
  const house = lot('microrayon', 18, 3);
  const isolatedTank = lot('water_tank', 31, 42);
  const isolatedPump = lot('pump', 1, 39);
  const isolatedHouse = lot('microrayon', 46, 42);
  const buildings = [
    pump,
    firstTank,
    lastTank,
    sideTank,
    tankSuppliedHouse,
    distiller,
    heat,
    secondDistiller,
    house,
    isolatedTank,
    isolatedPump,
    isolatedHouse
  ];
  using lots = spyOn(gameState, 'getBuildings').mockReturnValue(buildings);
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  try {
    pipes.rebuildPipes();
    const report = (b: Building) => pipes.getPlacementFlow(b);
    const path = (b: Building, resource: string) =>
      report(b)
        .routes.find((route) => route.resource === resource)
        ?.points.map((p) => p.asArray());
    const seawater = [
      [2.5, 0.3, 4.5],
      [7.5, 0.3, 4.5],
      [12.5, 0.3, 4.5],
      [16.5, 0.3, 4.5]
    ];
    expect(path(distiller, 'seawater')).toEqual(seawater);
    expect(path(pump, 'seawater')).toEqual(seawater);
    expect(path(firstTank, 'seawater')).toEqual(seawater);
    expect(path(firstTank, 'freshWater')).toEqual([
      [16.5, 0.3, 4.5],
      [12.5, 0.3, 4.5],
      [7.5, 0.3, 4.5],
      [4.5, 0.3, 4.5]
    ]);
    const sideFeed = report(firstTank).routes.find(
      (route) => route.resource === 'seawater' && route.points.at(-1)?.z === 8.5
    );
    expect(sideFeed?.points.map((p) => p.asArray())).toEqual([
      ...seawater.slice(0, 2),
      [7.5, 0.3, 8.5]
    ]);
    expect(report(firstTank).missing).toEqual([]);
    expect(pipes.getMissingConnections(firstTank)).toEqual([]);
    expect(report(house).missing).toEqual([]);
    expect(path(house, 'freshWater')).toEqual([
      [16.5, 0.3, 4.5],
      [18.5, 0.3, 3.5]
    ]);
    expect(path(house, 'heat')).toEqual([
      [16.5, 0.42, 6.5],
      [18.5, 0.42, 3.5]
    ]);

    // The first distiller has already claimed all of the pump's seawater capacity.
    expect(report(secondDistiller).routes.map((r) => r.resource)).toEqual(['heat']);
    expect(report(secondDistiller).missing).toEqual(['water']);
    expect(report(isolatedHouse).routes).toEqual([]);
    expect(report(isolatedHouse).missing.toSorted()).toEqual(['heat', 'water']);
    expect(report(isolatedTank)).toEqual({ routes: [], missing: ['water', 'heat'], restored: [] });
    expect(pipes.getMissingConnections(isolatedTank).map((c) => c.resourceType)).toEqual(['water', 'heat']);
    expect(pipes.isFullyOperational(isolatedTank)).toBe(false);
    const preview = { ...isolatedTank, id: 'virtual_preview' };
    expect(pipes.getMissingConnections(preview)).toEqual(pipes.getMissingConnections(isolatedTank));
    expect(pipes.isFullyOperational(preview)).toBe(false);
    expect(report(isolatedPump)).toEqual({ routes: [], missing: [], restored: [] });
  } finally {
    pipes.dispose();
    engine.dispose();
  }
});

function afterPlacing(buildings: Building[], building: Building): PlacementFlowSummary {
  using lots = spyOn(gameState, 'getBuildings').mockReturnValue(buildings);
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  try {
    pipes.rebuildPipes();
    const before = pipes.captureSupply();
    buildings.push(building);
    pipes.rebuildPipes();
    return pipes.getPlacementFlow(building, before);
  } finally {
    pipes.dispose();
    engine.dispose();
  }
}

function expectRoute(report: PlacementFlowSummary, resource: ResourceType, ...lots: Building[]) {
  const paths = report.routes
    .filter((route) => route.resource === resource)
    .map((route) => route.points.map((point) => [point.x, point.z]));
  expect(paths).toContainEqual(lots.map((b) => [b.gridX + 0.5, b.gridZ + 0.5]));
}

test('a newly placed distiller restores three homes, including a distant home still missing heat', () => {
  const distiller = lot('distiller', 10, 10);
  const tank = lot('water_tank', 14, 10);
  const left = lot('microrayon', 9, 10);
  const right = lot('microrayon', 12, 10);
  const distant = lot('microrayon', 18, 10);
  const report = afterPlacing(
    [
      lot('pump', 10, 8),
      lot('reactor', 9, 13),
      tank,
      left,
      right,
      distant,
      lot('microrayon', 25, 25)
    ],
    distiller
  );

  expect(report.restored).toEqual([
    { building: tank, resources: ['freshWater'], missing: [] },
    { building: left, resources: ['freshWater'], missing: [] },
    { building: right, resources: ['freshWater'], missing: [] },
    { building: distant, resources: ['freshWater'], missing: ['heat'] }
  ]);
  expectRoute(report, 'freshWater', distiller, left);
  expectRoute(report, 'freshWater', distiller, right);
  expectRoute(report, 'freshWater', distiller, tank, distant);
});

test('restoring an existing distiller immediately supplies its homes and its chain of tanks', () => {
  const pump = lot('pump', 8, 10);
  const distiller = lot('distiller', 10, 10);
  const heat = lot('thermal_plant', 10, 12);
  const nearby = lot('microrayon', 11, 10);
  const firstTank = lot('water_tank', 15, 10);
  const secondTank = lot('water_tank', 20, 10);
  const distant = lot('microrayon', 23, 10);
  const report = afterPlacing([pump, distiller, nearby, firstTank, secondTank, distant], heat);
  expect(report.restored).toEqual([
    { building: distiller, resources: ['heat'], missing: [] },
    { building: nearby, resources: ['heat', 'freshWater'], missing: [] },
    { building: firstTank, resources: ['freshWater'], missing: [] },
    { building: secondTank, resources: ['freshWater'], missing: [] },
    { building: distant, resources: ['freshWater'], missing: ['heat'] }
  ]);
  expectRoute(report, 'heat', heat, distiller);
  expectRoute(report, 'freshWater', distiller, nearby);
  expectRoute(report, 'freshWater', distiller, firstTank, secondTank, distant);
});

test('capacity freed at an old provider restores only the house that lacked that resource', () => {
  const oldProvider = lot('distiller', 10, 10);
  const newProvider = lot('distiller', 15, 10);
  const switchesProvider = lot('microrayon', 14, 10);
  const newlyServed = lot('microrayon', 6, 10);
  const report = afterPlacing(
    [
      lot('pump', 10, 8),
      lot('pump', 15, 8),
      lot('reactor', 12, 12),
      oldProvider,
      lot('microrayon', 10, 11),
      switchesProvider,
      newlyServed
    ],
    newProvider
  );
  expect(report.restored).toEqual([
    { building: newlyServed, resources: ['freshWater'], missing: ['heat'] }
  ]);
  expectRoute(report, 'freshWater', oldProvider, newlyServed);
  expectRoute(report, 'freshWater', newProvider, switchesProvider);
});

test('an inland distiller and its homes receive independent water and heat mains', () => {
  const pump = lot('pump', 2, 8);
  const plant = lot('thermal_plant', 2, 12);
  const bridge = lot('water_tank', 6, 10);
  const inlandStation = lot('water_tank', 11, 10);
  const distiller = lot('distiller', 15, 10);
  const house = lot('microrayon', 14, 13);
  const buildings = [pump, plant, inlandStation, distiller, house];
  using lots = spyOn(gameState, 'getBuildings').mockReturnValue(buildings);
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  try {
    pipes.rebuildPipes();
    expect(pipes.getLotConnections('water_tank', 1, 4)).toEqual({ heat: false, water: true });
    expect(pipes.isSuitableLot('water_tank', 1, 4)).toBe(true);
    expect(pipes.getLotConnections('water_tank', 1, 16)).toEqual({ heat: true, water: false });
    expect(pipes.isSuitableLot('water_tank', 1, 16)).toBe(true);
    expect(pipes.getLotConnections('water_tank', bridge.gridX, bridge.gridZ)).toEqual({ heat: true, water: true });
    expect(pipes.getLotConnections('water_tank', 25, 10)).toEqual({ heat: false, water: false });
    expect(pipes.isFullyOperational(distiller)).toBe(false);
    const before = pipes.captureSupply();
    buildings.push(bridge);
    pipes.rebuildPipes();

    const report = pipes.getPlacementFlow(bridge, before);
    expectRoute(report, 'heat', plant, bridge, inlandStation, distiller);
    expectRoute(report, 'seawater', pump, bridge, inlandStation, distiller);
    expectRoute(report, 'heat', plant, bridge, inlandStation, house);
    expectRoute(report, 'freshWater', distiller, house);
    expect(report.restored).toContainEqual({ building: house, resources: ['heat', 'freshWater'], missing: [] });
    expect(pipes.isFullyOperational(distiller)).toBe(true);
    expect(pipes.isFullyOperational(house)).toBe(true);
    const frame = pipes.showConnectionPreview('microrayon', 14, 12);
    expect(frame.every((point) => Math.hypot(point.x - 14.5, point.z - 12.5) <= 5)).toBe(true);
    expect(pipes.getConnectionsForBuilding(house)).toContainEqual({
      building: inlandStation, direction: 'incoming', type: 'heat'
    });
    const network = pipes.getNetworkSnapshot();
    expect(network.allocations).toContainEqual({
      resource: 'heat', from: plant.id, to: house.id, amount: 5,
      path: [plant.id, bridge.id, inlandStation.id, house.id]
    });
    expect(network.relayFeeds).toContainEqual({ resource: 'seawater', from: bridge.id, to: inlandStation.id });

    // Disconnecting the sea intake leaves a live heat-only district, with no phantom water.
    buildings.splice(buildings.indexOf(pump), 1);
    pipes.rebuildPipes();
    expect(pipes.getLotConnections('water_tank', 15, 11)).toEqual({ heat: true, water: false });
    expect(pipes.getLotConnections('distiller', 15, 11)).toEqual({ heat: true, water: false });
    expect(pipes.isFullyOperational(bridge)).toBe(true);
    expect(pipes.isSuppliedWith(inlandStation, 'seawater')).toBe(false);
    expect(pipes.isSuppliedWith(inlandStation, 'freshWater')).toBe(false);
    expect(pipes.getMissingConnections(house).map((c) => c.resourceType)).toEqual(['water']);

    // Losing the heat source instead keeps the seawater relay alive, but it cannot distill.
    buildings.push(pump);
    buildings.splice(buildings.indexOf(plant), 1);
    pipes.rebuildPipes();
    expect(pipes.isFullyOperational(inlandStation)).toBe(true);
    expect(pipes.isSuppliedWith(inlandStation, 'seawater')).toBe(true);
    expect(pipes.isSuppliedWith(inlandStation, 'heat')).toBe(false);
    expect(pipes.isSuppliedWith(house, 'freshWater')).toBe(false);
    expect(pipes.getMissingConnections(distiller).map((c) => c.resourceType)).toEqual(['heat']);
  } finally {
    pipes.dispose();
    engine.dispose();
  }
});

test('heated mains extend the reach of one plant without increasing its heat capacity', () => {
  const plant = lot('thermal_plant', 5, 10);
  const main = lot('water_tank', 10, 10);
  const terminal = lot('water_tank', 15, 10);
  const served = [lot('microrayon', 12, 10), lot('microrayon', 13, 10), lot('microrayon', 14, 11),
    lot('microrayon', 14, 9), lot('microrayon', 15, 11), lot('microrayon', 16, 10)];
  const extra = lot('microrayon', 19, 10);
  const buildings = [plant, main, terminal, ...served];
  using lots = spyOn(gameState, 'getBuildings').mockReturnValue(buildings);
  using subscribe = spyOn(gameState, 'on').mockImplementation(() => {});
  const engine = new NullEngine();
  const pipes = new PipeManager(new Scene(engine));
  try {
    pipes.rebuildPipes();
    expect(served.every((home) => pipes.isSuppliedWith(home, 'heat'))).toBe(true);
    expect(pipes.getLotConnections('microrayon', extra.gridX, extra.gridZ).heat).toBe(false);
    buildings.push(extra);
    pipes.rebuildPipes();
    expect(pipes.isSuppliedWith(extra, 'heat')).toBe(false);
    const used = pipes.getNetworkSnapshot().allocations.filter((flow) => flow.resource === 'heat');
    expect(used.every((a) => a.from === plant.id)).toBe(true);
    expect(used.reduce((total, a) => total + a.amount, 0)).toBe(30);
    buildings.splice(buildings.indexOf(main), 1);
    pipes.rebuildPipes();
    expect(pipes.isFullyOperational(terminal)).toBe(false);
    expect(served.every((home) => !pipes.isSuppliedWith(home, 'heat'))).toBe(true);
  } finally {
    pipes.dispose();
    engine.dispose();
  }
});
