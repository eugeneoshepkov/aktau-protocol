import {
  Color3,
  Matrix,
  Mesh,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData
} from '@babylonjs/core';
import { SEA_Y } from '../../grid/TileTypes';
import { ModelParts } from '../../models/CityModels';

export class CaspianSeal {
  readonly root: Mesh;
  private readonly ripple: Mesh;
  private readonly rippleMaterial: StandardMaterial;
  private readonly coat: StandardMaterial;
  private readonly origin: { x: number; z: number };
  private readonly canSwim: (x: number, z: number) => boolean;
  private time = 0;
  private nextBreath = 5 + Math.random() * 7;
  private heading = 0;
  private startX = 0;
  private startZ = 0;

  constructor(
    scene: Scene,
    origin: { x: number; z: number },
    canSwim: (x: number, z: number) => boolean
  ) {
    this.origin = origin;
    this.canSwim = canSwim;
    const seal = new ModelParts();
    const oval = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      tint: string,
      yaw = 0,
      subdivisions = 2
    ) => {
      const shape = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions, flat: true });
      shape.transform(Matrix.Scaling(w, h, d));
      return seal.add(shape, x, y, z, tint, Quaternion.RotationAxis(Vector3.Up(), yaw));
    };
    const back = oval(0, 0, -0.07, 0.34, 0.29, 0.76, '#889695', 0, 4);
    const positions = back.positions!;
    const spotted = Color3.FromHexString('#667879');
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i],
        y = positions[i + 1],
        z = positions[i + 2];
      if (y > 0.04 && Math.sin(61 * z + 34 * x) * Math.cos(48 * x - 17 * z) > 0.45) {
        spotted.toArray(back.colors!, (i / 3) * 4);
      }
    }
    oval(0, 0.055, 0.27, 0.245, 0.235, 0.3, '#a2aaa6');
    for (const side of [-1, 1]) {
      oval(side * 0.056, 0.04, 0.395, 0.128, 0.115, 0.113, '#d3c9ad');
      oval(side * 0.088, 0.108, 0.341, 0.046, 0.05, 0.044, '#232f33');
      oval(side * 0.18, -0.038, -0.016, 0.097, 0.047, 0.285, '#697878', -side * 0.56);
      oval(side * 0.067, -0.035, -0.433, 0.096, 0.065, 0.25, '#687478', -side * 0.3);
    }
    oval(0, 0.078, 0.433, 0.08, 0.041, 0.043, '#344246');
    this.root = seal.finish('Caspian seal', scene);
    this.coat = new StandardMaterial('Seal coat', scene);
    this.coat.specularColor = new Color3(0.075, 0.09, 0.09);
    this.root.material = this.coat;
    this.root.position.set(origin.x, SEA_Y - 0.5, origin.z);
    this.root.isPickable = false;
    this.root.setEnabled(false);

    const ring = VertexData.CreateTorus({ diameter: 0.65, thickness: 0.016, tessellation: 28 });
    this.ripple = new Mesh('Seal surface ripple', scene);
    ring.applyToMesh(this.ripple);
    this.rippleMaterial = new StandardMaterial('Seal wake', scene);
    this.rippleMaterial.diffuseColor = Color3.FromHexString('#c6e0d6');
    this.rippleMaterial.specularColor = Color3.Black();
    this.ripple.material = this.rippleMaterial;
    this.ripple.isPickable = false;
    this.ripple.setEnabled(false);
  }

  // Each breath describes a short arc. Pick it while submerged so surfacing never jumps between sites.
  private beginBreath(): boolean {
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = this.origin.x + (Math.random() - 0.5) * 4;
      const z = this.origin.z + (Math.random() - 0.5) * 2;
      const yaw = Math.random() * Math.PI * 2;
      if (
        ![0, 0.5, 1, 1.5, 2].every((d) =>
          this.canSwim(x + Math.sin(yaw) * d, z + Math.cos(yaw) * d)
        )
      )
        continue;
      this.startX = x;
      this.startZ = z;
      this.heading = yaw;
      this.time = 0;
      this.root.setEnabled(true);
      return true;
    }
    return false;
  }

  update(dt: number) {
    if (!this.root.isEnabled()) {
      this.nextBreath -= dt;
      if (this.nextBreath > 0) return;
      this.nextBreath = 4;
      if (!this.beginBreath()) return;
    }
    this.time += dt;
    const t = this.time;
    const forward = t * 0.235;
    const across = 0.13 * Math.sin(0.65 * t);
    const x = this.startX + forward * Math.sin(this.heading) + across * Math.cos(this.heading);
    const z = this.startZ + forward * Math.cos(this.heading) - across * Math.sin(this.heading);
    if (t > 8 || !this.canSwim(x, z)) {
      this.root.setEnabled(false);
      this.ripple.setEnabled(false);
      this.nextBreath = 20 + Math.random() * 22;
      return;
    }
    const atSurface = Math.min(t / 1.5, 1, (8 - t) / 2);
    const lift = atSurface * atSurface * (3 - 2 * atSurface);
    this.root.position.set(x, SEA_Y - 0.42 + 0.395 * lift + 0.014 * Math.sin(3 * t), z);
    this.root.rotation.set(
      t < 2 ? -0.28 * (1 - t / 2) : 0.49 * Math.max(0, (t - 5.6) / 2.4),
      this.heading + Math.atan2(0.085 * Math.cos(0.65 * t), 0.235),
      0.04 * Math.sin(2.8 * t)
    );

    // One widening ring where the head breaks the surface, another where the back slips under.
    const ringTime = t < 5.8 ? t - 0.85 : t - 5.8;
    const visible = ringTime > 0 && ringTime < 2.15;
    if (visible && !this.ripple.isEnabled()) this.ripple.position.set(x, SEA_Y + 0.009, z);
    this.ripple.setEnabled(visible);
    if (visible) {
      const radius = 0.38 + 0.73 * ringTime;
      this.ripple.scaling.set(radius, 0.28, radius);
      this.rippleMaterial.alpha = 0.48 * Math.sin((Math.PI * ringTime) / 2.15);
    }
  }

  dispose() {
    this.root.dispose();
    this.coat.dispose();
    this.ripple.dispose();
    this.rippleMaterial.dispose();
  }
}
