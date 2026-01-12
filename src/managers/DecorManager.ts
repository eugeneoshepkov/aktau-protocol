import { Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { assetManager, type RoadsConfig } from './AssetManager';
import { gameState } from '../simulation/GameState';
import { GRID_SIZE, TILE_SIZE } from '../types';
import type { TileType } from '../types';

interface PlacedDecor {
  node: TransformNode;
  gridX: number;
  gridZ: number;
}

class DecorManagerClass {
  private scene: Scene | null = null;
  private decorations: Map<string, PlacedDecor> = new Map();
  private decoratedTiles: Set<string> = new Set();
  private roadTiles: Set<string> = new Set();

  public async initialize(scene: Scene, getTileAt: (x: number, z: number) => TileType | null): Promise<void> {
    this.scene = scene;

    gameState.on('buildingPlaced', (building: any) => {
      this.removeDecorationAt(building.gridX, building.gridZ);
    });

    const sandTiles: { x: number; z: number }[] = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tileType = getTileAt(x, z);
        if (tileType === 'sand') {
          sandTiles.push({ x, z });
        }
      }
    }

    if (!assetManager.shouldUseModels()) {
      console.log('[DecorManager] Models disabled');
      return;
    }

    await this.generateRoads(sandTiles);
    await this.placeDecorations(sandTiles);

    console.log(`[DecorManager] Total decorations placed: ${this.decorations.size}`);
  }

  private async generateRoads(sandTiles: { x: number; z: number }[]): Promise<void> {
    const roadsConfig = this.getRoadsConfig();
    if (!roadsConfig) return;

    const basePath = assetManager.getBasePath(roadsConfig.basePath);

    const mainRoads = [
      { start: { x: 15, z: 10 }, direction: 'horizontal', length: 25 },
      { start: { x: 20, z: 15 }, direction: 'vertical', length: 20 },
      { start: { x: 30, z: 25 }, direction: 'horizontal', length: 15 },
    ];

    for (const road of mainRoads) {
      await this.placeRoad(road, roadsConfig, basePath, sandTiles);
    }

    console.log(`[DecorManager] Placed ${this.roadTiles.size} road tiles`);
  }

  private async placeRoad(
    road: { start: { x: number; z: number }; direction: string; length: number },
    config: RoadsConfig,
    basePath: string,
    validTiles: { x: number; z: number }[]
  ): Promise<void> {
    const validSet = new Set(validTiles.map(t => `${t.x},${t.z}`));
    let x = road.start.x;
    let z = road.start.z;

    for (let i = 0; i < road.length; i++) {
      const key = `${x},${z}`;

      if (!validSet.has(key) || this.roadTiles.has(key)) {
        if (road.direction === 'horizontal') x++;
        else z++;
        continue;
      }

      const isEnd = i === road.length - 1;
      const isStart = i === 0;
      const modelFile = isStart || isEnd ? config.end : config.straight;

      try {
        const meshes = await assetManager.loadModel(modelFile, basePath);
        if (!meshes || meshes.length === 0) continue;

        const node = new TransformNode(`road_${key}`, this.scene!);
        node.position = new Vector3(
          x * TILE_SIZE + TILE_SIZE / 2,
          0.02,
          z * TILE_SIZE + TILE_SIZE / 2
        );
        node.scaling = new Vector3(config.scale, config.scale, config.scale);

        if (road.direction === 'horizontal') {
          node.rotation.y = Math.PI / 2;
        }
        if (isEnd) {
          node.rotation.y += Math.PI;
        }

        for (const mesh of meshes) {
          mesh.parent = node;
        }

        this.decorations.set(key, { node, gridX: x, gridZ: z });
        this.decoratedTiles.add(key);
        this.roadTiles.add(key);
      } catch (error) {
        console.warn(`[DecorManager] Failed to place road at ${x},${z}:`, error);
      }

      if (road.direction === 'horizontal') x++;
      else z++;
    }
  }

  private getRoadsConfig(): RoadsConfig | null {
    return assetManager.getRoads();
  }

  private async placeDecorations(sandTiles: { x: number; z: number }[]): Promise<void> {
    const decorConfig = assetManager.getDecorations();
    if (!decorConfig) return;

    this.shuffleArray(sandTiles);
    const basePath = assetManager.getBasePath(decorConfig.basePath);

    for (const item of decorConfig.items) {
      const targetCount = Math.floor(sandTiles.length * item.frequency);
      let placed = 0;

      for (const tile of sandTiles) {
        if (placed >= targetCount) break;

        const key = `${tile.x},${tile.z}`;
        if (this.decoratedTiles.has(key)) continue;

        if (Math.random() > 0.8) continue;

        try {
          const meshes = await assetManager.loadModel(item.file, basePath);
          if (!meshes || meshes.length === 0) continue;

          const node = new TransformNode(`decor_${key}`, this.scene!);
          node.position = new Vector3(
            tile.x * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 0.4,
            0,
            tile.z * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 0.4
          );
          node.scaling = new Vector3(item.scale, item.scale, item.scale);
          node.rotation.y = Math.random() * Math.PI * 2;

          for (const mesh of meshes) {
            mesh.parent = node;
          }

          this.decorations.set(key, { node, gridX: tile.x, gridZ: tile.z });
          this.decoratedTiles.add(key);
          placed++;
        } catch (error) {
          console.warn(`[DecorManager] Failed to load decoration ${item.file}:`, error);
        }
      }

      console.log(`[DecorManager] Placed ${placed} ${item.file}`);
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public removeDecorationAt(gridX: number, gridZ: number): void {
    const key = `${gridX},${gridZ}`;
    const decor = this.decorations.get(key);

    if (decor) {
      const children = decor.node.getChildMeshes();
      for (const child of children) {
        child.dispose();
      }
      decor.node.dispose();
      this.decorations.delete(key);
      this.decoratedTiles.delete(key);
      this.roadTiles.delete(key);
    }
  }

  public hasDecorationAt(gridX: number, gridZ: number): boolean {
    return this.decoratedTiles.has(`${gridX},${gridZ}`);
  }

  public dispose(): void {
    for (const decor of this.decorations.values()) {
      const children = decor.node.getChildMeshes();
      for (const child of children) {
        child.dispose();
      }
      decor.node.dispose();
    }
    this.decorations.clear();
    this.decoratedTiles.clear();
    this.roadTiles.clear();
  }
}

export const decorManager = new DecorManagerClass();
