import {
  type BoundingBox,
  Color3,
  Matrix,
  Mesh,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData
} from '@babylonjs/core';
import { CustomMaterial } from '@babylonjs/materials/custom/customMaterial';
import type { BuildingType } from '../types';
import type { CivicProjectKind } from '../simulation/DistrictPlan';
import { publicGarden, districtHeating } from './CivicModels';
import { snowOnRoofs } from '../engine/Seasons';

const limestone = '#e5d5ae';
const white = '#f3e8cc';
const concrete = '#b5aa92';
const shadow = '#536263';
const navy = '#334c53';
const glass = '#658b91';
const teal = '#368d89';
const turquoise = '#77bbb0';
const rust = '#bc5d3e';
const orange = '#e38b48';
const steel = '#99a7a2';

// Design coordinates use x/z for the site plan and a bottom elevation for each piece.
export class ModelParts {
  private pieces: VertexData[] = [];

  add(
    data: VertexData,
    x: number,
    y: number,
    z: number,
    color: string,
    rotation = Quaternion.Identity()
  ) {
    data.transform(Matrix.Compose(Vector3.One(), rotation, new Vector3(x, y, z)));
    const tint = Color3.FromHexString(color);
    const colors: number[] = [];
    for (let i = 0; i < data.positions!.length; i += 3) {
      colors.push(tint.r, tint.g, tint.b, 1);
    }
    data.colors = colors;
    this.pieces.push(data);
    return data;
  }

  box(
    x: number,
    z: number,
    bottom: number,
    width: number,
    depth: number,
    height: number,
    color: string
  ) {
    return this.add(VertexData.CreateBox({ width, depth, height }), x, bottom + height / 2, z, color);
  }

  cylinder(
    x: number,
    z: number,
    bottom: number,
    base: number,
    top: number,
    height: number,
    color: string,
    sides = 20
  ) {
    const shape = VertexData.CreateCylinder({
      diameterBottom: base,
      diameterTop: top,
      height,
      tessellation: sides
    });
    this.add(shape, x, bottom + height / 2, z, color);
  }

  tube(start: number[], end: number[], diameter: number, color: string, sides = 10) {
    const a = Vector3.FromArray(start);
    const b = Vector3.FromArray(end);
    const direction = b.subtract(a);
    const shape = VertexData.CreateCylinder({
      height: direction.length(),
      diameter,
      tessellation: sides
    });
    const rotation = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), rotation);
    const midpoint = Vector3.Center(a, b);
    this.add(shape, midpoint.x, midpoint.y, midpoint.z, color, rotation);
  }

  finish(name: string, scene: Scene) {
    const [geometry, ...details] = this.pieces;
    geometry.merge(details, true);
    const mesh = new Mesh(name, scene);
    geometry.applyToMesh(mesh);
    return mesh;
  }
}

function foundation(p: ModelParts, width: number, depth: number, color = concrete) {
  p.box(0, 0, -0.12, width, depth, 0.17, color);
  p.box(0, 0, 0.05, width + 0.035, depth + 0.035, 0.055, limestone);
}

function stack(p: ModelParts, x: number, z: number, diameter: number, height: number) {
  p.cylinder(x, z, 0.1, diameter * 1.55, diameter * 1.38, 0.23, concrete);
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const lower = diameter * (1 - (0.36 * i) / segments);
    const upper = diameter * (1 - (0.36 * (i + 1)) / segments);
    p.cylinder(
      x,
      z,
      0.33 + (i * height) / segments,
      lower,
      upper,
      height / segments,
      i % 2 === 0 ? rust : white
    );
  }
  const rim = diameter * 0.74;
  p.cylinder(x, z, height + 0.33, rim, rim, 0.055, shadow);
  p.cylinder(x, z, height + 0.385, rim * 0.78, rim * 0.78, 0.005, navy);
}

