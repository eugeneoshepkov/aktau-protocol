import { AbstractMesh, Vector3 } from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../../types';

const BASE_SPEED = 0.6;
const SPEED_VARIATION = 0.3;
const TUMBLEWEED_SCALE = 0.15;
const BOUNCE_FREQUENCY = 3;
const BOUNCE_AMPLITUDE = 0.15;
const GROUND_OFFSET = 0.15;
const DRIFT_AMPLITUDE = 0.1;
const DRIFT_FREQUENCY = 0.5;

export class Tumbleweed {
  private mesh: AbstractMesh;
  private elapsedTime = 0;
  private disposed = false;
  private speed: number;
  private driftPhase: number;

  constructor(mesh: AbstractMesh) {
    this.mesh = mesh;
    this.mesh.scaling = new Vector3(TUMBLEWEED_SCALE, TUMBLEWEED_SCALE, TUMBLEWEED_SCALE);
    this.speed = BASE_SPEED + Math.random() * SPEED_VARIATION;
    this.driftPhase = Math.random() * Math.PI * 2;
  }

  public update(deltaTime: number): void {
    if (this.disposed) return;

    this.elapsedTime += deltaTime;

    this.mesh.position.x += this.speed * deltaTime;

    this.mesh.position.z += Math.sin(this.elapsedTime * DRIFT_FREQUENCY + this.driftPhase) * DRIFT_AMPLITUDE * deltaTime;

    this.mesh.rotation.z -= this.speed * deltaTime * 3;
    this.mesh.rotation.x += Math.sin(this.elapsedTime * 2) * deltaTime * 0.5;

    this.mesh.position.y = GROUND_OFFSET + Math.abs(Math.sin(this.elapsedTime * BOUNCE_FREQUENCY) * BOUNCE_AMPLITUDE);
  }

  public isOffScreen(): boolean {
    return this.mesh.position.x > GRID_SIZE * TILE_SIZE;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.mesh.position = new Vector3(x, y, z);
  }

  public getMesh(): AbstractMesh {
    return this.mesh;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.dispose();
  }

  public isDisposed(): boolean {
    return this.disposed;
  }
}
