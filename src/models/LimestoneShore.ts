import { Color3, Mesh, Scene, VertexData } from '@babylonjs/core';
import { shoreAt } from '../grid/TileTypes';

type Point = [number, number, number];
type Patch = { positions: number[]; colors: number[]; indices: number[] };

// Exposed bedding planes form a shallow lip around each limestone shelf.
const beds = [
  [-0.07, 1.02, '#ac9a7a'],
  [0.15, 1.04, '#c1ac89'],
  [0.27, 1.0, '#aa9677'],
  [0.43, 1.04, '#c6b294'],
  [0.59, 1.02, '#b7a284'],
  [0.9, 0.99, '#c9b8a0']
] as const;
const shelfTops = ['#d6c7a9', '#d5c6ad', '#d0bfa4'];
const grass = ['#93976c', '#b6ae81', '#a2a781', '#b8ae82'].map(Color3.FromHexString);

function face(patch: Patch, corners: Point[], color: Color3, shade = 1): void {
  const first = patch.positions.length / 3;
  for (const corner of corners) {
    patch.positions.push(...corner);
    patch.colors.push(color.r * shade, color.g * shade, color.b * shade, 1);
  }
  patch.indices.push(first, first + 1, first + 2);
  if (corners.length === 4) patch.indices.push(first, first + 2, first + 3);
}

export function createLimestoneShore(scene: Scene): Mesh[] {
  let seed = 3927491014;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // West of the pier a builder can clear one headland at a time. The protected
  // shore east of the pier can share a mesh, including its grass and loose stones.
  const patches: Patch[] = Array.from({ length: 4 }, () => ({
    positions: [],
    colors: [],
    indices: []
  }));

  function stone(
    patch: Patch,
    x: number,
    z: number,
    height: number,
    radiusX: number,
    radiusZ: number,
    rotation: number,
    topColor: string,
    pebble = false
  ) {
    const sides = 8 + Math.floor(random() * 3);
    const base = z < shoreAt(x) ? -0.11 : 0.072;
    const rim: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = ((i + (random() - 0.5) * 0.32) * Math.PI * 2) / sides;
      const radius = 0.78 + 0.37 * random();
      const dx = radiusX * radius * Math.cos(angle),
        dz = radiusZ * radius * Math.sin(angle);
      rim.push([
        dx * Math.cos(rotation) - dz * Math.sin(rotation),
        random() * 0.055,
        dx * Math.sin(rotation) + dz * Math.cos(rotation)
      ]);
    }
    const ring = (elevation: number, scale: number): Point[] =>
      rim.map(([dx, dy, dz]) => [x + dx * scale, base + height * (elevation + dy), z + dz * scale]);
    let lower = ring(beds[0][0], beds[0][1]);
    const layers = pebble ? [beds[4]] : beds.slice(1);
    const strata = [...layers, [1, 0.87, topColor] as const];
    for (const [level, scale, tint] of strata) {
      const upper = ring(level, scale);
      const color = Color3.FromHexString(tint);
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        face(
          patch,
          [lower[i], lower[next], upper[next], upper[i]],
          color,
          0.94 + (0.07 * rim[i][1]) / 0.055
        );
      }
      lower = upper;
    }
    const top = Color3.FromHexString(topColor);
    for (let i = 0; i < sides; i++) {
      const centre: Point = [x, base + height * (1.015 + random() * 0.02), z];
      face(patch, [centre, lower[i], lower[(i + 1) % sides]], top, 0.98 + 0.028 * random());
    }
  }

  // The break in the outcrops between x=50 and x=54 is the pier's sand landing.
  const headlands = [
    [46.3, 0.4, 1.0],
    [48.3, -0.03, 0.71],
    [49.6, -0.1, 0.36],
    [54.85, -0.34, 0.47],
    [56.9, 0.3, 0.97],
    [58.5, 0.5, 1.02],
    [61.15, 0.1, 0.64]
  ];
  for (const [i, [cx, offset, scale]] of headlands.entries()) {
    const patch = patches[Math.min(i, 3)];
    const cz = shoreAt(cx) + offset;
    const tangent = Math.atan2(shoreAt(cx + 0.25) - shoreAt(cx - 0.25), 0.5);
    for (let j = 0; j < 3; j++) {
      const along = (j - 1) * 0.54 * scale;
      stone(
        patch,
        cx + along,
        cz + along * Math.sin(tangent) + (random() - 0.5) * 0.48 * scale,
        0.15 + (0.11 + random() * 0.21) * scale,
        scale * (0.52 + 0.6 * random()),
        scale * (0.26 + 0.4 * random()),
        tangent + (random() - 0.5) * 0.55,
        shelfTops[j]
      );
    }
    for (let j = 0; j < 10; j++) {
      const x = cx + (random() - 0.5) * 2.9 * scale;
      const z = shoreAt(x) + offset + (random() - 0.5) * 1.8 * scale;
      const size = 0.055 + random() * 0.13;
      stone(patch, x, z, 0.09 + size * 0.8, size * 1.4, size, random() * 2, '#d0c0a4', true);
    }
  }

  const clumps = [
    [47, 1.2],
    [48.5, 0.9],
    [49.6, 1.32],
    [53.4, 1.55],
    [55.9, 1.4],
    [59, 2.4],
    [56.42, 1.22]
  ];
  for (const [i, [cx, inland]] of clumps.entries()) {
    const patch = patches[Math.min(i, 3)];
    for (let j = 0; j < 8; j++) {
      const x = cx + (random() - 0.5) * 1.15,
        z = shoreAt(cx) + inland + (random() - 0.5) * 0.44;
      if (z < shoreAt(x) + 0.52) continue;
      const size = 0.1 + random() * 0.11,
        turn = random() * Math.PI * 2;
      for (let k = 0; k < 9; k++) {
        const dx = Math.cos(turn + k * 2.4),
          dz = Math.sin(turn + k * 2.4);
        const height = size * (0.46 + random() * 0.87),
          lean = size * (0.48 + 1.08 * random());
        const width = size * (0.061 + random() * 0.065);
        const bx = x + (random() - 0.5) * size * 0.45,
          bz = z + (random() - 0.5) * size * 0.45;
        const left: Point = [bx + dz * width, 0.14, bz - dx * width];
        const right: Point = [bx - dz * width, 0.14, bz + dx * width];
        const tip: Point = [bx + dx * lean, 0.14 + height, bz + dz * lean];
        face(patch, [left, right, tip], grass[k % grass.length]);
      }
    }
  }

  return patches.map((patch, index) => {
    const normals: number[] = [];
    VertexData.ComputeNormals(patch.positions, patch.indices, normals);
    const geometry = Object.assign(new VertexData(), patch, { normals });
    const mesh = new Mesh('First Microrayon limestone ' + index, scene);
    geometry.applyToMesh(mesh);
    return mesh;
  });
}
