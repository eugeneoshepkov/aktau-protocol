import { Matrix, VertexData } from '@babylonjs/core';
import type { ModelParts } from './CityModels';

const shell = '#efe4c6';
const stone = '#cdbfa1';
const glazedTile = '#308e89';
const steel = '#4c6869';
const ochre = '#ce8d46';
const terracotta = '#b8674a';

export function publicGarden(p: ModelParts) {
  p.box(0, 0, -0.08, 1.62, 1.5, 0.13, stone);
  p.box(0, 0, 0.05, 1.57, 1.45, 0.03, '#e4d2ac');

  // A concrete shade pavilion. A folded shell drains toward its central column.
  const cx = -0.12,
    cz = -0.26;
  p.cylinder(cx, cz, 0.08, 0.25, 0.2, 0.16, stone, 8);
  p.cylinder(cx, cz, 0.24, 0.15, 0.13, 0.43, glazedTile, 8);
  p.cylinder(cx, cz, 0.67, 0.14, 0.32, 0.1, shell, 8);
  for (let i = 0; i < 12; i++) {
    const edge = (index: number) => {
      const angle = (index * Math.PI) / 6;
      return [0.64 * Math.cos(angle), index % 2 === 0 ? 1.05 : 0.86, 0.46 * Math.sin(angle)];
    };
    const tip = [0, 0.75, 0],
      a = edge(i),
      b = edge(i + 1);
    const top = [tip, a, b];
    const panel = VertexData.CreatePolyhedron({
      custom: {
        vertex: [...top, ...top.map(([x, y, z]) => [x, y - 0.045, z])],
        face: [
          [2, 1, 0],
          [3, 4, 5],
          [1, 4, 3, 0],
          [2, 5, 4, 1],
          [0, 3, 5, 2]
        ]
      },
      flat: true
    });
    p.add(panel, cx, 0, cz, i % 2 === 0 ? shell : '#a7c2b0');
  }
  // A mosaic-lined reed bed receives water from the housing court.
  p.box(-0.16, 0.4, 0.08, 1.04, 0.45, 0.075, shell);
  p.box(-0.16, 0.4, 0.155, 0.97, 0.38, 0.018, glazedTile);
  p.box(-0.2, 0.41, 0.173, 0.82, 0.27, 0.008, '#83bdb4');
  for (let tuft = 0; tuft < 6; tuft++) {
    const x = -0.56 + tuft * 0.147,
      z = 0.46 + (tuft % 2) * 0.04;
    for (const lean of [-1, 0, 1]) {
      const height = 0.33 + ((tuft + lean + 1) % 3) * 0.045;
      p.tube([x, 0.175, z], [x + lean * 0.045, height, z + lean * 0.028], 0.022, '#71824e', 4);
      if (lean === 0) p.cylinder(x, z, height - 0.025, 0.033, 0.033, 0.065, ochre, 6);
    }
  }
  // Street-side benches and a pair of residents in the shade.
  for (const x of [-0.43, 0.23]) {
    p.box(x, -0.42, 0.08, 0.19, 0.07, 0.066, steel);
    p.box(x, -0.42, 0.146, 0.28, 0.1, 0.038, terracotta);
    p.box(x, -0.48, 0.16, 0.28, 0.029, 0.085, terracotta);
  }
  for (const [x, coat] of [
    [-0.42, ochre],
    [0.22, glazedTile]
  ] as const) {
    p.box(x, -0.37, 0.17, 0.07, 0.075, 0.1, coat);
    p.cylinder(x, -0.37, 0.27, 0.056, 0.053, 0.065, '#a67a55', 8);
  }
  p.box(0.57, 0.19, 0.08, 0.31, 0.7, 0.06, shell);
  p.box(0.57, 0.19, 0.14, 0.26, 0.65, 0.017, '#899664');
  for (const z of [-0.02, 0.39]) {
    p.cylinder(0.56, z, 0.15, 0.055, 0.043, 0.29, '#8a7859', 6);
    const crown = VertexData.CreateIcoSphere({ radius: 1, subdivisions: 1, flat: true });
    crown.transform(Matrix.Scaling(0.16, 0.25, 0.155));
    p.add(crown, 0.56, 0.5, z, '#77945f');
  }
}

export function districtHeating(p: ModelParts) {
  p.box(0, 0, -0.08, 1.59, 1.49, 0.16, stone);
  // An accumulator and an insulated circuit distinguish the works from a power station.
  const tx = -0.38,
    tz = -0.2;
  p.cylinder(tx, tz, 0.08, 0.76, 0.7, 0.14, steel);
  p.cylinder(tx, tz, 0.22, 0.64, 0.64, 0.88, ochre);
  for (const y of [0.28, 0.55, 0.83, 1.055]) {
    p.cylinder(tx, tz, y, 0.66, 0.66, 0.036, shell);
  }
  p.cylinder(tx, tz, 1.1, 0.7, 0.7, 0.06, steel);
  p.cylinder(tx, tz, 1.16, 0.69, 0.44, 0.14, shell);
  p.cylinder(tx, tz, 1.3, 0.44, 0.17, 0.06, shell);
  p.cylinder(tx, tz, 1.36, 0.16, 0.16, 0.055, terracotta);
  for (const z of [-0.265, -0.14]) p.tube([-0.723, 0.16, z], [-0.723, 1.22, z], 0.022, steel, 6);
  for (let y = 0.23; y < 1.2; y += 0.12)
    p.tube([-0.723, y, -0.265], [-0.723, y, -0.14], 0.018, shell, 5);

  p.box(0.32, -0.12, 0.08, 0.75, 0.92, 0.59, terracotta);
  p.box(0.32, -0.12, 0.41, 0.76, 0.93, 0.16, '#50767a');
  for (const x of [0.01, 0.22, 0.44, 0.64]) p.box(x, -0.12, 0.09, 0.043, 0.94, 0.57, shell);
  p.box(0.32, -0.12, 0.67, 0.83, 1.0, 0.08, shell);
  p.box(0.32, -0.12, 0.75, 0.75, 0.92, 0.026, steel);
  for (const z of [-0.39, 0.12]) {
    p.box(0.35, z, 0.776, 0.34, 0.26, 0.115, '#bdcbc1');
    for (const x of [0.23, 0.31, 0.39, 0.47]) p.box(x, z, 0.891, 0.026, 0.2, 0.012, steel);
  }
  // Raised supply and return pipes, with two red handwheels visible from the road.
  for (const [z, color] of [
    [0.43, shell],
    [0.6, '#e9b55e']
  ] as const) {
    for (const x of [-0.58, 0.58]) p.cylinder(x, z, 0.08, 0.13, 0.13, 0.32, color, 10);
    p.tube([-0.58, 0.39, z], [0.58, 0.39, z], 0.135, color);
    for (const x of [-0.42, 0.03, 0.45]) p.tube([x, 0.39, z], [x + 0.04, 0.39, z], 0.153, steel);
  }
  for (const x of [-0.26, 0.27]) {
    p.cylinder(x, 0.6, 0.45, 0.035, 0.035, 0.09, steel, 6);
    p.cylinder(x, 0.6, 0.54, 0.13, 0.13, 0.027, terracotta, 8);
  }
}
