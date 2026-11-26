import { expect, test } from 'bun:test';
import { NullEngine, Scene } from '@babylonjs/core';
import { melovoyeTower, melovoyeTrace } from '../src/models/MelovoyeField';

test('both Melovoye sights assemble into drawable meshes at city startup', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    for (const build of [melovoyeTower, melovoyeTrace]) {
      const mesh = build().finish(build.name, scene);
      expect(mesh.getTotalIndices()).toBeGreaterThan(0);
      expect(mesh.subMeshes).toHaveLength(1);
    }
  } finally {
    engine.dispose();
  }
});
