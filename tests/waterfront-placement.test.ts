import { expect, test } from 'bun:test';
import { Matrix, MeshBuilder, NullEngine, Scene, type ICanvasRenderingContext } from '@babylonjs/core';
import { findBuildableLot, isBuildableLot } from '../src/grid/BuildingLots';
import { getTileTypeAt } from '../src/grid/TileTypes';
import { decorManager } from '../src/managers/DecorManager';
import { DISTRICT_ORDERS, FIELD_HOUSING, STARTER_DISTRICT, WATERFRONT_EXPANSION } from '../src/simulation/DistrictPlan';
import { gameState } from '../src/simulation/GameState';

test('construction respects the existing waterfront, including when an older city is loaded', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  // Signs and paths use canvas paint, but their geometry and the harbor models are real.
  const noop = () => {};
  const context = {
    fillRect: noop, strokeRect: noop, fillText: noop, measureText: () => ({ width: 0 }),
    setTransform: noop, beginPath: noop, moveTo: noop, bezierCurveTo: noop, quadraticCurveTo: noop, stroke: noop
  } as unknown as ICanvasRenderingContext;
  engine.createCanvas = (width, height) => ({ width, height, getContext: () => context, toDataURL: () => '' });
  const ground = MeshBuilder.CreateGround('landMesh', { width: 2, height: 2 }, scene);
  ground.bakeTransformIntoVertices(Matrix.Translation(53, 0, 15));
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let save = '';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => save } });
  try {
    gameState.reset();
    decorManager.initialize(scene, getTileTypeAt);
    const quay = scene.getMeshByName('harbor cargo pier')!;
    const stores = scene.getMeshByName('quayside stores')!;
    const initial = gameState.getState();

    for (const [type, x, z] of [
      ['microrayon', 32, 10], ['pump', 32, 9], ['microrayon', 43, 12], ['distiller', 46, 12],
      ['microrayon', 45, 15], ['microrayon', 33, 12], ['microrayon', 37, 16], ['distiller', 49, 10]
    ] as const) {
      expect(isBuildableLot(type, x, z)).toBe(false);
      expect(gameState.placeBuilding(type, x, z)).toBeNull();
    }
    expect(gameState.getState()).toEqual(initial);
    expect(findBuildableLot('microrayon', { x: 32, z: 10 }, [[32, 10], [29, 11]], () => true))
      .toEqual({ x: 29, z: 11 });
    expect(gameState.placeBuilding('microrayon', 29, 11)).toBeTruthy();
    expect(quay.isVisible).toBe(true);
    expect(quay.isDisposed()).toBe(false);

    // The original starter district and the guide's preferred sites still fit their models.
    for (const { type, x, z } of STARTER_DISTRICT) expect(isBuildableLot(type, x, z)).toBe(true);
    for (const order of [...DISTRICT_ORDERS, WATERFRONT_EXPANSION.homes, FIELD_HOUSING]) {
      if (order.measure === 'day' || order.measure === 'population') continue;
      for (const [x, z] of order.sites ?? []) expect(isBuildableLot(order.measure, x, z)).toBe(true);
    }

    // Old saves could put both an intake and housing on the same pier.
    const buildings = [
      { id: 'intake', type: 'pump', gridX: 32, gridZ: 8 },
      { id: 'flats', type: 'microrayon', gridX: 32, gridZ: 10 }
    ];
    save = JSON.stringify({ ...initial, buildings });
    expect(gameState.load()).toBe(true);
    expect(gameState.getBuildings()).toEqual(buildings);
    expect(quay.isVisible).toBe(false);
    expect(gameState.removeBuilding('intake')).toBe(true);
    expect(quay.isVisible).toBe(false);
    expect(gameState.removeBuilding('flats')).toBe(true);
    expect(quay.isVisible).toBe(true);
    expect(quay.isDisposed()).toBe(false);

    // With this inland reactor the default heating works lot (34, 11) intersects the stores.
    save = JSON.stringify({
      ...initial,
      completedOrders: DISTRICT_ORDERS.length,
      buildings: [{ id: 'reactor', type: 'reactor', gridX: 28, gridZ: 13 }]
    });
    expect(gameState.load()).toBe(true);
    expect(gameState.commissionCivicProject('district_heating')).toBe(true);
    expect(gameState.getCivicProject()).not.toMatchObject({ gridX: 34, gridZ: 11 });
    expect(stores.isVisible).toBe(true);
    expect(stores.isDisposed()).toBe(false);
  } finally {
    decorManager.dispose();
    gameState.reset();
    engine.dispose();
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
