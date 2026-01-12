import { AbstractMesh, Vector3 } from '@babylonjs/core';
import type { GridManager } from '../../grid/GridManager';
import type { GameState } from '../GameState';
import { GRID_SIZE, TILE_SIZE, SEA_ROWS } from '../../types';

type CamelState = 'idle' | 'roam';

const CAMEL_SPEED = 0.8;
const CAMEL_SCALE = 0.15;
const IDLE_MIN_TIME = 5;
const IDLE_MAX_TIME = 10;
const ROAM_RADIUS = 15;

export class Camel {
  private mesh: AbstractMesh;
  private gridManager: GridManager;
  private gameState: GameState;
  private state: CamelState = 'idle';
  private target: Vector3 | null = null;
  private idleTimer = 0;
  private idleDuration = 0;

  constructor(mesh: AbstractMesh, gridManager: GridManager, gameState: GameState) {
    this.mesh = mesh;
    this.gridManager = gridManager;
    this.gameState = gameState;

    this.mesh.scaling = new Vector3(CAMEL_SCALE, CAMEL_SCALE, CAMEL_SCALE);
    this.startIdle();
  }

  public update(deltaTime: number): void {
    switch (this.state) {
      case 'idle':
        this.updateIdle(deltaTime);
        break;
      case 'roam':
        this.updateRoam(deltaTime);
        break;
    }
  }

  private updateIdle(deltaTime: number): void {
    this.idleTimer += deltaTime;
    if (this.idleTimer >= this.idleDuration) {
      this.startRoam();
    }
  }

  private updateRoam(deltaTime: number): void {
    if (!this.target) {
      this.startIdle();
      return;
    }

    const direction = this.target.subtract(this.mesh.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.1) {
      this.startIdle();
      return;
    }

    direction.normalize();
    const moveAmount = Math.min(CAMEL_SPEED * deltaTime, distance);
    this.mesh.position.addInPlace(direction.scale(moveAmount));

    const lookTarget = this.mesh.position.add(direction);
    this.mesh.lookAt(lookTarget);
  }

  private startIdle(): void {
    this.state = 'idle';
    this.idleTimer = 0;
    this.idleDuration = IDLE_MIN_TIME + Math.random() * (IDLE_MAX_TIME - IDLE_MIN_TIME);
    this.target = null;
  }

  private startRoam(): void {
    const newTarget = this.findValidTarget();
    if (!newTarget) {
      this.startIdle();
      return;
    }

    this.state = 'roam';
    this.target = newTarget;
  }

  private findValidTarget(): Vector3 | null {
    const currentGridX = Math.floor(this.mesh.position.x / TILE_SIZE);
    const currentGridZ = Math.floor(this.mesh.position.z / TILE_SIZE);

    for (let attempt = 0; attempt < 20; attempt++) {
      const offsetX = Math.floor(Math.random() * ROAM_RADIUS * 2) - ROAM_RADIUS;
      const offsetZ = Math.floor(Math.random() * ROAM_RADIUS * 2) - ROAM_RADIUS;

      const targetGridX = currentGridX + offsetX;
      const targetGridZ = currentGridZ + offsetZ;

      if (this.isValidTile(targetGridX, targetGridZ)) {
        return new Vector3(
          targetGridX * TILE_SIZE + TILE_SIZE / 2,
          this.mesh.position.y,
          targetGridZ * TILE_SIZE + TILE_SIZE / 2
        );
      }
    }

    return null;
  }

  private isValidTile(gridX: number, gridZ: number): boolean {
    if (gridX < 0 || gridX >= GRID_SIZE || gridZ < SEA_ROWS || gridZ >= GRID_SIZE) {
      return false;
    }

    const tileType = this.gridManager.getTileAt(gridX, gridZ);
    if (tileType !== 'sand') {
      return false;
    }

    const building = this.gameState.getBuildingAt(gridX, gridZ);
    if (building) {
      return false;
    }

    return true;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.mesh.position = new Vector3(x, y, z);
  }

  public getMesh(): AbstractMesh {
    return this.mesh;
  }

  public dispose(): void {
    this.mesh.dispose();
  }
}
