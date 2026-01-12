import { Scene, AbstractMesh } from '@babylonjs/core';
import { assetManager } from '../../managers/AssetManager';
import { gameState } from '../GameState';
import type { GridManager } from '../../grid/GridManager';
import { Camel } from './Camel';
import { Tumbleweed } from './Tumbleweed';
import { GRID_SIZE, TILE_SIZE, SEA_ROWS } from '../../types';

const CAMEL_COUNT_MIN = 3;
const CAMEL_COUNT_MAX = 5;
const TUMBLEWEED_SPAWN_MIN = 2;
const TUMBLEWEED_SPAWN_MAX = 5;
const SPAWN_X = -5;

class AmbientManagerClass {
  private gridManager: GridManager | null = null;
  private masterCamel: AbstractMesh | null = null;
  private masterTumbleweed: AbstractMesh | null = null;
  private camels: Camel[] = [];
  private tumbleweeds: Tumbleweed[] = [];
  private tumbleweedSpawnTimer = 0;
  private nextSpawnInterval = 0;
  private initialized = false;

  public async initialize(_scene: Scene, gridManager: GridManager): Promise<void> {
    if (this.initialized) return;

    this.gridManager = gridManager;

    await this.loadMasterAssets();

    if (this.masterCamel) {
      this.spawnCamels();
    }

    this.nextSpawnInterval = this.getRandomSpawnInterval();
    this.initialized = true;
    console.log('[AmbientManager] Initialized');
  }

  private async loadMasterAssets(): Promise<void> {
    const miscBasePath = assetManager.getBasePath('misc');

    const camelFile = assetManager.getMiscAsset('camel');
    if (camelFile) {
      const meshes = await assetManager.loadModel(camelFile, miscBasePath);
      if (meshes && meshes.length > 0) {
        this.masterCamel = meshes[0];
        this.masterCamel.setEnabled(false);
        console.log('[AmbientManager] Loaded camel master mesh');
      }
    }

    const tumbleweedFile = assetManager.getMiscAsset('tumbleweed');
    if (tumbleweedFile) {
      const meshes = await assetManager.loadModel(tumbleweedFile, miscBasePath);
      if (meshes && meshes.length > 0) {
        this.masterTumbleweed = meshes[0];
        this.masterTumbleweed.setEnabled(false);
        console.log('[AmbientManager] Loaded tumbleweed master mesh');
      }
    }
  }

  private spawnCamels(): void {
    const count = CAMEL_COUNT_MIN + Math.floor(Math.random() * (CAMEL_COUNT_MAX - CAMEL_COUNT_MIN + 1));

    for (let i = 0; i < count; i++) {
      const camel = this.createCamel();
      if (camel) {
        this.camels.push(camel);
      }
    }

    console.log(`[AmbientManager] Spawned ${this.camels.length} camels`);
  }

  private createCamel(): Camel | null {
    if (!this.masterCamel || !this.gridManager) return null;

    const clone = this.masterCamel.clone(`camel_${Date.now()}_${Math.random()}`, null);
    if (!clone) return null;

    clone.setEnabled(true);

    const position = this.getRandomSandPosition();
    if (!position) {
      clone.dispose();
      return null;
    }

    const camel = new Camel(clone, this.gridManager, gameState);
    camel.setPosition(position.x, 0, position.z);

    return camel;
  }

  private getRandomSandPosition(): { x: number; z: number } | null {
    for (let attempt = 0; attempt < 50; attempt++) {
      const gridX = Math.floor(Math.random() * GRID_SIZE);
      const gridZ = SEA_ROWS + Math.floor(Math.random() * (GRID_SIZE - SEA_ROWS));

      const tileType = this.gridManager?.getTileAt(gridX, gridZ);
      if (tileType === 'sand' && !gameState.getBuildingAt(gridX, gridZ)) {
        return {
          x: gridX * TILE_SIZE + TILE_SIZE / 2,
          z: gridZ * TILE_SIZE + TILE_SIZE / 2
        };
      }
    }
    return null;
  }

  private spawnTumbleweed(): void {
    if (!this.masterTumbleweed) return;

    const clone = this.masterTumbleweed.clone(`tumbleweed_${Date.now()}_${Math.random()}`, null);
    if (!clone) return;

    clone.setEnabled(true);

    const z = (SEA_ROWS + Math.random() * (GRID_SIZE - SEA_ROWS - 5)) * TILE_SIZE;

    const tumbleweed = new Tumbleweed(clone);
    tumbleweed.setPosition(SPAWN_X, 0.2, z);

    this.tumbleweeds.push(tumbleweed);
  }

  private getRandomSpawnInterval(): number {
    return TUMBLEWEED_SPAWN_MIN + Math.random() * (TUMBLEWEED_SPAWN_MAX - TUMBLEWEED_SPAWN_MIN);
  }

  public update(deltaTime: number): void {
    if (!this.initialized) return;

    for (const camel of this.camels) {
      camel.update(deltaTime);
    }

    this.tumbleweedSpawnTimer += deltaTime;
    if (this.tumbleweedSpawnTimer >= this.nextSpawnInterval) {
      this.spawnTumbleweed();
      this.tumbleweedSpawnTimer = 0;
      this.nextSpawnInterval = this.getRandomSpawnInterval();
    }

    for (const tumbleweed of this.tumbleweeds) {
      tumbleweed.update(deltaTime);
    }

    this.tumbleweeds = this.tumbleweeds.filter(t => {
      if (t.isOffScreen()) {
        t.dispose();
        return false;
      }
      return true;
    });
  }

  public dispose(): void {
    for (const camel of this.camels) {
      camel.dispose();
    }
    this.camels = [];

    for (const tumbleweed of this.tumbleweeds) {
      tumbleweed.dispose();
    }
    this.tumbleweeds = [];

    this.masterCamel?.dispose();
    this.masterTumbleweed?.dispose();
    this.masterCamel = null;
    this.masterTumbleweed = null;

    this.initialized = false;
  }
}

export const ambientManager = new AmbientManagerClass();
