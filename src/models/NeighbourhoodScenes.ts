import {
  Color3,
  DynamicTexture,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  Vector3,
  VertexData
} from '@babylonjs/core';
import { ModelParts } from './CityModels';

const cream = '#f7e6c4';
const blue = '#34858e';
const iron = '#405b60';
const red = '#c66648';
const wood = '#aa8255';
const skin = '#c9936b';

function oval(
  p: ModelParts,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  tint: string
) {
  const shape = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 1, flat: true });
  shape.transform(Matrix.Scaling(w, h, d));
  p.add(shape, x, y, z, tint);
}

export function neighbour(
  p: ModelParts,
  x: number,
  z: number,
  y: number,
  size: number,
  shirt: string,
  trousers: string,
  hair: string
) {
  for (const side of [-1, 1]) {
    p.tube(
      [x + side * size * 0.1, y + size * 0.43, z],
      [x + side * size * 0.13, y + size * 0.05, z + side * 0.022],
      size * 0.14,
      trousers,
      6
    );
    p.box(
      x + side * size * 0.13,
      z - 0.016 + side * 0.022,
      y,
      size * 0.15,
      size * 0.22,
      size * 0.07,
      iron
    );
    p.tube(
      [x + side * size * 0.15, y + size * 0.68, z],
      [x + side * size * 0.23, y + size * 0.48, z - size * 0.07],
      size * 0.105,
      shirt,
      6
    );
    oval(
      p,
      x + side * size * 0.23,
      y + size * 0.455,
      z - size * 0.08,
      size * 0.11,
      size * 0.13,
      size * 0.11,
      skin
    );
  }
  p.cylinder(x, z, y + size * 0.4, size * 0.31, size * 0.4, size * 0.35, shirt, 6);
  oval(p, x, y + size * 0.865, z, size * 0.28, size * 0.32, size * 0.255, skin);
  oval(p, x, y + size * 0.94, z + size * 0.015, size * 0.286, size * 0.18, size * 0.264, hair);
}

export function iceCreamCounter() {
  const p = new ModelParts();
  p.box(0, 0.1, 0, 2.12, 1.7, 0.045, '#c7bba4');
  // An enamel-clad kiosk with a serving hatch, freezer chest and scalloped canvas awning.
  p.box(0, -0.33, 0.045, 1.64, 0.82, 0.88, '#8eb5aa');
  p.box(0, -0.33, 0.045, 1.67, 0.845, 0.16, blue);
  p.box(0, 0.088, 0.385, 1.38, 0.03, 0.45, '#3e5d60');
  p.box(0.17, 0.11, 0.4, 0.6, 0.04, 0.3, '#7da5a3');
  p.box(0, 0.145, 0.37, 1.53, 0.23, 0.053, cream);
  p.box(0, -0.33, 0.87, 1.76, 0.93, 0.065, cream);
  p.box(0, -0.25, 0.935, 1.68, 0.65, 0.23, blue);
  p.box(0, 0.084, 0.939, 1.72, 0.06, 0.228, '#336e82');
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.177;
    const tint = i % 2 ? '#e4a34e' : cream;
    p.box(x, 0.21, 0.86, 0.178, 0.3, 0.047, tint);
    p.box(x, 0.36, 0.803, 0.172, 0.03, 0.074, tint);
  }
  // A wooden crate of green glass bottles beside the counter.
  p.box(-0.91, -0.1, 0.047, 0.28, 0.41, 0.11, wood);
  for (const x of [-0.976, -0.853]) {
    for (const z of [-0.225, -0.102, 0.021]) {
      p.cylinder(x, z, 0.157, 0.063, 0.054, 0.096, '#488674', 8);
      p.cylinder(x, z, 0.253, 0.046, 0.026, 0.044, '#7caa8a', 8);
    }
  }
  p.box(-0.56, 0.41, 0.052, 0.53, 0.32, 0.26, '#d9dec9');
  p.box(-0.56, 0.41, 0.31, 0.55, 0.33, 0.032, '#59968f');
  return p;
}

