import {
  Mesh,
  Scene,
  ShaderMaterial,
  VertexData,
  type Observer,
  type Vector3
} from '@babylonjs/core';
import { RESOURCE_FLOWS, type ResourceType } from '../config/ResourceFlow';
import { getTileCenter } from '../grid/GridCoords';
import { LAND_Y, SEA_Y } from '../grid/TileTypes';
import { heatLaneOffset, type PlacementFlowSummary } from '../managers/PipeManager';
import type { Building } from '../types';
import { PlacementCaption } from '../ui/PlacementCaption';

const vertexSource = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  attribute vec2 uv2;
  uniform mat4 worldViewProjection;
  varying vec2 ink;
  varying vec2 paint;
  void main() {
    ink = uv;
    paint = uv2;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }`;

const fragmentSource = `
  precision highp float;
  varying vec2 ink;
  varying vec2 paint;
  uniform float age;
  uniform float speed;
  uniform float settleEnd;
  uniform float stationary;
  void main() {
    float t = stationary > 0.5 ? 3.0 : age;
    float style = floor(abs(paint.x) + 0.5);
    vec3 color;
    float alpha;
    if (style < 2.5) {
      // Ink.x measures distance travelled from the provider, including earlier relay hops.
      vec3 dye = style < 0.5 ? vec3(0.03, 0.53, 0.85)
               : style < 1.5 ? vec3(0.94, 0.32, 0.10) : vec3(0.03, 0.58, 0.52);
      vec3 light = style < 0.5 ? vec3(0.79, 0.97, 1.0)
                 : style < 1.5 ? vec3(1.0, 0.86, 0.54) : vec3(0.61, 1.0, 0.85);
      float side = abs(ink.y);
      float head = (t - 0.1) * speed;
      float fill = 1.0 - smoothstep(head - 0.16, head + 0.04, ink.x);
      float leading = 1.0 - smoothstep(0.04, 0.45, abs(ink.x - head));
      float chevrons = abs(fract(ink.x / 0.83 - t * 1.65 + 0.28 * side) - 0.5);
      float arrow = 1.0 - smoothstep(0.07, 0.17, chevrons);
      float rail = 1.0 - smoothstep(0.38, 0.59, side);
      float mark = max(rail, max(arrow, leading) * (1.0 - smoothstep(0.72, 0.98, side)));
      color = mix(dye * 0.56, dye, rail);
      color = mix(color, light, max(leading, arrow));
      alpha = mark * fill * (1.0 - smoothstep(settleEnd - 0.74, settleEnd - 0.1, age));
    } else {
      // The new lot has its own status rim. Restored lots echo the resource that arrived.
      bool incomplete = style == 4.0 || paint.x < 0.0;
      float start = paint.y;
      float arrived = smoothstep(start, start + 0.32, t);
      float r = length(ink);
      float radius = mix(0.66, 0.88, smoothstep(start, start + 0.68, t));
      float d = abs(r - radius);
      float edge = 1.0 - smoothstep(0.035, 0.060, d);
      float core = 1.0 - smoothstep(0.012, 0.029, d);
      float angle = atan(ink.y, ink.x) / 6.2831853;
      float gap = abs(fract(angle * 3.0 + 0.5) - 0.5);
      float cut = incomplete ? smoothstep(0.075, 0.095, gap) : 1.0;
      vec3 rim = style == 4.0 ? vec3(1.0, 0.73, 0.32)
               : style == 5.0 ? vec3(0.86, 0.81, 0.65)
               : style == 6.0 ? vec3(0.61, 0.93, 1.0)
               : style == 7.0 ? vec3(1.0, 0.72, 0.42)
               : style == 8.0 ? vec3(0.45, 0.97, 0.81) : vec3(0.80, 0.98, 0.83);
      color = mix(rim * vec3(0.35, 0.50, 0.48), rim, core);
      float fadeAt = style == 4.0 ? 3.6 : settleEnd;
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
    const { routes, missing, restored } = summary;
    const positions: number[] = [],
      uvs: number[] = [],
      uv2s: number[] = [],
      indices: number[] = [];
    const quad = (style: number, start = 0) => {
      const i = uv2s.length / 2;
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
      for (let n = 0; n < 4; n++) uv2s.push(style, start);
    };

    const tileKey = (p: Vector3) => `${p.x},${p.z}`;
    const arrivals = new Map<
      string,
      { type: Building['type']; feeds: Partial<Record<ResourceType, number>> }
    >();
    for (const lot of [building, ...restored.map((r) => r.building)]) {
      arrivals.set(tileKey(getTileCenter(lot.gridX, lot.gridZ)), { type: lot.type, feeds: {} });
    }

    const segments = new Map<
      string,
      { a: Vector3; b: Vector3; style: number; distance: number; length: number }
    >();
    const pipeStyle = { freshWater: 0, heat: 1, seawater: 2 };
    let longest = 0;
    // Schedule in supply order: a newly operational distiller can only send fresh water
    // once its last incoming feed reaches it. Distances on a relay path are cumulative.
    for (const { resource } of RESOURCE_FLOWS) {
      for (const route of routes) {
        if (route.resource !== resource || route.points.length < 2) continue;
        const { points } = route;
        const source = arrivals.get(tileKey(points[0]));
        let distance =
          resource === 'freshWater' && source?.type === 'distiller'
            ? Math.max(source.feeds.heat ?? 0, source.feeds.seawater ?? 0)
            : 0;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1],
            b = points[i];
          const length = Math.hypot(b.x - a.x, b.z - a.z);
          if (!length) continue;
          const edge = `${resource}:${tileKey(a)}:${tileKey(b)}`;
          const earlier = segments.get(edge);
          if (!earlier || distance < earlier.distance) {
            segments.set(edge, { a, b, style: pipeStyle[resource], distance, length });
          }
          distance += length;
          const target = arrivals.get(tileKey(b))?.feeds;
          if (target) target[resource] = Math.min(target[resource] ?? Infinity, distance);
        }
        longest = Math.max(longest, distance);
      }
    }

    const speed = Math.max(longest, 1) / (restored.length ? 1.65 : 1);
    for (const { a, b, style, distance, length } of segments.values()) {
      // Lift the ribbon just above the optional pipe overlay. Buildings still occlude it.
      const nx = (-0.14 * (b.z - a.z)) / length,
        nz = (0.14 * (b.x - a.x)) / length;
      const lane = style === pipeStyle.heat ? heatLaneOffset(a, b) : { x: 0, z: 0 };
      const vertex = (p: Vector3, side: number) =>
        positions.push(p.x + lane.x + side * nx, p.y + 0.052, p.z + lane.z + side * nz);
      vertex(a, -1);
      vertex(a, 1);
      vertex(b, 1);
      vertex(b, -1);
      const end = distance + length;
      uvs.push(distance, -1, distance, 1, end, 1, end, -1);
      quad(style);
    }

    const ring = (lot: Building, style: number, resources?: ResourceType[]) => {
      const center = getTileCenter(lot.gridX, lot.gridZ);
      const { feeds } = arrivals.get(tileKey(center))!;
      const distances = resources ? resources.map((r) => feeds[r] ?? 0) : Object.values(feeds);
      const arrival = Math.max(0, ...distances);
      const model = this.scene.getMeshByName('building_' + lot.id);
      const half = model?.getBoundingInfo().boundingBox.extendSize;
      const extent = ((half ? Math.hypot(half.x, half.z) : 0.8) + 0.17) / 0.88;
      const y = (lot.type === 'pump' ? SEA_Y : LAND_Y) + 0.058;
      for (const [u, v] of [
        [-1, -1],
        [-1, 1],
        [1, 1],
        [1, -1]
      ]) {
        positions.push(center.x + u * extent, y, center.z + v * extent);
        uvs.push(u, v);
      }
      const start = style === 4 || style === 5 ? 0.1 : arrival ? 0.1 + arrival / speed : 0.4;
      quad(style, start);
    };
    ring(building, missing.length ? 4 : routes.length ? 3 : 5);
    for (const lot of restored) {
      const style = lot.resources.length === 1 ? 6 + pipeStyle[lot.resources[0]] : 9;
      ring(lot.building, lot.missing.length ? -style : style, lot.resources);
    }

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
        uniforms: ['worldViewProjection', 'age', 'speed', 'settleEnd', 'stationary'],
        needAlphaBlending: true
      }
    );
    ink.backFaceCulling = false;
    const settleEnd = restored.length ? 3.25 : 2.6;
    ink.setFloat('speed', speed);
    ink.setFloat('settleEnd', settleEnd);
    ink.setFloat(
      'stationary',
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 0
    );
    ink.setFloat('age', 0);
    mesh.material = ink;
    if (missing.length) this.caption = new PlacementCaption(this.scene, building, missing);
    this.caption?.update();
    const start = performance.now();
    const duration = missing.length ? 3.6 : settleEnd;
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
