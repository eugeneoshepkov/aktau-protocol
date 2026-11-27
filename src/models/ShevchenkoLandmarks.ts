import { Color3, Constants, Matrix, Mesh, MeshBuilder, Quaternion, StandardMaterial, Vector3, VertexData } from '@babylonjs/core';
import { markKitchenWindow, ModelParts } from './CityModels';

const shell = '#e4d6b7';
const chalk = '#efe4ca';
const recessed = '#515b59';
const oxide = '#af5140';
const towerX = -0.13, towerZ = 0.19;

// No. 9, fourth microrayon. The pierced central stairwell forms the daymark
// below the eight-sided lantern. The long street elevation faces positive Z.
export function melovoyLighthouse(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, -0.08, 2.55, 1.16, 0.16, '#b9b09b');
  p.box(0, -0.05, 0.08, 2.34, 0.87, 2.19, shell);
  p.box(0, 0.06, 0.08, 2.37, 0.87, 0.15, '#c0b497');

  const slots = new VertexData();
  const positions: number[] = [];
  const indices: number[] = [];
  for (let floor = 0; floor < 10; floor++) {
    const y = 0.22 + floor * 0.205;
    for (const [x, width] of [[-0.81, 0.73], [0.65, 1.02]]) {
      p.box(x, -0.05, y + 0.025, width, 0.902, 0.112, '#657b7c');
      // A single flat behind each band of glazing leaves the lantern the brightest point.
      const side = x < 0 ? 0 : 1;
      const bay = (floor * 3 + side) % 5;
      const paneX = x + width * ((bay + 0.5) / 5 - 0.5);
      const kitchen = p.box(paneX, -0.05, y + 0.025, width / 5 - 0.024, 0.906, 0.112, '#657b7c');
      markKitchenWindow(kitchen, floor * 2 + side);
      for (let pane = 1; pane < 5; pane++) {
        p.box(x + width * (pane / 5 - 0.5), -0.05, y + 0.024, 0.024, 0.909, 0.115, chalk);
      }
      p.box(x, 0.402, y + 0.002, width + 0.025, 0.112, 0.052, chalk);
    }
    for (const x of [-1.173, 1.173]) {
      p.box(x, -0.04, y + 0.04, 0.017, 0.085, 0.094, recessed);
    }

    p.box(towerX, 0.435, y, 0.53, 0.205, 0.209, floor % 2 === 1 ? oxide : chalk);
    // Shallow, triangular openings let the stairwell read as a pierced screen at city zoom.
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const sx = towerX - 0.173 + col * 0.087;
        const sy = y + 0.028 + row * 0.079;
        const v = positions.length / 3;
        positions.push(sx - 0.03, sy, 0.539, sx + 0.03, sy, 0.539, sx, sy + 0.055, 0.539);
        indices.push(v, v + 2, v + 1);
      }
    }
  }
  slots.positions = positions;
  slots.indices = indices;
  slots.uvs = new Float32Array(positions.length / 3 * 2);
  slots.normals = [];
  VertexData.ComputeNormals(positions, indices, slots.normals);
  p.add(slots, 0, 0, 0, recessed);

  p.box(0, -0.04, 2.265, 2.41, 0.96, 0.057, chalk);
  p.box(0, -0.04, 2.322, 2.35, 0.89, 0.025, '#a8a393');
  // Open slats on the roof, visible from above the housing block.
  for (const x of [-1.12, -0.76, -0.42, 0.21, 0.55, 0.88, 1.13]) {
    p.box(x, 0.22, 2.345, 0.045, 0.048, 0.095, shell);
    p.box(x, 0.04, 2.434, 0.047, 0.42, 0.041, chalk);
  }
  p.box(0, 0.23, 2.436, 2.33, 0.048, 0.048, chalk);
  p.box(towerX, 0.235, 2.31, 0.51, 0.49, 0.15, chalk);

  p.cylinder(towerX, towerZ, 2.46, 0.381, 0.353, 0.125, '#58615f', 8);
  p.cylinder(towerX, towerZ, 2.585, 0.356, 0.407, 0.18, chalk, 8);
  p.cylinder(towerX, towerZ, 2.765, 0.46, 0.46, 0.061, oxide, 8);
  p.cylinder(towerX, towerZ, 2.826, 0.305, 0.36, 0.192, '#b6c7bf', 8);
  p.cylinder(towerX, towerZ, 2.852, 0.32, 0.34, 0.09, '#f8e3a1', 8);
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI * i / 4;
    const x = Math.cos(angle), z = Math.sin(angle);
    p.tube([towerX + x * 0.165, 2.816, towerZ + z * 0.165],
      [towerX + x * 0.213, 3.019, towerZ + z * 0.213], 0.025, '#615349', 5);
  }
  p.cylinder(towerX, towerZ, 3.016, 0.5, 0.52, 0.05, oxide, 8);
  p.cylinder(towerX, towerZ, 3.066, 0.52, 0.085, 0.075, '#8a473b', 8);
  p.cylinder(towerX, towerZ, 3.14, 0.022, 0.012, 0.113, '#69706b', 6);
  return p;
}