function reactor(p: ModelParts) {
  foundation(p, 1.96, 1.66);
  // IAEA TECDOC-1769, fig. 10: a tall ochre hall behind a brick front with three glazed bays.
  const ochre = '#d4b477';
  const brick = '#bd7658';
  p.box(-0.04, -0.19, 0.105, 1.17, 0.89, 1.51, ochre);
  p.box(-0.04, -0.19, 1.615, 1.20, 0.92, 0.036, limestone);
  p.box(-0.04, -0.19, 1.651, 1.13, 0.85, 0.02, '#969787');
  for (const x of [-0.36, 0.02, 0.40]) p.box(x, -0.19, 1.671, 0.012, 0.81, 0.006, '#a8a599');
  for (const z of [-0.4, -0.10, 0.18]) p.box(-0.628, z, 0.21, 0.014, 0.015, 1.34, '#c1a46e');

  p.box(0.045, 0.37, 0.105, 1.45, 0.55, 0.91, brick);
  p.box(0.045, 0.37, 1.015, 1.48, 0.58, 0.045, concrete);
  for (const x of [-0.43, -0.09, 0.25]) {
    p.box(x, 0.65, 0.24, 0.145, 0.027, 0.68, '#596f78');
    for (let j = 0; j < 4; j++) p.box(x, 0.667, 0.34 + j * 0.15, 0.145, 0.011, 0.015, shadow);
    p.box(x - 0.095, 0.65, 0.105, 0.041, 0.052, 0.91, '#d18a64');
  }
  for (const x of [0.49, 0.63]) {
    for (const y of [0.31, 0.53, 0.75]) p.box(x, 0.65, y, 0.086, 0.019, 0.085, navy);
  }
  // External steel stair and landings stand clear of the high hall's facade.
  for (const x of [-0.46, -0.24]) p.box(x, 0.304, 1.057, 0.027, 0.027, 0.58, steel);
  for (let i = 0; i < 3; i++) {
    const y = 1.065 + i * 0.165;
    p.box(-0.35, 0.305, y, 0.25, 0.12, 0.03, shadow);
    const dx = i % 2 ? 0.09 : -0.09;
    p.tube([-0.35 + dx, y + 0.03, 0.34], [-0.35 - dx, y + 0.17, 0.34], 0.035, steel, 4);
  }
  p.box(-0.76, 0.18, 0.105, 0.27, 0.79, 0.37, brick);
  p.box(-0.76, 0.18, 0.475, 0.30, 0.82, 0.04, concrete);
  for (const z of [-0.04, 0.18, 0.40]) p.box(-0.898, z, 0.255, 0.013, 0.14, 0.12, glass);
  stack(p, 0.73, -0.48, 0.175, 1.98);
  stack(p, -0.78, -0.43, 0.12, 1.29);
}

function pump(p: ModelParts) {
  // Water laps below this pier and around the intake legs.
  for (const x of [-0.59, 0.59]) {
    for (const z of [-0.4, 0.4]) p.cylinder(x, z, -0.34, 0.13, 0.13, 0.63, shadow, 10);
  }
  p.box(0, 0, 0.1, 1.52, 1.09, 0.14, shadow);
  p.box(0, 0, 0.24, 1.55, 1.11, 0.065, limestone);
  p.box(-0.31, 0, 0.305, 0.69, 0.75, 0.5, teal);
  p.box(-0.31, 0, 0.52, 0.7, 0.76, 0.18, navy);
  for (const x of [-0.53, -0.29, -0.06]) p.box(x, 0, 0.51, 0.04, 0.77, 0.2, white);
  p.box(-0.31, 0, 0.805, 0.8, 0.86, 0.085, white);
  // An orange gantry straddles the exposed intake assembly.
  for (const z of [-0.39, 0.39]) {
    p.box(0.54, z, 0.305, 0.11, 0.1, 1.0, orange);
    p.tube([0.54, 1.0, z], [0.28, 1.31, z], 0.052, rust, 6);
    p.box(0.39, z, 1.3, 0.57, 0.14, 0.105, orange);
  }
  p.box(0.25, 0, 1.31, 0.16, 0.88, 0.11, orange);
  p.tube([0.25, 1.32, 0.05], [0.25, 0.9, 0.05], 0.035, navy);
  for (const z of [-0.16, 0.21]) {
    p.tube([0.34, 0.12, z], [0.34, 0.62, z], 0.19, turquoise);
    p.tube([-0.15, 0.61, z], [0.34, 0.61, z], 0.2, turquoise);
    p.cylinder(0.34, z, 0.67, 0.24, 0.23, 0.05, white);
  }
  for (const x of [-0.66, -0.12, 0.47]) p.box(x, 0.5, 0.31, 0.032, 0.032, 0.19, orange);
  p.box(-0.095, 0.5, 0.49, 1.16, 0.03, 0.035, orange);
}

