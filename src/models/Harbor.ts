import { Matrix, Mesh, Quaternion, Vector3, VertexData } from '@babylonjs/core';
import { ModelParts } from './CityModels';

const limestone = '#d4cbb4';
const steel = '#485e60';
const cream = '#e9dbb8';
const oxide = '#b95b3c';
const ochre = '#d98e42';
const glass = '#4c757c';

export function glidingGull(): ModelParts {
  const bird = new ModelParts();
  const body = VertexData.CreateSphere({
    diameterX: 0.084,
    diameterY: 0.082,
    diameterZ: 0.25,
    segments: 4
  });
  bird.add(body, 0, 0, 0, '#f7efdd');
  bird.cylinder(0, 0.108, 0.004, 0.068, 0.05, 0.054, '#fbf5e7', 7);
  bird.box(0, 0.151, 0.016, 0.026, 0.061, 0.022, '#d7a254');

  // A gull's long wings bend at the wrist, with dark primaries sweeping back.
  for (const side of [-1, 1]) {
    const featherRow = (x: number, y: number, leading: number, trailing: number) => [
      new Vector3(side * x, y, leading),
      new Vector3(side * x, y, trailing)
    ];
    const root = featherRow(0.016, 0.014, 0.05, -0.065);
    const wrist = featherRow(0.2, 0.085, 0.078, -0.008);
    const primaries = featherRow(0.32, 0.07, 0.006, -0.045);
    const tip = featherRow(0.429, 0.041, -0.082, -0.088);
    for (const [inner, outer, tint] of [
      [root, wrist, '#dddeda'],
      [wrist, primaries, '#a3b1b3'],
      [primaries, tip, '#425156'],
      [featherRow(0, 0.006, -0.06, -0.16), featherRow(0.064, 0.002, -0.15, -0.164), '#f2eddd']
    ] as const) {
      bird.add(
        VertexData.CreateRibbon({ pathArray: [inner, outer], sideOrientation: Mesh.DOUBLESIDE }),
        0,
        0,
        0,
        tint
      );
    }
  }
  return bird;
}

export function quay(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, 0.08, 1.04, 4.45, 0.18, limestone);
  p.box(0, -1.94, 0.08, 2.32, 0.72, 0.18, limestone);
  for (const z of [-1.95, -1.12, -0.3, 0.54, 1.36, 2]) {
    for (const x of [-0.43, 0.43]) {
      p.cylinder(x, z, -0.22, 0.16, 0.16, 0.48, steel, 8);
      p.box(x, z, 0.26, 0.16, 0.17, 0.09, steel);
    }
    p.box(0, z, 0.262, 0.63, 0.015, 0.004, '#b2ac99');
  }
  // A rail-mounted crane with trussed boom, counterweight and hanging hook.
  const z = -1.03;
  for (const x of [-0.25, 0.25]) {
    p.box(x, z, 0.275, 0.08, 0.82, 0.09, steel);
    for (const dz of [-0.23, 0.23])
      p.tube([x, 0.36, z + dz], [x * 0.7, 0.92, z + dz * 0.6], 0.1, ochre, 4);
  }
  p.box(0, z, 0.91, 0.56, 0.48, 0.14, oxide);
  p.box(0.09, z, 1.05, 0.49, 0.4, 0.31, ochre);
  p.box(-0.12, z + 0.12, 1.11, 0.2, 0.23, 0.24, glass);
  p.box(-0.12, z + 0.12, 1.35, 0.24, 0.27, 0.045, cream);
  for (const side of [-0.1, 0.1]) {
    const zz = z + side;
    p.tube([-0.13, 1.24, zz], [-1.2, 2.18, zz], 0.065, ochre, 6);
    p.tube([0.05, 1.42, zz], [-1.2, 2.23, zz], 0.063, ochre, 6);
    for (let i = 0; i < 5; i++) {
      const f = i / 5,
        n = (i + 1) / 5;
      p.tube(
        [-0.13 - f * 1.07, 1.24 + f * 0.94, zz],
        [0.05 - n * 1.25, 1.42 + n * 0.81, zz],
        0.036,
        oxide,
        5
      );
    }
    p.tube([0.25, 1.35, zz], [0.05, 1.85, zz], 0.052, steel, 5);
    p.tube([0.05, 1.85, zz], [-1.2, 2.23, zz], 0.023, steel, 5);
  }
  p.tube([-1.2, 2.24, z], [-1.2, 1.4, z], 0.025, steel, 5);
  p.box(-1.2, z, 1.31, 0.13, 0.1, 0.1, oxide);
  for (const [x, zz] of [
    [-0.25, 1.6],
    [0.18, 1.2],
    [-0.2, 1.12]
  ]) {
    p.box(x, zz, 0.265, 0.26, 0.37, 0.23, oxide);
    p.box(x, zz - 0.1, 0.265, 0.269, 0.034, 0.235, '#d29e66');
    p.box(x, zz + 0.1, 0.265, 0.269, 0.034, 0.235, '#d29e66');
  }
  return p;
}

