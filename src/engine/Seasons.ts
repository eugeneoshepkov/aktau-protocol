import { Color3, Mesh, VertexBuffer } from '@babylonjs/core';
import type { Season } from '../simulation/GameState';

export const seasonalLight = {
  spring: { sky: '#aacbc1', sun: '#ffeac7', elevation: 1.0, intensity: 0.52 },
  summer: { sky: '#bed3cb', sun: '#ffe1a6', elevation: 1.32, intensity: 0.61 },
  autumn: { sky: '#d0c5ac', sun: '#ffd096', elevation: 0.79, intensity: 0.51 },
  winter: { sky: '#b7c7d2', sun: '#e2edff', elevation: 0.73, intensity: 0.43 }
} satisfies Record<Season, object>;

export const seasonalCoast = {
  spring: { deep: '#205e72', shallows: '#76b7ac', sand: '#d8ccaa', leaf: '#7e9b60', wind: 0.85 },
  summer: { deep: '#176a81', shallows: '#6cbfb4', sand: '#dfbd89', leaf: '#5f8257', wind: 0.56 },
  autumn: { deep: '#416e71', shallows: '#86aaa0', sand: '#c7b293', leaf: '#cea447', wind: 1.48 },
  winter: { deep: '#405e79', shallows: '#91b3ba', sand: '#b3b5af', leaf: '#898b80', wind: 1.67 }
} satisfies Record<Season, object>;

// Geometry is shared between blocks of the same design, so recolor the prototype
// only when winter starts/ends. New winter construction uses the same roof treatment.
const originalPaint = new WeakMap<Mesh, Float32Array>();
export function snowOnRoofs(mesh: Mesh, snowy: boolean): void {
  const dry = originalPaint.get(mesh);
  if (!snowy) {
    if (dry) {
      mesh.setVerticesData(VertexBuffer.ColorKind, dry);
      originalPaint.delete(mesh);
    }
    return;
  }
  if (dry) return;
  const colors = mesh.getVerticesData(VertexBuffer.ColorKind);
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!colors || !normals || !positions) return;
  originalPaint.set(mesh, Float32Array.from(colors));
  const winter = Float32Array.from(colors);
  const snow = Color3.FromHexString('#e2eced');
  for (let p = 0, c = 0; p < positions.length; p += 3, c += 4) {
    if (positions[p + 1] < 0.22 || normals[p + 1] < 0.72) continue;
    const drift = 0.72 + 0.17 * Math.sin(positions[p] * 5 - positions[p + 2] * 3);
    winter[c] += (snow.r - winter[c]) * drift;
    winter[c + 1] += (snow.g - winter[c + 1]) * drift;
    winter[c + 2] += (snow.b - winter[c + 2]) * drift;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, winter);
}
