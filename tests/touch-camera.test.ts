import { expect, test } from 'bun:test';
import { ArcRotateCamera, NullEngine, NullEngineOptions, Plane, Scene, Vector3 } from '@babylonjs/core';
import { MapPointers } from '../src/engine/Camera';

test('drag and pinch keep the ground under the fingers while a twist turns the city', () => {
  const engine = new NullEngine({ ...new NullEngineOptions(), renderWidth: 390, renderHeight: 844 });
  try {
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera('city', 2.3, 0.91, 23, new Vector3(40, 0, 12), scene);
    const input = new MapPointers();
    input.camera = camera;
    const ground = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());
    const groundAt = (x: number, y: number) => {
      const ray = scene.createPickingRay(x, y, null, camera);
      return ray.origin.add(ray.direction.scale(ray.intersectsPlane(ground)!));
    };
    const touch = (x: number, y: number, pointerId = 1) => ({ x, y, pointerId, type: 'touch' });
    const before = groundAt(128, 385);
    input.onTouch(touch(216, 415), 88, 30);
    expect(Vector3.Distance(before, groundAt(216, 415))).toBeLessThan(0.001);
    expect(camera.inertialPanningX).toBe(0);

    const center = touch(170, 400);
    const anchor = groundAt(center.x, center.y);
    const turnStart = camera.alpha;
    input.onMultiTouch(touch(120, 400), touch(220, 400, 2), 0, 100 ** 2, null, center);
    const nextCenter = touch(180, 410);
    input.onMultiTouch(touch(180, 310), touch(180, 510, 2), 100 ** 2, 200 ** 2, center, nextCenter);
    expect(camera.radius).toBeCloseTo(11.5);
    expect(camera.alpha - turnStart).toBeCloseTo(Math.PI / 2);
    expect(Vector3.Distance(anchor, groundAt(nextCenter.x, nextCenter.y))).toBeLessThan(0.001);
  } finally {
    engine.dispose();
  }
});