function distiller(p: ModelParts) {
  foundation(p, 1.73, 1.13);
  // IAEA TECDOC-1642, fig. 44: a bank of upright evaporators raised above an open gallery.
  const columns = [-0.57, -0.19, 0.19, 0.57];
  const vessel = '#b5c9c3';
  for (const x of [-0.72, 0, 0.72]) {
    for (const z of [-0.32, 0.32]) p.box(x, z, 0.105, 0.054, 0.054, 0.38, shadow);
  }
  for (const z of [-0.32, 0.32]) {
    p.box(0, z, 0.45, 1.55, 0.073, 0.075, shadow);
    for (const x of [-0.72, 0]) {
      p.tube([x, 0.12, z], [x + 0.72, 0.46, z], 0.031, steel, 4);
      p.tube([x, 0.46, z], [x + 0.72, 0.12, z], 0.031, steel, 4);
    }
  }
  p.box(0, 0, 0.52, 1.58, 0.72, 0.045, steel);
  for (const x of columns) {
    p.cylinder(x, 0, 0.106, 0.171, 0.171, 0.46, '#768d89', 12);
    p.cylinder(x, 0, 0.565, 0.18, 0.33, 0.15, vessel, 16);
    p.cylinder(x, 0, 0.715, 0.33, 0.33, 0.36, vessel, 16);
    p.cylinder(x, 0, 0.82, 0.34, 0.34, 0.022, steel, 16);
    p.cylinder(x, 0, 1.075, 0.375, 0.375, 0.035, shadow, 16);
    p.cylinder(x, 0, 1.11, 0.375, 0.245, 0.09, '#d6ded2', 16);
    p.cylinder(x, 0, 1.20, 0.245, 0.12, 0.035, '#d6ded2', 16);
    p.tube([x, 1.23, 0], [x, 1.30, -0.09], 0.076, steel);
    p.tube([x, 1.30, -0.09], [x, 1.30, -0.24], 0.076, steel);
  }
  p.tube([-0.74, 0.24, 0.43], [0.74, 0.24, 0.43], 0.105, teal);
  p.tube([-0.73, 1.30, -0.24], [0.70, 1.30, -0.24], 0.086, steel);
  p.cylinder(-0.73, -0.24, 0.2, 0.102, 0.102, 1.16, steel);
  // Handrails trace the front service gallery. One open vent gives vapor a visible outlet.
  for (const x of columns) p.box(x, 0.325, 0.565, 0.024, 0.024, 0.15, rust);
  p.box(0, 0.325, 0.626, 1.55, 0.02, 0.015, steel);
  p.box(0, 0.325, 0.70, 1.55, 0.027, 0.025, orange);
  p.cylinder(-0.73, -0.24, 1.36, 0.122, 0.122, 0.03, shadow);
}

function waterTank(p: ModelParts) {
  foundation(p, 1.23, 1.08);
  p.cylinder(-0.09, -0.04, 0.11, 0.64, 0.53, 0.16, shadow);
  p.cylinder(-0.09, -0.04, 0.27, 0.46, 0.33, 0.71, limestone);
  p.cylinder(-0.09, -0.04, 0.98, 0.35, 0.91, 0.27, teal);
  p.cylinder(-0.09, -0.04, 1.25, 0.91, 0.96, 0.31, turquoise);
  p.cylinder(-0.09, -0.04, 1.32, 0.935, 0.94, 0.065, white);
  p.cylinder(-0.09, -0.04, 1.56, 1.01, 1.01, 0.055, shadow);
  p.cylinder(-0.09, -0.04, 1.615, 0.99, 0.37, 0.14, white);
  p.cylinder(-0.09, -0.04, 1.755, 0.19, 0.18, 0.07, teal);
  p.tube([0.16, 0.17, 0.06], [0.16, 1.08, 0.06], 0.075, orange);
  p.box(0.34, 0.29, 0.105, 0.37, 0.29, 0.27, concrete);
  p.box(0.34, 0.29, 0.37, 0.41, 0.34, 0.055, teal);
}

