import {
  BoundingInfo,
  Color3,
  Mesh,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { LAND_Y } from '../../grid/TileTypes';

const rings = 25,
  sides = 8,
  spacing = 0.039;
const length = (rings - 1) * spacing;
const crossSection = Array.from({ length: sides }, (_, i) => {
  const angle = (i * 2 * Math.PI) / sides;
  return { side: Math.cos(angle), up: Math.sin(angle) };
});

export class SteppeSnake {
  readonly root: Mesh;
  private readonly scales: StandardMaterial;
  private readonly origin: { x: number; z: number };
  private readonly canSlither: (x: number, z: number) => boolean;
  private readonly head = Vector3.Zero();
  private readonly trail = Array.from({ length: rings }, () => Vector3.Zero());
  private readonly centers = Array.from({ length: rings }, () => Vector3.Zero());
  private readonly positions = new Float32Array(rings * sides * 3);
  private readonly normals = new Float32Array(rings * sides * 3);
  private sampleDistance = 0;
  private phase = 0;
  private yaw = 0;
  private targetX = 0;
  private targetZ = 0;
  private wait = 0;

  constructor(
    scene: Scene,
    origin: { x: number; z: number },
    canSlither: (x: number, z: number) => boolean
  ) {
    this.origin = origin;
    this.canSlither = canSlither;
    const indices: number[] = [],
      colors: number[] = [];
    const skin = Color3.FromHexString('#a58053'),
      belly = Color3.FromHexString('#d8b987');
    const saddle = Color3.FromHexString('#604c3f'),
      eyes = Color3.FromHexString('#302c24');
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < sides; j++) {
        const dorsal = j >= 1 && j <= 3;
        const blotch = (i + Math.abs(j - 2)) % 5 <= 1;
        const eye = i === 1 && (j === 1 || j === 3);
        const tint = eye ? eyes : dorsal && blotch ? saddle : j > 4 ? belly : skin;
        colors.push(tint.r, tint.g, tint.b, 1);
        const a = i * sides + j,
          b = i * sides + ((j + 1) % sides);
        if (i < rings - 1) indices.push(a, b, b + sides, a, b + sides, a + sides);
      }
    }
    this.root = new Mesh('Steppe snake', scene);
    this.root.isPickable = false;
    this.scales = new StandardMaterial('Steppe snake scales', scene);
    this.scales.specularColor = new Color3(0.05, 0.045, 0.035);
    this.root.material = this.scales;
    const data = Object.assign(new VertexData(), {
      indices,
      positions: this.positions,
      normals: this.normals,
      colors
    });
    data.applyToMesh(this.root, true);
    this.root.setBoundingInfo(
      new BoundingInfo(new Vector3(-length, 0, -length), new Vector3(length, 0.12, length))
    );
    this.lieDown();
  }

  private lieDown() {
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = this.origin.x + (attempt < 4 ? 0 : (Math.random() - 0.5) * 4);
      const z = this.origin.z + (attempt < 4 ? 0 : (Math.random() - 0.5) * 4);
      this.yaw = Math.random() * Math.PI * 2;
      const dx = Math.sin(this.yaw),
        dz = Math.cos(this.yaw);
      for (let i = 0; i < rings; i++) {
        const d = i * spacing,
          bend = 0.09 * Math.sin(d * 9);
        this.trail[i].set(x - d * dx + bend * dz, 0, z - d * dz - bend * dx);
      }
      if (!this.trail.every((point) => this.canSlither(point.x, point.z))) continue;
      this.head.copyFrom(this.trail[0]);
      this.sampleDistance = 0;
      this.phase = 0;
      this.root.setEnabled(true);
      this.chooseDestination();
      this.pose();
      return;
    }
    this.root.setEnabled(false);
    this.wait = 3;
  }

  private chooseDestination() {
    this.targetX = this.origin.x + (Math.random() - 0.5) * 5;
    this.targetZ = this.origin.z + (Math.random() - 0.5) * 5;
    if (!this.canSlither(this.targetX, this.targetZ)) {
      this.targetX = this.origin.x;
      this.targetZ = this.origin.z;
    }
  }

  update(dt: number) {
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    if (
      !this.root.isEnabled() ||
      !this.canSlither(this.head.x, this.head.z) ||
      !this.canSlither(this.trail[rings - 1].x, this.trail[rings - 1].z)
    ) {
      this.lieDown();
      return;
    }
    const dx = this.targetX - this.head.x,
      dz = this.targetZ - this.head.z;
    if (Math.hypot(dx, dz) < 0.28) {
      this.chooseDestination();
      this.wait = 0.7 + Math.random() * 2.8;
      return;
    }
    // Keep enough head samples to let each bend travel all the way to the tapered tail.
    const travel = Math.min(dt, 0.12) * 0.39;
    const turn = Math.atan2(dx, dz) - this.yaw;
    this.yaw += Math.max(-dt * 2, Math.min(dt * 2, Math.atan2(Math.sin(turn), Math.cos(turn))));
    const heading = this.yaw + 0.84 * Math.sin(this.phase);
    const stepX = Math.sin(heading),
      stepZ = Math.cos(heading);
    if (
      !this.canSlither(this.head.x + stepX * (travel + 0.07), this.head.z + stepZ * (travel + 0.07))
    ) {
      // Curl away from new construction and the edge of the sand while the tail follows its own track.
      for (const angle of [0.8, -0.8, 1.6, -1.6, Math.PI]) {
        const yaw = heading + angle;
        const x = this.head.x + 0.32 * Math.sin(yaw),
          z = this.head.z + 0.32 * Math.cos(yaw);
        if (this.canSlither(x, z)) {
          this.yaw = yaw;
          this.targetX = x;
          this.targetZ = z;
          break;
        }
      }
      return;
    }
    for (let d = spacing - this.sampleDistance; d <= travel; d += spacing) {
      const sample = this.trail.pop()!;
      sample.set(this.head.x + stepX * d, 0, this.head.z + stepZ * d);
      this.trail.unshift(sample);
    }
    this.sampleDistance = (this.sampleDistance + travel) % spacing;
    this.head.x += stepX * travel;
    this.head.z += stepZ * travel;
    this.phase += travel * 9.5;
    this.pose();
  }

  private pose() {
    this.centers[0].copyFrom(this.head);
    const fraction = this.sampleDistance / spacing;
    for (let i = 1; i < rings; i++) {
      Vector3.LerpToRef(this.trail[i], this.trail[i - 1], fraction, this.centers[i]);
    }
    const middle = this.centers[Math.floor(rings / 2)];
    this.root.position.set(middle.x, LAND_Y + 0.004, middle.z);
    for (let i = 0; i < rings; i++) {
      const front = this.centers[Math.max(0, i - 1)],
        back = this.centers[Math.min(i + 1, rings - 1)];
      const dx = front.x - back.x,
        dz = front.z - back.z;
      const distance = Math.hypot(dx, dz) || 1;
      const radius =
        i === 0
          ? 0.012
          : i < 3
            ? 0.055
            : i < 5
              ? 0.033
              : 0.041 * Math.min(1, (rings - i - 0.8) / 9);
      const lift = i < 5 ? 0.012 * (1 - i / 5) : 0;
      for (let j = 0; j < sides; j++) {
        const { side, up: ny } = crossSection[j];
        const nx = (side * dz) / distance,
          nz = (-side * dx) / distance;
        const at = (i * sides + j) * 3;
        this.positions[at] = this.centers[i].x - middle.x + radius * nx;
        this.positions[at + 1] = lift + radius * 0.68 * (1 + ny);
        this.positions[at + 2] = this.centers[i].z - middle.z + radius * nz;
        this.normals[at] = nx;
        this.normals[at + 1] = ny;
        this.normals[at + 2] = nz;
      }
    }
    this.root.updateVerticesData(VertexBuffer.PositionKind, this.positions);
    this.root.updateVerticesData(VertexBuffer.NormalKind, this.normals);
  }

  dispose() {
    this.root.dispose();
    this.scales.dispose();
  }
}
