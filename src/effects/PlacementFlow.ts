import {
  Mesh,
  Scene,
  ShaderMaterial,
  VertexData,
  type Observer,
  type Vector3
} from '@babylonjs/core';
import { getTileCenter } from '../grid/GridCoords';
import { LAND_Y, SEA_Y } from '../grid/TileTypes';
import type { PlacementFlowSummary } from '../managers/PipeManager';
import type { Building } from '../types';
import { PlacementCaption } from '../ui/PlacementCaption';

const vertexSource = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  attribute vec2 uv2;
  uniform mat4 worldViewProjection;
  varying vec2 ink;
  varying float style;
  void main() {
    ink = uv;
    style = uv2.x;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }`;

const fragmentSource = `
  precision highp float;
  varying vec2 ink;
  varying float style;
  uniform float age;
  uniform float longest;
  uniform float arrivalTime;
  uniform float stationary;
  void main() {
    float t = stationary > 0.5 ? 1.5 : age;
    vec3 color;
    float alpha;
    if (style < 2.5) {
      // Ink.x measures distance travelled from the provider, including earlier relay hops.
      vec3 dye = style < 0.5 ? vec3(0.03, 0.53, 0.85)
               : style < 1.5 ? vec3(0.94, 0.32, 0.10) : vec3(0.03, 0.58, 0.52);
      vec3 light = style < 0.5 ? vec3(0.79, 0.97, 1.0)
                 : style < 1.5 ? vec3(1.0, 0.86, 0.54) : vec3(0.61, 1.0, 0.85);
      float side = abs(ink.y);
      float head = (t - 0.1) * longest;
      float fill = 1.0 - smoothstep(head - 0.16, head + 0.04, ink.x);
      float leading = 1.0 - smoothstep(0.04, 0.45, abs(ink.x - head));
      float chevrons = abs(fract(ink.x / 0.83 - t * 1.65 + 0.28 * side) - 0.5);
      float arrow = 1.0 - smoothstep(0.07, 0.17, chevrons);
      float rail = 1.0 - smoothstep(0.38, 0.59, side);
      float mark = max(rail, max(arrow, leading) * (1.0 - smoothstep(0.72, 0.98, side)));
      color = mix(dye * 0.56, dye, rail);
      color = mix(color, light, max(leading, arrow));
      alpha = mark * fill * (1.0 - smoothstep(1.86, 2.5, age));
    } else {
      // A complete collar seals the connection. Open amber arcs mark an unfinished hook-up.
      bool incomplete = style > 3.5 && style < 4.5;
      bool idle = style > 4.5;
      float start = (incomplete || idle) ? 0.1 : arrivalTime;
      float arrived = smoothstep(start, start + 0.32, t);
      float r = length(ink);
      float radius = mix(0.66, 0.88, smoothstep(start, start + 0.68, t));
      float d = abs(r - radius);
      float edge = 1.0 - smoothstep(0.035, 0.060, d);
      float core = 1.0 - smoothstep(0.012, 0.029, d);
      float angle = atan(ink.y, ink.x) / 6.2831853;
      float gap = abs(fract(angle * 3.0 + 0.5) - 0.5);
      float cut = incomplete ? smoothstep(0.075, 0.095, gap) : 1.0;
      vec3 rim = incomplete ? vec3(1.0, 0.73, 0.32)
               : idle ? vec3(0.86, 0.81, 0.65) : vec3(0.80, 0.98, 0.83);
      color = mix(incomplete ? vec3(0.53, 0.30, 0.13) : vec3(0.18, 0.48, 0.43), rim, core);
      float fadeAt = incomplete ? 3.6 : 2.6;
      alpha = cut * edge * arrived * (1.0 - smoothstep(fadeAt - 0.65, fadeAt, age));
    }
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(color, alpha);
  }`;

export class PlacementFlow {
  private readonly scene: Scene;
  private mesh?: Mesh;
  private caption?: PlacementCaption;
  private observer?: Observer<Scene>;

  constructor(scene: Scene) {
    this.scene = scene;
    scene.onDisposeObservable.addOnce(() => this.clear());
  }

  play(building: Building, summary: PlacementFlowSummary): void {
    this.clear();
    const { routes, missing } = summary;
    const center = getTileCenter(building.gridX, building.gridZ);
    const atBuilding = (point: Vector3) => point.x === center.x && point.z === center.z;
    let arrival = 0;
    // A newly supplied distiller or tank sends its first pulse after the arriving supplies.
    for (const { points } of routes) {
      let prefix = 0;
      for (let i = 1; i < points.length; i++) {
        prefix += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
        if (atBuilding(points[i])) arrival = Math.max(arrival, prefix);
      }
    }
    const positions: number[] = [],
      uvs: number[] = [],
      uv2s: number[] = [],
      indices: number[] = [];
    const quad = (style: number) => {
      const i = uv2s.length / 2;
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
      for (let n = 0; n < 4; n++) uv2s.push(style, 0);
    };
    let longest = 0;
    const drawn = new Set<string>();
    for (const { resource, points } of routes) {
      let distance = 0;
      const style = resource === 'freshWater' ? 0 : resource === 'heat' ? 1 : 2;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        if (atBuilding(a)) distance = Math.max(distance, arrival);
        const dx = b.x - a.x,
          dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        if (length === 0) continue;
        const end = distance + length;
        const key = [resource, a.x, a.z, b.x, b.z].join(':');
        if (!drawn.has(key)) {
          drawn.add(key);
          // Lift the ribbon just above the optional pipe overlay. Buildings still occlude it.
          const nx = (-0.14 * dz) / length,
            nz = (0.14 * dx) / length;
          const vertex = (p: Vector3, side: number) =>
            positions.push(p.x + side * nx, p.y + 0.052, p.z + side * nz);
          vertex(a, -1);
          vertex(a, 1);
          vertex(b, 1);
          vertex(b, -1);
          uvs.push(distance, -1, distance, 1, end, 1, end, -1);
          quad(style);
        }
        distance = end;
      }
      longest = Math.max(longest, distance);
    }

    const model = this.scene.getMeshByName('building_' + building.id);
    const half = model?.getBoundingInfo().boundingBox.extendSize;
    const extent = ((half ? Math.hypot(half.x, half.z) : 0.8) + 0.17) / 0.88;
    const y = (building.type === 'pump' ? SEA_Y : LAND_Y) + 0.058;
    for (const [u, v] of [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1]
    ]) {
      positions.push(center.x + u * extent, y, center.z + v * extent);
      uvs.push(u, v);
    }
    quad(missing.length ? 4 : routes.length ? 3 : 5);

    const mesh = new Mesh('placement flow', this.scene);
    const data = new VertexData();
    Object.assign(data, { positions, uvs, uvs2: uv2s, indices });
    data.applyToMesh(mesh);
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    this.mesh = mesh;
    const ink = new ShaderMaterial(
      'placement flow ink',
      this.scene,
      { vertexSource, fragmentSource },
      {
        attributes: ['position', 'uv', 'uv2'],
        uniforms: ['worldViewProjection', 'age', 'longest', 'arrivalTime', 'stationary'],
        needAlphaBlending: true
      }
    );
    ink.backFaceCulling = false;
    ink.setFloat('longest', Math.max(longest, 1));
    ink.setFloat('arrivalTime', arrival > 0 ? 0.1 + arrival / longest : 0.4);
    ink.setFloat(
      'stationary',
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 0
    );
    ink.setFloat('age', 0);
    mesh.material = ink;
    if (missing.length) this.caption = new PlacementCaption(this.scene, building, missing);
    this.caption?.update();
    const start = performance.now();
    const duration = missing.length ? 3.6 : 2.6;
    this.observer = this.scene.onBeforeRenderObservable.add(() => {
      const age = (performance.now() - start) / 1000;
      if (age >= duration) this.clear();
      else {
        ink.setFloat('age', age);
        this.caption?.update();
      }
    });
  }

  clear(): void {
    this.observer?.remove();
    this.observer = undefined;
    this.mesh?.dispose(false, true);
    this.mesh = undefined;
    this.caption?.dispose();
    this.caption = undefined;
  }
}