export function kioskAttendant() {
  const p = new ModelParts();
  p.cylinder(-0.3, 0.15, 0.425, 0.14, 0.2, 0.14, '#e3debb', 6);
  oval(p, -0.3, 0.627, 0.16, 0.143, 0.162, 0.132, skin);
  p.box(-0.3, 0.15, 0.678, 0.16, 0.13, 0.066, '#f8efcf');
  for (const x of [0.53, 0.61]) p.cylinder(x, 0.182, 0.423, 0.042, 0.068, 0.08, '#e0ae71', 8);
  return p;
}

export function kioskQueue() {
  const p = new ModelParts();
  neighbour(p, 0.49, 0.41, 0.045, 0.54, red, '#5e7481', '#694d3c');
  neighbour(p, 0.26, 0.59, 0.045, 0.34, '#f1c261', '#556e91', '#ad7544');
  neighbour(p, -0.17, 0.75, 0.045, 0.41, '#5999aa', '#665c81', '#4c403a');
  // A pale scoop in a waffle cup, held by the child at the hatch.
  p.cylinder(0.18, 0.538, 0.207, 0.042, 0.064, 0.066, '#d49f62', 8);
  oval(p, 0.18, 0.278, 0.538, 0.073, 0.064, 0.073, '#fff1d1');
  return p;
}

export function kioskShutter() {
  const p = new ModelParts();
  // Local zero is under the awning. The bottom rail comes to rest on the serving ledge.
  p.box(0, 0, -0.439, 1.409, 0.022, 0.439, '#92a9a3');
  for (let slat = 1; slat <= 7; slat++)
    p.box(0, 0.015, -slat * 0.055, 1.409, 0.013, 0.012, '#688383');
  p.box(0, 0.015, -0.441, 1.43, 0.035, 0.021, '#456868');
  p.box(0, 0.037, -0.419, 0.19, 0.029, 0.018, iron);
  return p;
}

export function apartmentCourtyard() {
  const p = new ModelParts();
  // The rug folds over a painted steel pipe set into concrete feet.
  for (const x of [-0.17, 0.83]) {
    p.cylinder(x, -0.13, 0, 0.11, 0.09, 0.055, '#b7aa91', 8);
    p.cylinder(x, -0.13, 0.055, 0.045, 0.045, 0.51, blue, 8);
  }
  p.tube([-0.19, 0.565, -0.13], [0.85, 0.565, -0.13], 0.055, blue, 8);
  p.tube([0, 0.565, -0.13], [0.72, 0.565, -0.13], 0.068, '#813e38', 12);
  p.box(0.36, -0.16, 0.265, 0.72, 0.012, 0.3, '#813e38');
  // The longer face fans out below the rail; a shorter plain fold hangs behind it.
  const weave = (
    x: number,
    y: number,
    width: number,
    height: number,
    tint: string,
    layer = 0,
    angle = 0
  ) => {
    const z = -0.102 + (0.565 - y) * 0.31 + layer;
    const cloth = VertexData.CreateBox({ width, height, depth: 0.009 });
    p.add(cloth, x, y, z, tint, Quaternion.RotationYawPitchRoll(0, -0.3, angle));
  };
  weave(0.36, 0.354, 0.72, 0.452, '#863f39');
  weave(0.36, 0.354, 0.676, 0.401, '#e4b577', 0.003);
  weave(0.36, 0.354, 0.636, 0.356, '#994a3f', 0.006);
  for (const x of [0.17, 0.36, 0.55]) {
    weave(x, 0.354, 0.122, 0.122, '#edc891', 0.009, Math.PI / 4);
    weave(x, 0.354, 0.059, 0.059, '#495f61', 0.012, Math.PI / 4);
  }
  for (let i = 0; i < 12; i++)
    weave(0.026 + 0.061 * i, 0.119, 0.024, 0.04 + (i % 3) * 0.007, cream);

  // A wicker carpet beater rests in the neighbour's hand beside the uncovered end of the rail.
  neighbour(p, 0.98, 0.09, 0, 0.48, '#527978', '#68544b', '#af8c6a');
  p.tube([0.87, 0.22, 0.05], [0.74, 0.417, 0.008], 0.02, wood, 6);
  const beater = VertexData.CreateTorus({ diameter: 0.105, thickness: 0.018, tessellation: 8 });
  p.add(beater, 0.716, 0.456, 0, wood, Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2));

  // Sun-bleached boards make a sandpit, with a tin bucket and a child at its edge.
  p.box(-0.56, 0.16, 0.01, 0.63, 0.49, 0.036, '#d8bc87');
  for (const z of [-0.104, 0.424]) p.box(-0.56, z, 0, 0.74, 0.068, 0.079, '#b7724c');
  for (const x of [-0.895, -0.225]) p.box(x, 0.16, 0, 0.07, 0.46, 0.079, '#6d9890');
  p.box(-0.8, 0.34, 0.079, 0.23, 0.16, 0.035, '#c89c5e');
  p.cylinder(-0.45, 0.25, 0.046, 0.072, 0.098, 0.08, '#568c9e', 8);
  neighbour(p, -0.65, 0.04, 0.046, 0.3, '#e5b659', '#547989', '#825c41');
  return p;
}