// The lamp, shaft and glints are local to the roof. The landmark keeps its own bounds for the tour.
export function mountLighthouseBeacon(lighthouse: Mesh): (brightness: number, dust: number) => void {
  const scene = lighthouse.getScene();
  const glass = MeshBuilder.CreateCylinder('Melovoy lantern', {
    height: 0.135, diameterBottom: 0.34, diameterTop: 0.354, tessellation: 8
  }, scene);
  glass.parent = lighthouse;
  glass.position.set(towerX, 2.908, towerZ);
  glass.isPickable = false;

  const light = new StandardMaterial('Melovoy beacon light', scene);
  light.disableLighting = true;
  light.emissiveColor = Color3.FromHexString('#ffe9af');
  light.backFaceCulling = false;
  light.alphaMode = Constants.ALPHA_ADD;
  glass.material = light;

  const beam = new Mesh('Melovoy seaward beam', scene);
  beam.parent = glass;
  beam.isPickable = false;
  beam.hasVertexAlpha = true;
  beam.material = light;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const point = (x: number, y: number, z: number, alpha: number) => {
    positions.push(x, y, z);
    colors.push(1, 1, 1, alpha);
  };
  const seaLevel = -0.01 - lighthouse.position.y - glass.position.y;
  // A soft ribbon of sea mist. Its transparent margins widen as the light reaches the water.
  for (const [distance, width, strength] of [
    [0.16, 0.07, 0.59], [2.4, 0.20, 0.35], [8.8, 0.48, 0.16],
    [16.8, 0.90, 0.08], [21.2, 1.22, 0]
  ]) {
    const i = positions.length / 3;
    const y = Math.max(seaLevel, distance * seaLevel / 18.8);
    point(-width, y, -distance, 0);
    point(0, y, -distance, strength);
    point(width, y, -distance, 0);
    if (i) indices.push(i - 3, i - 2, i, i, i - 2, i + 1, i - 2, i - 1, i + 1, i + 1, i - 1, i + 2);
  }
  // Broken highlights at the foot of the beam suggest crests catching the sweep.
  for (let n = 0; n < 14; n++) {
    const i = positions.length / 3;
    const z = -15.5 - n * 0.42, x = 0.19 * Math.sin(2.4 * n);
    const width = (0.22 + 0.09 * Math.sin(4.6 * n)) * Math.sin((n + 1) * Math.PI / 15);
    point(x - width, seaLevel, z, 0);
    point(x, seaLevel, z - 0.045, 0.26);
    point(x + width, seaLevel, z, 0);
    point(x, seaLevel, z + 0.045, 0.2);
    indices.push(i, i + 1, i + 3, i + 3, i + 1, i + 2);
  }
  const data = new VertexData();
  Object.assign(data, { positions, indices, colors });
  data.applyToMesh(beam);
  glass.setEnabled(false);
  let phase = 0.45;
  const sweep = scene.onBeforeRenderObservable.add(() => {
    if (!glass.isEnabled()) return;
    phase += Math.min(100, scene.getEngine().getDeltaTime()) * 0.00032;
    beam.rotation.y = Math.sin(phase) * 0.98 - lighthouse.rotation.y;
  });
  glass.onDisposeObservable.addOnce(() => {
    scene.onBeforeRenderObservable.remove(sweep);
    light.dispose();
  });
  return (brightness, dust) => {
    glass.setEnabled(brightness > 0);
    light.alpha = brightness;
    beam.scaling.x = 1 + 0.65 * dust;
  };
}

