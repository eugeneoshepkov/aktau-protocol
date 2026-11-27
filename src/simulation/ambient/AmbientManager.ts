import type { AbstractMesh, Scene } from '@babylonjs/core';
import { assetManager } from '../../managers/AssetManager';
import { getTileTypeAt, shoreAt } from '../../grid/TileTypes';
import { gameState } from '../GameState';
import { SteppeGrazer } from './SteppeGrazer';
import { SteppeSnake } from './SteppeSnake';
import { CaspianSeal } from './CaspianSeal';
import { Tumbleweed } from './Tumbleweed';
import { GRID_SIZE, TILE_SIZE, SEA_ROWS } from '../../types';

const TUMBLEWEED_SPAWN_MIN = 2;
const TUMBLEWEED_SPAWN_MAX = 5;
const SPAWN_X = -5;

interface Range {
  species: 'camel' | 'horse' | 'snake' | 'seal';
  x: number;
  z: number;
  animal?: SteppeGrazer | SteppeSnake | CaspianSeal;
}

function findClearing(range: Range, clear: (x: number, z: number) => boolean) {
  // Start at the familiar grazing spot, then try the surrounding steppe if the city has grown.
  for (let radius = 0; radius <= 6; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const x = range.x + dx,
          z = range.z + dz;
        if (clear(x, z)) return { x, z };
      }
    }
  }
}