export function courtyardClub() {
  const p = new ModelParts();
  p.box(0, 0, 0, 2.74, 1.57, 0.06, '#beb19b');
  p.box(0, -0.16, 0.06, 2.46, 1.08, 0.98, '#d2b794');
  p.box(0, -0.16, 0.06, 2.49, 1.1, 0.2, '#947965');
  p.box(0, -0.16, 1.04, 2.56, 1.18, 0.1, '#788888');
  p.box(0, -0.16, 1.14, 2.53, 1.16, 0.052, '#c7bc9d');
  // The projector's two reel silhouettes can be seen against the lit front window.
  p.box(0.32, 0.396, 0.37, 1.45, 0.05, 0.54, iron);
  p.box(0.32, 0.425, 0.4, 1.38, 0.025, 0.48, '#ffd891');
  for (const x of [-0.18, 0.82]) p.box(x, 0.447, 0.4, 0.032, 0.018, 0.48, '#9a7150');
  p.box(0.34, 0.456, 0.4, 0.22, 0.026, 0.08, '#734f3d');
  p.box(0.34, 0.456, 0.48, 0.16, 0.03, 0.13, iron);
  for (const x of [0.269, 0.422]) {
    p.tube([x, 0.66, 0.456], [x, 0.66, 0.476], 0.153, iron, 12);
    p.tube([x, 0.66, 0.478], [x, 0.66, 0.483], 0.054, '#e5b574', 7);
  }
  p.box(0.209, 0.456, 0.54, 0.078, 0.03, 0.055, iron);
  for (let i = 0; i < 3; i++)
    p.box(-0.78, 0.6 - i * 0.085, 0.045 + 0.039 * i, 0.79, 0.32, 0.046, '#b9aa95');
  p.box(-0.78, 0.4, 0.16, 0.56, 0.037, 0.67, '#477d81');
  p.box(-0.78, 0.424, 0.42, 0.36, 0.018, 0.27, '#e8c78e');
  p.box(-0.96, 0.443, 0.41, 0.028, 0.02, 0.07, cream);
  p.box(-0.78, 0.5, 0.843, 0.92, 0.42, 0.059, blue);
  p.box(-0.78, 0.452, 0.911, 0.89, 0.093, 0.203, blue);
  neighbour(p, -0.44, 0.66, 0.063, 0.39, '#a85a47', iron, '#c0915c');
  neighbour(p, -0.17, 0.7, 0.063, 0.36, '#538487', '#625b68', '#765142');
  // A varnished bench under the window.
  for (const x of [0.2, 0.93]) p.box(x, 0.63, 0.06, 0.06, 0.18, 0.23, iron);
  for (const z of [0.59, 0.68]) p.box(0.57, z, 0.27, 0.91, 0.08, 0.037, wood);
  return p;
}

