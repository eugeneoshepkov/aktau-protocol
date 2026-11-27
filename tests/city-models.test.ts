import { expect, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { melovoyeTower, melovoyeTrace } from '../src/models/MelovoyeField';
import { glidingGull } from '../src/models/Harbor';
import { apartmentCourtyard, firstMicrorayonPier } from '../src/models/NeighbourhoodScenes';

test('field sights and waterfront scenes assemble into single drawable meshes at city startup', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const build of [
      melovoyeTower,
      melovoyeTrace,
      glidingGull,
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
