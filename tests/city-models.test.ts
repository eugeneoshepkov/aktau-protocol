import { expect, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { melovoyeTower, melovoyeTrace } from '../src/models/MelovoyeField';
import { glidingGull } from '../src/models/Harbor';
import { apartmentCourtyard, firstMicrorayonPier } from '../src/models/NeighbourhoodScenes';
import { duskAtTime } from '../src/engine/Seasons';
import { melovoyLighthouse } from '../src/models/ShevchenkoLandmarks';

test('the waterfront fades to evening, holds, then returns to daylight on each walk cycle', () => {
  for (const start of [0, 160]) {
    expect([0, 12, 28, 44, 76, 92, 108, 159].map(t => duskAtTime(start + t))).toEqual([
      0, 0, 0.5, 1, 1, 0.5, 0, 0
    ]);
  }
});

test('field sights and waterfront scenes assemble into single drawable meshes at city startup', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const build of [
      melovoyeTower,
      melovoyeTrace,
      glidingGull,
      melovoyLighthouse,
      apartmentCourtyard,
      firstMicrorayonPier
    ]) {
      const mesh = build().finish(build.name, scene);
      expect(mesh.getTotalIndices()).toBeGreaterThan(0);
      expect(mesh.subMeshes).toHaveLength(1);
    }
  } finally {
    engine.dispose();
  }
});
