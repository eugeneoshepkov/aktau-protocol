import { expect, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { PipeManager } from '../src/managers/PipeManager';
import { gameState } from '../src/simulation/GameState';
import type { Building, BuildingType } from '../src/types';

test('placement reports real pipe hops in flow order and identifies missing inputs', () => {
  const lot = (type: BuildingType, x: number, z: number): Building => ({
    id: `${type}-${x}-${z}`,
    type,
    gridX: x,
    gridZ: z
  });
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
    expect(report(isolatedTank)).toEqual({ routes: [], missing: ['water'] });
    expect(pipes.getMissingConnections(isolatedTank).map((c) => c.resourceType)).toEqual(['water']);
    expect(pipes.isFullyOperational(isolatedTank)).toBe(false);
    const preview = { ...isolatedTank, id: 'virtual_preview' };
    expect(pipes.getMissingConnections(preview)).toEqual([]);
    expect(pipes.isFullyOperational(preview)).toBe(true);
    expect(report(isolatedPump)).toEqual({ routes: [], missing: [] });
  } finally {
    pipes.dispose();
    engine.dispose();
  }
});
