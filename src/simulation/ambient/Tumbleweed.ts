import { AbstractMesh, Vector3 } from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../../types';
import type { GameState } from '../GameState';

const BASE_SPEED = 0.6;
const SPEED_VARIATION = 0.3;
const TUMBLEWEED_SCALE = 0.15;
const BOUNCE_FREQUENCY = 3;
const BOUNCE_AMPLITUDE = 0.15;
const GROUND_OFFSET = 0.15;
const DRIFT_AMPLITUDE = 0.1;
const DRIFT_FREQUENCY = 0.5;
const AVOIDANCE_DISTANCE = 2;

export class Tumbleweed {
  private mesh: AbstractMesh;
  private gameState: GameState;
  private elapsedTime = 0;
  private disposed = false;
  private speed: number;
  private driftPhase: number;
  private avoidanceOffset = 0;

  constructor(mesh: AbstractMesh, gameState: GameState) {
    this.mesh = mesh;
    this.gameState = gameState;
    this.mesh.scaling = new Vector3(TUMBLEWEED_SCALE, TUMBLEWEED_SCALE, TUMBLEWEED_SCALE);
    this.speed = BASE_SPEED + Math.random() * SPEED_VARIATION;
    this.driftPhase = Math.random() * Math.PI * 2;
  }

  public update(deltaTime: number): void {
    if (this.disposed) return;

    this.elapsedTime += deltaTime;

    // Check for buildings ahead and apply avoidance
    const lookAheadX = this.mesh.position.x + AVOIDANCE_DISTANCE;
    const currentGridX = Math.floor(lookAheadX / TILE_SIZE);
    const currentGridZ = Math.floor(this.mesh.position.z / TILE_SIZE);

    const buildingAhead = this.gameState.getBuildingAt(currentGridX, currentGridZ);

    if (buildingAhead) {
      // Drift away from building (go up or down in Z)
      const buildingCenterZ = buildingAhead.gridZ * TILE_SIZE + TILE_SIZE / 2;
      if (this.mesh.position.z < buildingCenterZ) {
        this.avoidanceOffset = -TILE_SIZE * 1.5;
      } else {
        this.avoidanceOffset = TILE_SIZE * 1.5;
      }
    } else {
      // Gradually return to normal path
      this.avoidanceOffset *= 0.95;
    }

    this.mesh.position.x += this.speed * deltaTime;

    const baseDrift = Math.sin(this.elapsedTime * DRIFT_FREQUENCY + this.driftPhase) * DRIFT_AMPLITUDE * deltaTime;
    const avoidanceDrift = this.avoidanceOffset * deltaTime * 2;
    this.mesh.position.z += baseDrift + avoidanceDrift;

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