export function harborTug(): ModelParts {
  const p = new ModelParts();
  // Port and starboard sections taper into the point of the bow.
  const hull = VertexData.CreateCylinder({
    diameterTop: 1,
    diameterBottom: 0.8,
    height: 0.26,
    tessellation: 8
  });
  hull.transform(Matrix.Scaling(0.83, 1, 2.55));
  p.add(hull, 0, 0.05, 0, steel);
  const deck = VertexData.CreateCylinder({ diameter: 1, height: 0.06, tessellation: 8 });
  deck.transform(Matrix.Scaling(0.84, 1, 2.57));
  p.add(deck, 0, 0.205, 0, oxide);
  p.box(0, -0.2, 0.235, 0.57, 0.76, 0.26, cream);
  p.box(0, -0.22, 0.495, 0.46, 0.49, 0.2, glass);
  for (const dz of [-0.41, -0.18, 0]) p.box(0, dz, 0.495, 0.47, 0.038, 0.2, cream);
  p.box(0, -0.22, 0.69, 0.53, 0.56, 0.055, cream);
  p.cylinder(0, 0.27, 0.235, 0.16, 0.15, 0.48, ochre, 10);
  p.cylinder(0, 0.27, 0.715, 0.16, 0.16, 0.08, steel, 10);
  p.tube([0, 0.3, -0.77], [0, 1.02, -0.77], 0.033, cream, 6);
  p.box(0.075, -0.77, 0.86, 0.15, 0.014, 0.12, oxide);
  for (const x of [-0.39, 0.39]) {
    for (const z of [-0.55, 0.03, 0.59]) p.box(x, z, 0.09, 0.075, 0.15, 0.15, '#3e4747');
  }
  return p;
}

export function harborLight(): ModelParts {
  const p = new ModelParts();
  p.cylinder(0, 0, -0.18, 0.72, 0.52, 0.4, '#938f7b', 8);
  p.cylinder(0, 0, 0.22, 0.4, 0.31, 0.44, cream, 12);
  p.cylinder(0, 0, 0.66, 0.31, 0.25, 0.36, oxide, 12);
  p.cylinder(0, 0, 1.02, 0.25, 0.2, 0.34, cream, 12);
  p.cylinder(0, 0, 1.36, 0.43, 0.43, 0.07, steel, 12);
  p.cylinder(0, 0, 1.43, 0.23, 0.23, 0.22, '#e9c776', 8);
  p.cylinder(0, 0, 1.65, 0.36, 0, 0.17, oxide, 12);
  return p;
}

export function foliage(poplar: boolean): ModelParts {
  const p = new ModelParts();
  p.cylinder(0, 0, 0, 0.063, 0.045, poplar ? 0.54 : 0.23, '#776a55', 5);
  if (poplar) {
    p.tube([0, 0.46, 0], [0.025, 1.31, 0], 0.034, '#756c58', 5);
    for (let n = 0; n < 5; n++) {
      const y = 0.38 + n * 0.12;
      p.tube(
        [0, y, 0],
        [0.2 * Math.cos(n * 2.4), y + 0.35, 0.18 * Math.sin(n * 2.4)],
        0.026,
        '#80715c',
        5
      );
    }
  }
  const leaves = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 1, flat: true });
  leaves.transform(Matrix.Scaling(poplar ? 0.51 : 0.5, poplar ? 1.11 : 0.38, poplar ? 0.45 : 0.42));
  p.add(leaves, 0, poplar ? 0.78 : 0.28, 0, poplar ? '#738b65' : '#8e9165');
  if (poplar) {
    const crown = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 1, flat: true });
    crown.transform(Matrix.Scaling(0.37, 0.68, 0.32));
    p.add(crown, 0.04, 1.06, -0.04, '#8c9c6d');
  }
  return p;
}