export function firstMicrorayonPier() {
  const p = new ModelParts();
  const tones = ['#a87f56', '#b98f60', '#a47e59', '#c39a6d'];
  for (const x of [-0.31, 0.31]) {
    p.box(x, 0.04, 0.027, 0.074, 3.65, 0.075, '#75644f');
    for (const z of [-1.56, -0.63, 0.34, 1.31]) {
      p.cylinder(x, z, -0.36, 0.095, 0.11, 0.46, '#75644f', 7);
    }
  }
  for (let i = 0; i < 32; i++) {
    const wide = i < 6;
    p.box(0, -1.73 + 0.113 * i, 0.099, wide ? 1.72 : 0.85, 0.108, 0.057, tones[i % 4]);
  }
  for (const x of [-0.72, 0.72]) p.cylinder(x, -1.6, -0.4, 0.095, 0.1, 0.5, iron, 7);
  for (const z of [-1.12, -0.44, 0.24, 0.92, 1.6]) {
    p.cylinder(0.37, z, 0.156, 0.032, 0.032, 0.34, cream, 6);
  }
  p.tube([0.37, 0.496, -1.15], [0.37, 0.496, 1.63], 0.039, blue, 6);
  for (const z of [-1.59, -1.34]) {
    p.tube([-0.84, 0.23, z], [-0.96, 0.23, z], 0.032, cream, 6);
    p.tube([-0.96, -0.26, z], [-0.96, 0.23, z], 0.032, blue, 6);
  }
  for (const y of [-0.12, 0.022, 0.16])
    p.tube([-0.96, y, -1.34], [-0.96, y, -1.59], 0.022, blue, 6);

  // A wooden skiff pulled up on the sand beside the landward end of the pier.
  const hullOutline = [
    [-0.8, -0.21],
    [-0.42, -0.28],
    [0.08, -0.29],
    [0.52, -0.19],
    [0.89, 0],
    [0.52, 0.19],
    [0.08, 0.29],
    [-0.42, 0.28],
    [-0.8, 0.21]
  ];
  const hullRing = (length: number, beam: number, height: number) =>
    hullOutline.map(
      ([x, z]) => new Vector3(-0.65 + x * length, height + 0.09 * x * x, 2.3 + z * beam)
    );
  const keel = hullRing(0.82, 0.38, 0.015);
  const bottom = keel.map(({ x, y }) => new Vector3(x, y, 2.3));
  const chine = hullRing(0.94, 0.79, 0.09);
  const rail = hullRing(1, 1, 0.2);
  const lip = hullRing(1, 1.01, 0.234);
  for (const [lower, upper, tint] of [
    [bottom, keel, '#7e664f'],
    [keel, chine, '#456d70'],
    [chine, rail, '#429fa0'],
    [rail, lip, cream]
  ] as const) {
    p.add(
      VertexData.CreateRibbon({
        pathArray: [lower, upper],
        closePath: true,
        sideOrientation: Mesh.DOUBLESIDE
      }),
      0,
      0,
      0,
      tint
    );
  }
  for (const z of [-0.062, 0, 0.062]) p.box(-0.7, 2.3 + z, 0.055, 1.21, 0.057, 0.022, wood);
  for (const [x, width] of [
    [-0.46, 0.49],
    [0.02, 0.56],
    [0.43, 0.4]
  ]) {
    p.box(-0.65 + x, 2.3, 0.169, 0.13, width, 0.039, '#c79763');
  }
  // Two varnished oars rest across the seats, their painted blades at opposite ends.
  for (const side of [-1, 1]) {
    const z = 2.3 + side * 0.094;
    p.tube([-0.65 - side * 0.56, 0.229, z], [-0.65 + side * 0.4, 0.229, z], 0.033, wood, 6);
    oval(p, -0.65 + side * 0.5, 0.229, z, 0.3, 0.036, 0.096, red);
  }
  return p;
}

