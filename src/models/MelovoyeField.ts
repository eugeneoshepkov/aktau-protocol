import { VertexData } from '@babylonjs/core';
import { ModelParts } from './CityModels';

const iron = '#404c4b';
const steel = '#587472';
const sunlit = '#81908a';
const rail = '#d99d57';

// The silhouette in Abramov's Fig. 7 is an open rectangular tower on runners,
// with a wider square gallery and a tall, uncovered guard cage.
export function melovoyeTower(): ModelParts {
  const p = new ModelParts();
  for (const x of [-0.42, 0.42]) {
    p.box(x, 0, 0.01, 0.15, 1.48, 0.105, iron);
    for (const side of [-1, 1]) {
      p.tube([x, 0.056, side * 0.69], [x, 0.15, side * 0.84], 0.122, iron, 4);
    }
  }
  p.box(0, 0, 0.115, 1.11, 1.3, 0.13, steel);
  for (const x of [-0.343, 0.343]) {
    for (const z of [-0.32, 0.32]) {
      p.box(x, z, 0.245, 0.083, 0.083, 1.78, steel);
    }
    p.tube([x, 0.26, -0.32], [x, 1.12, 0.32], 0.055, sunlit, 4);
    p.tube([x, 1.12, 0.32], [x, 1.94, -0.32], 0.055, sunlit, 4);
  }
  p.box(-0.038, -0.015, 0.245, 0.24, 0.27, 1.75, iron);
  p.box(0.11, -0.015, 0.79, 0.09, 0.16, 0.96, sunlit);
  for (const y of [0.48, 1.13, 1.79]) p.box(0, 0, y, 0.76, 0.71, 0.064, steel);
  p.box(0, -0.015, 2.005, 1.13, 1.02, 0.097, steel);
  p.box(0, -0.015, 2.102, 1.15, 1.04, 0.032, sunlit);
  p.box(0.05, -0.1, 2.134, 0.43, 0.24, 0.19, steel);
  for (const x of [-0.552, 0.552]) {
    for (const z of [-0.508, 0.477]) p.box(x, z, 2.134, 0.037, 0.037, 0.47, rail);
    p.box(x, -0.015, 2.58, 0.033, 1.02, 0.035, rail);
    p.box(x, -0.015, 2.375, 0.027, 1.02, 0.023, sunlit);
  }
  for (const z of [-0.508, 0.477]) {
    p.box(0, z, 2.58, 1.13, 0.035, 0.035, rail);
    p.box(0, z, 2.375, 1.13, 0.023, 0.023, sunlit);
    p.box(0, z, 2.134, 0.028, 0.031, 0.45, sunlit);
  }
  for (const x of [-0.493, -0.286]) p.box(x, 0.415, 0.24, 0.035, 0.034, 1.79, rail);
  for (let i = 0; i < 9; i++) p.box(-0.39, 0.415, 0.38 + 0.19 * i, 0.205, 0.033, 0.03, sunlit);

  // A short field hut gives the open steelwork a human scale.
  p.box(0.96, -0.31, 0.02, 0.49, 0.76, 0.065, iron);
  p.box(0.96, -0.31, 0.085, 0.47, 0.66, 0.44, '#bfba9d');
  p.box(0.96, -0.31, 0.525, 0.53, 0.73, 0.055, '#79918a');
  p.box(0.86, 0.027, 0.17, 0.11, 0.018, 0.26, '#526864');
  p.box(1.04, 0.027, 0.31, 0.12, 0.018, 0.105, '#536d70');
  return p;
}

// Fig. 6 shows long pipes hanging above a shallow, broad settlement on the steppe.
export function melovoyeTrace(): ModelParts {
  const p = new ModelParts();
  const surface = new VertexData();
  const positions = [0, 0.008, 0];
  const indices: number[] = [];
  const normals: number[] = [];
  const sectors = 19;
  const contours = [
    [0.37, 0.018],
    [0.71, 0.13],
    [0.91, 0.205],
    [1.19, 0.008]
  ];
  for (const [ring, [radius, height]] of contours.entries()) {
    for (let i = 0; i < sectors; i++) {
      const angle = (2 * Math.PI * i) / sectors;
      const edge = 1 + 0.06 * Math.cos(3 * angle) - 0.08 * Math.sin(5 * angle + 0.5);
      positions.push(
        radius * edge * 1.68 * Math.cos(angle),
        height * (1 + 0.45 * Math.sin(2 * angle + 0.7) + 0.18 * Math.cos(angle)),
        radius * edge * 1.16 * Math.sin(angle)
      );
      const here = 1 + ring * sectors + i;
      const next = 1 + ring * sectors + ((i + 1) % sectors);
      if (ring === 0) indices.push(0, here, next);
      else indices.push(here - sectors, here, next, here - sectors, next, next - sectors);
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  surface.positions = positions;
  surface.normals = normals;
  surface.indices = indices;
  surface.uvs = new Array((positions.length / 3) * 2).fill(0);
  p.add(surface, 0, 0, 0, '#bea47b');
  // Wind-darkened soil in the low area shades gradually into the chalk rim.
  const colors = surface.colors!;
  for (let i = 0; i < positions.length / 3; i++) {
    const depth = Math.max(0, 1 - Math.hypot(positions[i * 3] / 1.65, positions[i * 3 + 2] / 1.15));
    for (let channel = 0; channel < 3; channel++) colors[i * 4 + channel] *= 1 - depth * 0.26;
  }
  for (const [z, diameter, color] of [
    [-0.12, 0.164, '#846648'],
    [0.26, 0.118, '#626961']
  ] as const) {
    for (const x of [-1.69, 1.69]) {
      p.box(x, z, 0.13, 0.13, 0.29, 0.216, '#8d8b76');
    }
    p.tube([-2.04, 0.424, z], [0, 0.358, z + 0.04], diameter, color, 12);
    p.tube([0, 0.358, z + 0.04], [2.04, 0.424, z + 0.1], diameter, color, 12);
    p.tube([-0.68, 0.378, z + 0.027], [-0.6, 0.378, z + 0.027], diameter * 1.16, iron, 12);
  }
  for (const [x, z] of [
    [-1.76, 0.57],
    [1.07, -0.98]
  ]) {
    p.box(x, z, 0.13, 0.043, 0.045, 0.35, '#d2c6a4');
    p.box(x, z, 0.48, 0.045, 0.047, 0.1, '#b66242');
  }
  return p;
}