export function limestoneOutcrop(): ModelParts {
  const p = new ModelParts();
  for (const [x, z, size, tone] of [
    [0.09, 0.04, 0.47, '#a5a394'],
    [-0.23, 0.04, 0.27, '#b3b19d'],
    [-0.09, -0.22, 0.18, '#c6b99d']
  ] as const) {
    const rock = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 1, flat: true });
    rock.transform(Matrix.Scaling(size * 1.25, size * 0.52, size));
    p.add(rock, x, size * 0.16, z, tone, Quaternion.RotationAxis(Vector3.Up(), size * 6));
  }
  return p;
}

// A two-storey port office with a mosaic stairwell and a public colonnade.
export function portOffice(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, -0.025, 1.9, 0.98, 0.07, limestone);
  p.box(0.04, -0.1, 0.045, 1.62, 0.62, 0.78, cream);
  for (const y of [0.18, 0.55]) {
    p.box(0.04, -0.1, y, 1.63, 0.63, 0.17, glass);
    for (let x = -0.71; x < 0.89; x += 0.31) p.box(x, -0.1, y, 0.045, 0.645, 0.18, limestone);
  }
  p.box(0.04, 0.22, 0.39, 1.77, 0.48, 0.06, limestone);
  for (const x of [-0.67, -0.18, 0.31, 0.8])
    p.cylinder(x, 0.4, 0.045, 0.045, 0.045, 0.35, cream, 6);
  p.box(0.04, 0.42, 0.45, 1.76, 0.025, 0.075, '#438e88');
  p.box(0.04, -0.1, 0.825, 1.77, 0.76, 0.075, cream);
  p.box(-0.61, -0.09, 0.045, 0.25, 0.69, 1.02, '#378c8b');
  for (let n = 0; n < 5; n++)
    p.box(-0.66 + 0.05 * (n % 3), 0.26, 0.25 + n * 0.14, 0.085, 0.035, 0.088, '#ead397');
  p.box(0.51, -0.1, 0.9, 0.34, 0.29, 0.13, limestone);
  return p;
}

export function marketHall(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, -0.02, 2.12, 1.22, 0.066, limestone);
  p.box(0, -0.23, 0.046, 1.84, 0.55, 0.46, '#c5946d');
  p.box(0, -0.24, 0.18, 1.85, 0.56, 0.21, glass);
  // The striped canopies and open stalls face the boulevard.
  for (let stall = 0; stall < 4; stall++) {
    const x = -0.72 + stall * 0.48;
    p.box(x, 0.26, 0.08, 0.37, 0.24, 0.2, oxide);
    p.box(x, 0.26, 0.28, 0.4, 0.27, 0.04, cream);
    p.box(x - 0.09, 0.25, 0.32, 0.11, 0.16, 0.065, '#d89e43');
    p.box(x + 0.06, 0.25, 0.32, 0.14, 0.16, 0.065, '#829558');
    for (let stripe = 0; stripe < 3; stripe++)
      p.box(
        x - 0.16 + stripe * 0.16,
        0.13,
        0.51,
        0.162,
        0.94,
        0.07,
        (stripe + stall) % 2 ? cream : '#ba6241'
      );
    p.box(x - 0.23, 0.51, 0.046, 0.037, 0.037, 0.48, steel);
  }
  p.box(0, -0.3, 0.51, 2.05, 0.61, 0.09, '#b76446');
  return p;
}

export function workersBus(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, 0.054, 0.22, 0.66, 0.09, '#3a827d');
  p.box(0, 0, 0.144, 0.217, 0.646, 0.106, glass);
  for (const z of [-0.3, -0.17, -0.04, 0.09, 0.22, 0.3])
    p.box(0, z, 0.14, 0.221, 0.019, 0.114, cream);
  p.box(0, 0, 0.251, 0.23, 0.67, 0.033, cream);
  for (const x of [-0.111, 0.111]) {
    for (const z of [-0.22, 0.21])
      p.tube([x - 0.012, 0.055, z], [x + 0.012, 0.055, z], 0.1, steel, 9);
  }
  p.box(0, 0.33, 0.085, 0.18, 0.012, 0.022, cream);
  return p;
}