export function summerAtThePier() {
  const p = new ModelParts();
  // A bather sits at the end with feet in the water and a striped towel beside them.
  p.box(-0.3, -1.72, 0.155, 0.15, 0.16, 0.065, '#36648a');
  p.cylinder(-0.3, -1.71, 0.205, 0.14, 0.18, 0.16, '#dc925e', 7);
  oval(p, -0.3, 0.416, -1.71, 0.126, 0.144, 0.124, skin);
  oval(p, -0.3, 0.463, -1.7, 0.132, 0.075, 0.13, '#754b3b');
  for (const x of [-0.349, -0.248]) {
    p.tube([x, 0.172, -1.71], [x, 0.151, -1.84], 0.069, '#367389', 6);
    p.tube([x, 0.15, -1.84], [x, -0.17, -1.89], 0.056, skin, 6);
    p.tube([x, -0.17, -1.89], [x, -0.186, -1.95], 0.065, skin, 6);
  }
  p.box(0.48, -1.46, 0.156, 0.36, 0.49, 0.013, '#d96750');
  for (const z of [-1.62, -1.54, -1.34]) p.box(0.48, z, 0.169, 0.36, 0.027, 0.007, cream);
  p.cylinder(0.08, -0.4, 0.156, 0.036, 0.036, 0.62, wood, 6);
  p.cylinder(0.08, -0.4, 0.755, 0.91, 0.072, 0.26, '#d5684d', 10);
  for (let i = 0; i < 10; i++) {
    const theta = (i * 2 * Math.PI) / 10 + Math.PI / 2;
    p.tube(
      [0.08, 1.015, -0.4],
      [0.08 + 0.45 * Math.cos(theta), 0.756, -0.4 + 0.45 * Math.sin(theta)],
      0.016,
      cream,
      5
    );
  }
  p.cylinder(0.08, -0.4, 1.012, 0.072, 0.052, 0.039, cream, 8);
  const ring = VertexData.CreateTorus({ diameter: 0.27, thickness: 0.063, tessellation: 12 });
  p.add(ring, -0.16, 0.27, 0.72, '#dd7948', Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2));
  neighbour(p, 0.01, 0.72, 0.156, 0.395, '#e6d9a4', '#648d95', '#8e5e3c');
  return p;
}