export class AmbientManager {
  private readonly ranges: Range[] = [
    { species: 'camel', x: 38.5, z: 20.5 },
    { species: 'camel', x: 40.5, z: 21.5 },
    { species: 'horse', x: 32.5, z: 22.5 },
    { species: 'horse', x: 30.5, z: 23.5 },
    { species: 'snake', x: 43.5, z: 20.5 },
    { species: 'seal', x: 48.5, z: 2.5 }
  ];
  private occupied = new Uint8Array(GRID_SIZE * GRID_SIZE);
  private habitatChanged = true;
  private markHabitatChanged = () => {
    this.habitatChanged = true;
  };
  private masterTumbleweed: AbstractMesh | null = null;
  private tumbleweeds: Tumbleweed[] = [];
  private tumbleweedSpawnTimer = 0;
  private nextSpawnInterval = this.getRandomSpawnInterval();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    gameState.on('buildingPlaced', this.markHabitatChanged);
    gameState.on('buildingRemoved', this.markHabitatChanged);
    gameState.on('civicProjectChange', this.markHabitatChanged);
    gameState.on('seasonChange', this.markHabitatChanged);
    this.scene.onDisposeObservable.addOnce(() => this.dispose());
  }

  public async initialize(): Promise<void> {
    const file = assetManager.getMiscAsset('tumbleweed');
    if (file) {
      const meshes = await assetManager.loadModel(file, assetManager.getBasePath('misc'));
      this.masterTumbleweed = meshes?.[0] ?? null;
      this.masterTumbleweed?.setEnabled(false);
    }
    this.refreshHabitat();
  }

  private canRoam(range: Range, x: number, z: number): boolean {
    const cellX = Math.floor(x),
      cellZ = Math.floor(z);
    if (
      cellX >= 0 &&
      cellX < GRID_SIZE &&
      cellZ >= 0 &&
      cellZ < GRID_SIZE &&
      this.occupied[cellZ * GRID_SIZE + cellX]
    )
      return false;
    if (range.species === 'seal') {
      // The small bay east of the breakwater is clear of the tug's circuit and the swimming pier.
      return x > 46.8 && x < 54 && z > -1.5 && z < 4.4 && z < shoreAt(x) - 2.5;
    }
    // Open steppe starts behind the last boulevard and its windbreak.
    if (
      x < 1 ||
      x > GRID_SIZE - 1 ||
      z < 19.6 ||
      z > GRID_SIZE - 1 ||
      getTileTypeAt(cellX, cellZ) !== 'sand'
    )
      return false;
    if (range.species === 'snake') return true;
    return !this.ranges.some((other) => {
      if (
        other === range ||
        !other.animal ||
        (other.species !== 'horse' && other.species !== 'camel')
      )
        return false;
      const pos = other.animal.root.position;
      return (x - pos.x) ** 2 + (z - pos.z) ** 2 < 0.85 ** 2;
    });
  }

  private refreshHabitat(): void {
    this.habitatChanged = false;
    this.occupied.fill(0);
    const blockLot = (x: number, z: number) => {
      // Leave room for the foundation and the animal's body on either side of its centre.
      for (let row = Math.max(0, z - 1); row <= Math.min(GRID_SIZE - 1, z + 1); row++) {
        for (let col = Math.max(0, x - 1); col <= Math.min(GRID_SIZE - 1, x + 1); col++) {
          this.occupied[row * GRID_SIZE + col] = 1;
        }
      }
    };
    for (const site of gameState.getBuildings()) blockLot(site.gridX, site.gridZ);
    const civic = gameState.getCivicProject();
    if (civic) blockLot(civic.gridX, civic.gridZ);

    for (const range of this.ranges) {
      const dormant = range.species === 'snake' && gameState.getSeason() === 'winter';
      if (range.animal) {
        const { x, z } = range.animal.root.position;
        if (!dormant && this.canRoam(range, x, z)) continue;
        range.animal.dispose();
        range.animal = undefined;
      }
      if (dormant) continue;
      const clear = (x: number, z: number) => this.canRoam(range, x, z);
      const spot = findClearing(range, clear);
      if (!spot) continue;
      if (range.species === 'seal') range.animal = new CaspianSeal(this.scene, spot, clear);
      else if (range.species === 'snake') range.animal = new SteppeSnake(this.scene, spot, clear);
      else range.animal = new SteppeGrazer(this.scene, range.species, spot.x, spot.z, clear);
    }
  }

  private spawnTumbleweed(): void {
    if (!this.masterTumbleweed) return;

    const clone = this.masterTumbleweed.clone(`tumbleweed_${Date.now()}_${Math.random()}`, null);
    if (!clone) return;

    clone.setEnabled(true);

    const z = (SEA_ROWS + Math.random() * (GRID_SIZE - SEA_ROWS - 5)) * TILE_SIZE;

    const tumbleweed = new Tumbleweed(clone, gameState);
    tumbleweed.setPosition(SPAWN_X, 0.2, z);

    this.tumbleweeds.push(tumbleweed);
  }

  private getRandomSpawnInterval(): number {
    return TUMBLEWEED_SPAWN_MIN + Math.random() * (TUMBLEWEED_SPAWN_MAX - TUMBLEWEED_SPAWN_MIN);
  }

  public update(deltaTime: number): void {
    if (this.habitatChanged) this.refreshHabitat();
    for (const range of this.ranges) range.animal?.update(deltaTime);

    this.tumbleweedSpawnTimer += deltaTime;
    if (this.tumbleweedSpawnTimer >= this.nextSpawnInterval) {
      this.spawnTumbleweed();
      this.tumbleweedSpawnTimer = 0;
      this.nextSpawnInterval = this.getRandomSpawnInterval();
    }

    for (const tumbleweed of this.tumbleweeds) {
      tumbleweed.update(deltaTime);
    }

    this.tumbleweeds = this.tumbleweeds.filter((t) => {
      if (t.isOffScreen()) {
        t.dispose();
        return false;
      }
      return true;
    });
  }

  public dispose(): void {
    gameState.off('buildingPlaced', this.markHabitatChanged);
    gameState.off('buildingRemoved', this.markHabitatChanged);
    gameState.off('civicProjectChange', this.markHabitatChanged);
    gameState.off('seasonChange', this.markHabitatChanged);
    for (const range of this.ranges) range.animal?.dispose();
    for (const tumbleweed of this.tumbleweeds) tumbleweed.dispose();
    this.masterTumbleweed?.dispose();
  }
}
