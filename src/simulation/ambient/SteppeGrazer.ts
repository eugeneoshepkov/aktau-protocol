import { type Mesh, type Scene } from '@babylonjs/core';
import { LAND_Y } from '../../grid/TileTypes';
import { createGrazerModel, type GrazerSpecies } from './GrazerModel';

export class SteppeGrazer {
  readonly root: Mesh;
  private readonly model: ReturnType<typeof createGrazerModel>;
  private readonly homeX: number;
  private readonly homeZ: number;
  private readonly canWalk: (x: number, z: number) => boolean;
  private readonly pace: number;
  private readonly stride: number;
  private target: { x: number; z: number } | null = null;
  private rest = Math.random() * 2;
  private speed = 0;
  private cycle = Math.random();
  private time = Math.random() * 16;
  private grazing = 0;

  constructor(
    scene: Scene,
    species: GrazerSpecies,
    x: number,
    z: number,
    canWalk: (x: number, z: number) => boolean
  ) {
    this.model = createGrazerModel(scene, species);
    this.root = this.model.mesh;
    this.root.position.set(x, LAND_Y, z);
    this.root.rotation.y = Math.random() * Math.PI * 2;
    this.root.scaling.setAll((species === 'camel' ? 0.74 : 0.65) * (0.95 + Math.random() * 0.1));
    this.canWalk = canWalk;
    this.homeX = x;
    this.homeZ = z;
    this.pace = (species === 'camel' ? 0.39 : 0.53) * (0.9 + Math.random() * 0.2);
    this.stride = species === 'camel' ? 0.52 : 0.48;
  }

  private findPasture() {
    const position = this.root.position;
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle =
        this.root.rotation.y + (Math.random() - 0.5) * (attempt < 4 ? 1.9 : 2 * Math.PI);
      const distance = 1.4 + Math.random() * 3;
      const dx = Math.sin(angle);
      const dz = Math.cos(angle);
      const x = position.x + distance * dx;
      const z = position.z + distance * dz;
      if (Math.hypot(x - this.homeX, z - this.homeZ) > 4.5 || !this.canWalk(x, z)) continue;
      let clear = true;
      for (let d = 0.3; d < distance; d += 0.3) {
        if (!this.canWalk(position.x + dx * d, position.z + dz * d)) {
          clear = false;
          break;
        }
      }
      if (clear) return { x, z };
    }
    return null;
  }

  public update(deltaSeconds: number) {
    const dt = Math.min(0.1, Math.max(deltaSeconds, 0));
    this.time += dt;
    this.rest -= dt;
    if (!this.target && this.rest <= 0) {
      this.target = this.findPasture();
      this.rest = 1 + Math.random();
    }
    const pos = this.root.position;
    let desiredSpeed = 0;
    if (this.target) {
      const dx = this.target.x - pos.x;
      const dz = this.target.z - pos.z;
      const distance = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz) - this.root.rotation.y;
      const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
      this.root.rotation.y += Math.max(-1.55 * dt, Math.min(1.55 * dt, turn));
      desiredSpeed = Math.min(this.pace, distance * 1.8) * Math.max(0, Math.cos(turn));
      if (distance < 0.15) {
        this.target = null;
        this.rest = 2 + Math.random() * 5;
        desiredSpeed = 0;
      }
    }
    this.speed += (desiredSpeed - this.speed) * Math.min(1, 4 * dt);
    const step = this.speed * dt;
    if (step > 0.00001) {
      const x = pos.x + Math.sin(this.root.rotation.y) * step;
      const z = pos.z + Math.cos(this.root.rotation.y) * step;
      if (this.canWalk(x, z)) {
        pos.x = x;
        pos.z = z;
        this.cycle = (this.cycle + step / (this.stride * this.root.scaling.x)) % 1;
      } else {
        this.target = null;
        this.rest = 0.6;
        this.speed = 0;
      }
    }
    this.animate(dt);
  }

  private animate(dt: number) {
    const { body, neck, tail, legs } = this.model;
    const moving = Math.min(1, this.speed / this.pace);
    const phase = this.cycle * 2 * Math.PI;
    const dip = moving * (0.023 + 0.007 * Math.cos(phase * 2));
    const bodyPosition = body.position;
    bodyPosition.y = -dip;
    body.position = bodyPosition;
    body.setYawPitchRoll(0, 0, Math.sin(phase) * 0.035 * moving);
    this.grazing += ((this.target ? 0 : 1) - this.grazing) * Math.min(1, 1.6 * dt);
    neck.setYawPitchRoll(
      0.11 * Math.sin(this.time * 0.9),
      this.grazing * (1.86 + 0.09 * Math.sin(this.time * 2.2)) +
        0.065 * moving * Math.sin(phase * 2),
      0
    );
    tail.setYawPitchRoll(
      0,
      0.07 * Math.cos(this.time * 1.3),
      (0.12 + 0.17 * Math.max(0, Math.sin(this.time * 0.55))) * Math.sin(this.time * 2.7)
    );

    // During stance the hoof moves back by exactly the distance the animal walks.
    // Two equal bone lengths let both the foreknee and the hock reach the same planted hoof.
    for (const leg of legs) {
      const phase = (this.cycle + leg.offset) % 1;
      const swing = Math.max(0, (phase - 0.6) / 0.4);
      const forward = (phase < 0.6 ? 0.5 - phase / 0.6 : swing - 0.5) * 0.6 * this.stride * moving;
      const lift = 0.067 * Math.sin(Math.PI * swing) * moving;
      const reach = 0.428 - dip - lift;
      const bend =
        Math.acos(Math.min(1, Math.hypot(forward, reach) / 0.436)) * (leg.front ? 1 : -1);
      leg.hip.setYawPitchRoll(0, -Math.atan2(forward, reach) - bend, 0);
      leg.knee.setYawPitchRoll(0, bend * 2, 0);
    }
  }

  public dispose() {
    this.root.skeleton?.dispose();
    this.root.dispose(false, true);
  }
}
