import { expect, spyOn, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { getTileTypeAt, LAND_Y, SEA_Y, shoreAt } from '../src/grid/TileTypes';
import { AmbientManager } from '../src/simulation/ambient';
import { gameState } from '../src/simulation/GameState';

test('wildlife moves in its habitat, yields to construction, and follows the season on load', async () => {
  let seed = 175;
  using random = spyOn(Math, 'random').mockImplementation(() => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  });
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    gameState.reset();
    const wildlife = new AmbientManager(scene);
    await wildlife.initialize();
    const grazers = scene.meshes.filter((m) => m.name === 'camel' || m.name === 'horse');
    const snake = scene.getMeshByName('Steppe snake')!;
    const seal = scene.getMeshByName('Caspian seal')!;
    expect(grazers).toHaveLength(4);
    expect([...grazers, snake, seal].every((m) => !m.isPickable)).toBe(true);
    const starts = grazers.map((m) => m.position.clone());
    const walked = new Set<number>();
    let surfaced = false,
      dived = false;
    for (let tick = 0; tick < 1000; tick++) {
      wildlife.update(0.05);
      for (const [i, animal] of grazers.entries()) {
        const { x, y, z } = animal.position;
        if (y !== LAND_Y || getTileTypeAt(Math.floor(x), Math.floor(z)) !== 'sand') {
          throw new Error(animal.name + ' left the steppe');
        }
        if (Math.hypot(x - starts[i].x, z - starts[i].z) > 0.5) walked.add(i);
      }
      if (seal.isEnabled()) {
        const { x, y, z } = seal.position;
        if (z >= shoreAt(x)) throw new Error('Seal left the water');
        if (y > SEA_Y - 0.1) surfaced = true;
      } else if (surfaced) dived = true;
    }
    expect(walked.size).toBe(grazers.length);
    expect(surfaced && dived).toBe(true);

    const occupied = grazers[0];
    const x = Math.floor(occupied.position.x),
      z = Math.floor(occupied.position.z);
    expect(gameState.placeBuilding('microrayon', x, z)).toBeTruthy();
    wildlife.update(0.05);
    expect(occupied.isDisposed()).toBe(true);
    const camels = scene.meshes.filter((m) => m.name === 'camel');
    expect(camels).toHaveLength(2);
    expect(
      camels.every(
        (m) =>
          Math.abs(Math.floor(m.position.x) - x) > 1 || Math.abs(Math.floor(m.position.z) - z) > 1
      )
    ).toBe(true);

    const winterSave = JSON.stringify({ ...gameState.getState(), day: 91 });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => winterSave }
    });
    expect(gameState.load()).toBe(true);
    wildlife.update(0.05);
    expect(scene.getMeshByName('Steppe snake')).toBeNull();
    gameState.reset();
    wildlife.update(0.05);
    expect(scene.getMeshByName('Steppe snake')).toBeTruthy();
  } finally {
    engine.dispose();
    gameState.reset();
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