export function toryshStones(outlying = false) {
  const p = new ModelParts();
  // The chain of outcrops continues down the slope beyond the hiker's stopping place.
  const stones = outlying
    ? ([
        [2.88, -1.66, 0.87, '#b49875'],
        [3.28, -1.35, 0.34, '#c4a481'],
        [-2.62, -1.71, 0.53, '#b89b77'],
        [-2.95, -1.62, 0.32, '#ae9573'],
        [-0.57, -3.4, 0.77, '#c4a076'],
        [0.42, -3.78, 0.39, '#a48a6d'],
        [1.02, -3.9, 0.47, '#b49977'],
        [4.3, 0.96, 0.69, '#ba9770'],
        [4.45, 1.47, 0.46, '#af9373'],
        [3.56, 2.87, 0.28, '#b99b74'],
        [-2.29, -4.75, 0.24, '#b99b74'],
        [2.4, -4.73, 0.39, '#ac9578'],
        [0.85, -5.37, 0.56, '#bd9b75'],
        [3.4, -4.5, 0.47, '#af9373']
      ] as const)
    : ([
        [-1.02, -0.56, 1.1, '#a88460'],
        [0.93, -0.91, 0.87, '#c4976e'],
        [0.74, 0.79, 0.5, '#bd946d'],
        [-1.4, 0.58, 0.41, '#ad8a69'],
        [-0.21, -1.29, 0.37, '#c6a47e'],
        [1.27, 0.16, 0.34, '#a68c6a'],
        [0.4, -1.55, 0.25, '#b68f67'],
        [-1.52, -1.07, 0.22, '#c9a27a']
      ] as const);
  for (const [x, z, diameter, tint] of stones) {
    const stone = VertexData.CreateIcoSphere({
      radius: diameter / 2,
      subdivisions: diameter > 0.7 ? 3 : 2,
      flat: true
    });
    const positions = stone.positions!;
    for (let i = 0; i < positions.length; i += 3) {
      const weathering =
        1 + 0.06 * Math.cos(positions[i + 1] * 12 + x) * Math.sin(positions[i + 2] * 11 + z);
      positions[i] *= weathering;
      positions[i + 1] *= (0.78 + 0.13 * Math.sin(x * 4)) * weathering;
    }
    p.add(stone, x, diameter * 0.32, z, tint);
  }
  if (outlying) return p;
  // Open halves show the rust-coloured core and successive growth rings inside the grey rind.
  for (const [x, y, z, yaw, tilt] of [
    [-0.29, 0.33, -0.07, -0.64, -0.16],
    [0.13, 0.19, 0.54, 2.21, -1.12]
  ]) {
    const shell = VertexData.CreateSphere({ diameter: 0.92, arc: 0.5, segments: 5 });
    p.add(shell, x, y, z, '#9a8b76', Quaternion.RotationYawPitchRoll(yaw, tilt, 0));
    for (const [diameter, offset, tint] of [
      [0.912, 0, '#bba68b'],
      [0.8, 0.008, '#a38061'],
      [0.68, 0.014, '#cfaa7a'],
      [0.55, 0.02, '#aa7353'],
      [0.34, 0.026, '#986044']
    ] as const) {
      const normalX = Math.sin(yaw) * Math.cos(tilt),
        normalY = -Math.sin(tilt),
        normalZ = Math.cos(yaw) * Math.cos(tilt);
      p.tube(
        [x + normalX * offset, y + normalY * offset, z + normalZ * offset],
        [
          x + normalX * (offset + 0.006),
          y + normalY * (offset + 0.006),
          z + normalZ * (offset + 0.006)
        ],
        diameter,
        tint,
        16
      );
    }
  }
  neighbour(p, -0.65, 0.88, 0.012, 0.56, '#66888a', '#685f53', '#c3a169');
  p.box(-0.65, 0.957, 0.235, 0.143, 0.092, 0.18, '#ab7448');
  p.box(-0.65, 1.008, 0.28, 0.135, 0.022, 0.055, '#bf935d');
  p.cylinder(-0.76, 0.81, 0.137, 0.052, 0.052, 0.113, '#687d76', 7);
  p.cylinder(-0.76, 0.81, 0.25, 0.049, 0.048, 0.032, cream, 7);
  for (const [x, z] of [
    [-1.37, 0.05],
    [0.69, -1.37],
    [1.4, -0.53],
    [1.21, 0.95],
    [-0.36, 1.24]
  ]) {
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      p.tube(
        [x, 0, z],
        [x + 0.13 * Math.cos(a), 0.105 + (i % 3) * 0.032, z + 0.13 * Math.sin(a)],
        0.018,
        '#938852',
        4
      );
    }
  }
  return p;
}

export function enamelSign(
  parent: Mesh,
  word: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number
) {
  const scene = parent.getScene();
  const texture = new DynamicTexture(word, { width: 512, height: 96 }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = '#285d70';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#d8e4cf';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 500, 84);
  ctx.fillStyle = '#fff5db';
  ctx.font = 'bold 72px sans-serif';
  const textWidth = Math.min(468, ctx.measureText(word).width);
  ctx.fillText(word, (512 - textWidth) / 2, 74, 468);
  texture.update();
  const material = new StandardMaterial(word, scene);
  material.diffuseTexture = texture;
  material.emissiveColor.set(0.2, 0.2, 0.2);
  material.specularColor = Color3.Black();
  const sign = MeshBuilder.CreatePlane(word, { width, height }, scene);
  sign.parent = parent;
  sign.position.set(x, y, z);
  sign.rotation.y = Math.PI;
  sign.material = material;
  sign.isPickable = false;
  sign.onDisposeObservable.addOnce(() => material.dispose(true, true));
}