function thermalPlant(p: ModelParts) {
  foundation(p, 1.69, 1.37);
  p.box(0, 0.17, 0.105, 1.4, 0.85, 0.56, rust);
  p.box(0, 0.17, 0.43, 1.41, 0.86, 0.15, glass);
  for (let i = 0; i < 6; i++) p.box(-0.65 + i * 0.26, 0.17, 0.11, 0.046, 0.88, 0.55, limestone);
  p.box(0, 0.17, 0.665, 1.48, 0.91, 0.065, shadow);
  for (const x of [-0.45, 0, 0.45]) {
    p.box(x, 0.17, 0.73, 0.31, 0.71, 0.16, glass);
    p.box(x, 0.17, 0.89, 0.37, 0.75, 0.045, limestone);
  }
  stack(p, -0.42, -0.41, 0.22, 1.49);
  stack(p, 0.39, -0.41, 0.24, 1.94);
  p.tube([-0.43, 0.26, -0.43], [0.5, 0.26, -0.43], 0.13, steel);
}

// These meshes are opaque. The unused vertex alpha carries a household ID through batching.
export function markKitchenWindow(pane: VertexData, id: number): void {
  const colors = pane.colors!;
  for (let i = 3; i < colors.length; i += 4) colors[i] = (1 + id) / 64;
}

function housing(p: ModelParts, variant: number) {
  const floors = [5, 7, 4][variant];
  const wall = [limestone, '#e2c5a2', '#cbd0b9'][variant];
  const accent = [teal, rust, '#507a85'][variant];
  foundation(p, 1.51, 0.97);
  p.box(0, -0.1, 0.105, 1.35, 0.53, 0.15, shadow);
  for (let f = 0; f < floors; f++) {
    const y = 0.255 + f * 0.18;
    p.box(0, -0.1, y, 1.35, 0.54, 0.18, wall);
    // Wrap windows around both long elevations. The balcony rails cast a visible horizontal band.
    for (let bay = 0; bay < 6; bay++) {
      const x = -0.55 + bay * 0.22;
      const pane =
        (bay * 7 + f * 3 + variant) % 8 === 0 ? '#c5aa78' : (bay + f) % 3 === 0 ? glass : navy;
      markKitchenWindow(p.box(x, -0.1, y + 0.059, 0.138, 0.548, 0.086, pane), f * 6 + bay);
    }
    for (const x of [-0.44, 0.44]) {
      p.box(x, 0.202, y + 0.011, 0.36, 0.115, 0.029, white);
      p.box(x, 0.255, y + 0.039, 0.36, 0.026, 0.055, accent);
    }
    p.box(0, -0.1, y + 0.172, 1.36, 0.55, 0.012, concrete);
  }
  const roof = 0.255 + floors * 0.18;
  p.box(0, -0.1, roof, 1.43, 0.61, 0.06, white);
  p.box(0, -0.1, roof + 0.06, 1.34, 0.52, 0.025, shadow);
  p.box(-0.23, -0.11, roof + 0.085, 0.3, 0.27, 0.11, wall);
  p.box(-0.23, -0.11, roof + 0.195, 0.33, 0.29, 0.025, accent);
  for (const x of [0.05, 0.42]) p.box(x, -0.2, roof + 0.085, 0.085, 0.1, 0.084, limestone);
  // A geometric ceramic mural on the blind end wall.
  p.box(0.678, -0.12, 0.3, 0.018, 0.22, roof - 0.36, accent);
  for (let i = 0; i < floors - 1; i++) {
    p.box(0.691, -0.16 + (i % 2) * 0.075, 0.38 + i * 0.18, 0.014, 0.092, 0.105, white);
  }
  p.box(0, 0.25, 0.106, 0.2, 0.23, 0.19, glass);
  p.box(0, 0.25, 0.296, 0.28, 0.27, 0.034, accent);
  for (const x of [-0.53, 0.53]) {
    p.box(x, 0.37, 0.105, 0.26, 0.14, 0.055, concrete);
    p.cylinder(x, 0.37, 0.16, 0.17, 0.12, 0.12, '#768954', 8);
  }
}

const designs: Record<BuildingType | CivicProjectKind, (parts: ModelParts, variant: number) => void> = {
  reactor,
  pump,
  distiller,
  water_tank: waterTank,
  thermal_plant: thermalPlant,
  microrayon: housing,
  public_garden: publicGarden,
  district_heating: districtHeating
};

export function buildingQuarterTurns(type: BuildingType | CivicProjectKind, x: number, z: number): number {
  return type === 'microrayon' ? (x + z) % 4 : 0;
}