// The poet leans over one raised knee with both hands resting on it.
// The opposite boot extends forward, out of his long draped coat.
export function shevchenkoMonument(): ModelParts {
  const p = new ModelParts();
  const bronze = '#62574a';
  const litBronze = '#776a56';
  const deepBronze = '#49463f';
  const patina = '#625f50';
  const marble = '#766b59';

  function form(
    x: number, y: number, z: number, width: number, height: number, depth: number,
    color: string, tilt = 0
  ): void {
    const shape = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 2, flat: true });
    shape.transform(Matrix.Scaling(width, height, depth));
    p.add(shape, x, y, z, color, Quaternion.RotationAxis(Vector3.Right(), tilt));
  }

  // Successive elliptical sections keep the tailoring and rock continuous in silhouette.
  type Section = [x: number, y: number, z: number, width: number, depth: number];
  function sections(rings: Section[], color: string, sides = 8): void {
    const paths = rings.map(([x, y, z, width, depth]) =>
      Array.from({ length: sides }, (_, i) => {
        const angle = (i + 0.5) * Math.PI * 2 / sides;
        return new Vector3(x + width * Math.cos(angle) / 2, y, z + depth * Math.sin(angle) / 2);
      })
    );
    const shape = VertexData.CreateRibbon({ pathArray: paths, closePath: true, sideOrientation: Mesh.DOUBLESIDE });
    p.add(shape, 0, 0, 0, color);
  }

  // The square has broad flat, overhanging slabs and a recessed line of inscription.
  p.box(0, 0, -0.055, 2.22, 1.79, 0.1, '#c7b697');
  p.box(-0.12, -0.01, 0.045, 1.98, 1.5, 0.13, '#965f52');
  p.box(-0.19, 0.744, 0.083, 1.07, 0.009, 0.048, '#6c625a');
  p.box(-0.17, -0.17, 0.175, 1.64, 1.05, 0.13, marble);
  p.box(0.73, -0.115, 0.207, 0.59, 1.16, 0.103, marble);
  p.box(-0.06, -0.18, 0.305, 1.94, 1.08, 0.035, '#92846d');

  sections([
    [-0.13, 0.332, -0.09, 0.74, 0.58], [-0.15, 0.39, -0.09, 0.71, 0.55],
    [-0.19, 0.52, -0.14, 0.62, 0.53], [-0.17, 0.69, -0.2, 0.49, 0.42],
    [-0.16, 0.82, -0.17, 0.37, 0.33], [-0.16, 0.825, -0.17, 0.001, 0.001]
  ], patina, 7);
  sections([
    [-0.22, 0.333, 0.108, 0.443, 0.44], [-0.246, 0.401, 0.155, 0.358, 0.408],
    [-0.217, 0.516, 0.197, 0.227, 0.294], [-0.207, 0.532, 0.209, 0.159, 0.214],
    [-0.208, 0.534, 0.209, 0.001, 0.001]
  ], '#686450', 6);
  // Coat tails lie against the stone, spreading wide below the shoulders.
  sections([
    [-0.15, 0.56, -0.24, 0.38, 0.21], [-0.135, 0.68, -0.25, 0.65, 0.3],
    [-0.115, 0.82, -0.21, 0.59, 0.28], [-0.105, 1.01, -0.19, 0.51, 0.28],
    [-0.09, 1.19, -0.14, 0.48, 0.28], [-0.084, 1.32, -0.10, 0.47, 0.24],
    [-0.09, 1.39, -0.078, 0.2, 0.20]
  ], bronze);
  sections([
    [-0.11, 0.785, -0.065, 0.44, 0.32], [-0.094, 0.895, -0.048, 0.36, 0.31],
    [-0.083, 1.06, -0.062, 0.31, 0.27], [-0.075, 1.235, -0.075, 0.418, 0.282],
    [-0.074, 1.319, -0.063, 0.46, 0.237], [-0.069, 1.374, -0.048, 0.21, 0.185]
  ], bronze);
  p.tube([-0.195, 1.333, 0.004], [-0.092, 1.144, 0.088], 0.053, litBronze, 5);
  p.tube([0.057, 1.341, 0.004], [-0.076, 1.131, 0.086], 0.036, deepBronze, 5);

  // The upper legs turn forward from the hips. One knee sits higher than the other.
  form(-0.196, 0.932, 0.063, 0.207, 0.35, 0.257, bronze, 0.94);
  sections([
    [-0.2, 0.56, 0.215, 0.15, 0.144], [-0.20, 0.61, 0.215, 0.182, 0.16],
    [-0.203, 0.694, 0.198, 0.165, 0.17], [-0.212, 0.94, 0.176, 0.212, 0.23],
    [-0.21, 1.025, 0.175, 0.205, 0.214], [-0.205, 1.074, 0.172, 0.124, 0.15]
  ], bronze);
  form(-0.2, 0.565, 0.265, 0.187, 0.107, 0.243, deepBronze);
  form(0.054, 0.817, 0.057, 0.235, 0.244, 0.428, bronze, -0.30);
  sections([
    [0.224, 0.399, 0.351, 0.146, 0.157], [0.217, 0.447, 0.332, 0.183, 0.176],
    [0.192, 0.52, 0.296, 0.148, 0.157], [0.15, 0.673, 0.251, 0.181, 0.171],
    [0.105, 0.797, 0.198, 0.215, 0.213], [0.104, 0.861, 0.176, 0.16, 0.172]
  ], litBronze);
  form(0.23, 0.395, 0.39, 0.177, 0.109, 0.25, deepBronze);

  sections([
    [-0.247, 1.061, 0.134, 0.105, 0.124], [-0.291, 1.099, 0.065, 0.144, 0.15],
    [-0.286, 1.182, 0.014, 0.166, 0.157], [-0.263, 1.305, -0.058, 0.184, 0.167],
    [-0.24, 1.345, -0.074, 0.11, 0.114]
  ], bronze);
  form(-0.205, 1.064, 0.166, 0.135, 0.119, 0.195, bronze, 0.34);
  sections([
    [0.046, 1.07, 0.184, 0.137, 0.131], [0.112, 1.102, 0.123, 0.149, 0.15],
    [0.123, 1.198, 0.047, 0.172, 0.149], [0.114, 1.303, -0.042, 0.195, 0.172],
    [0.066, 1.351, -0.054, 0.134, 0.125]
  ], litBronze);
  form(-0.028, 1.081, 0.193, 0.213, 0.094, 0.113, litBronze);
  form(-0.137, 1.066, 0.218, 0.129, 0.077, 0.096, bronze);
  form(-0.166, 1.006, 0.226, 0.084, 0.12, 0.067, litBronze);

  // Bowed forehead, receding hair and a moustache like the bronze portrait.
  p.tube([-0.08, 1.324, -0.054], [-0.082, 1.438, -0.016], 0.118, bronze, 8);
  sections([
    [-0.080, 1.386, 0.051, 0.09, 0.108], [-0.087, 1.423, 0.038, 0.147, 0.145],
    [-0.094, 1.477, 0.016, 0.187, 0.181], [-0.092, 1.549, -0.004, 0.191, 0.174],
    [-0.095, 1.581, -0.018, 0.127, 0.13], [-0.096, 1.591, -0.027, 0.025, 0.03]
  ], litBronze);
  form(-0.095, 1.523, -0.055, 0.191, 0.124, 0.119, bronze, 0.26);
  for (const x of [-0.133, -0.057]) {
    form(x, 1.491, 0.097, 0.046, 0.021, 0.024, deepBronze);
    form(x, 1.509, 0.092, 0.064, 0.022, 0.036, litBronze);
  }
  form(-0.081, 1.47, 0.112, 0.054, 0.066, 0.068, litBronze);
  form(-0.086, 1.438, 0.101, 0.104, 0.032, 0.051, deepBronze);
  return p;
}