export class CityModels {
  private static scenes = new WeakMap<Scene, CityModels>();
  private snowy = false;
  private templates = new Map<string, Mesh>();
  private scene: Scene;
  private material: StandardMaterial;
  readonly apartmentMaterial: CustomMaterial;
  private dusk = 0;

  static forScene(scene: Scene) {
    let library = this.scenes.get(scene);
    if (!library) {
      library = new CityModels(scene);
      this.scenes.set(scene, library);
    }
    return library;
  }

  private constructor(scene: Scene) {
    this.scene = scene;
    this.material = new StandardMaterial('city-painted-concrete', scene);
    this.material.specularColor.set(0.035, 0.035, 0.03);
    const apartments = new CustomMaterial('apartments and kitchen windows', scene);
    this.apartmentMaterial = apartments;
    apartments.specularColor.copyFrom(this.material.specularColor);
    apartments.AddUniform('dusk', 'float', null)
      .AddAttribute('uv')
      .Vertex_Definitions(`
        #ifndef UV1
        attribute vec2 uv;
        #endif
        varying vec3 kitchen;
      `)
      .Fragment_Definitions('varying vec3 kitchen;')
      .Vertex_After_WorldPosComputed(`
        kitchen = vec3(0.0);
        #if defined(VERTEXCOLOR) && defined(NORMAL)
        if (color.a < 0.99 && abs(normal.z) > 0.9) {
          float household = color.a * 64.0 + dot(finalWorld[3].xz, vec2(2.71, 1.39)) + normal.z * 13.9;
          // Thresholds past full dusk leave some households dark.
          float switchOn = 0.14 + 1.44 * fract(sin(household * 1.77) * 4027.3);
          kitchen = vec3(smoothstep(switchOn, switchOn + 0.024, dusk), fract(household * 0.381), uv.x);
        }
        #endif
      `)
      .Fragment_Before_Fog(`
        vec3 lamplight = mix(vec3(1.0, 0.64, 0.28), vec3(1.0, 0.87, 0.59), kitchen.y);
        lamplight *= mix(0.43, 1.0, smoothstep(0.014, 0.06, abs(kitchen.z - 0.35)));
        color.rgb = mix(color.rgb, lamplight, kitchen.x);
      `);
    apartments.onBindObservable.add(() => apartments.getEffect()?.setFloat('dusk', this.dusk));
  }

  setDusk(amount: number) {
    this.dusk = amount;
  }

  setSnowy(snowy: boolean) {
    if (snowy === this.snowy) return;
    this.snowy = snowy;
    for (const template of this.templates.values()) snowOnRoofs(template, snowy);
  }

  private getTemplate(type: BuildingType | CivicProjectKind, variant: number): Mesh {
    const style = type === 'microrayon' ? Math.abs(Math.floor(variant)) % 3 : 0;
    const key = type + style;
    let template = this.templates.get(key);
    if (!template) {
      const parts = new ModelParts();
      designs[type](parts, style);
      template = parts.finish('prototype-' + key, this.scene);
      template.material = type === 'microrayon' ? this.apartmentMaterial : this.material;
      snowOnRoofs(template, this.snowy);
      template.setEnabled(false);
      this.templates.set(key, template);
    }
    return template;
  }

  overlapsLot(bounds: BoundingBox, type: BuildingType | CivicProjectKind, x: number, z: number): boolean {
    // All foundations are centred on their lot, including while a new building animates into place.
    const half = this.getTemplate(type, x * 5 + z).getBoundingInfo().boundingBox.extendSize;
    const sideways = buildingQuarterTurns(type, x, z) % 2 === 1;
    const halfWidth = sideways ? half.z : half.x;
    const halfDepth = sideways ? half.x : half.z;
    return (
      Math.abs(x + 0.5 - bounds.centerWorld.x) < halfWidth + bounds.extendSizeWorld.x &&
      Math.abs(z + 0.5 - bounds.centerWorld.z) < halfDepth + bounds.extendSizeWorld.z
    );
  }

  create(type: BuildingType | CivicProjectKind, name: string, variant = 0): Mesh {
    const mesh = this.getTemplate(type, variant).clone(name, null, true);
    mesh.setEnabled(true);
    mesh.receiveShadows = true;
    return mesh;
  }
}
