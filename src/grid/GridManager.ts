import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Matrix,
  Vector3
} from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../types';
import type { TileType } from '../types';
import { getTileTypeAt, getTileColor } from './TileTypes';

export class GridManager {
  private scene: Scene;
  private tileMap: TileType[][] = [];
  private tileMeshes: Map<TileType, Mesh> = new Map();
  private highlightMesh: Mesh | null = null;
  private highlightMaterial: StandardMaterial | null = null;
  private validColor = new Color3(1, 1, 0);
  private invalidColor = new Color3(1, 0.3, 0.3);

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Generate the entire grid using instanced meshes for performance
   */
  public generateGrid(): void {
    // Generate tile type map
    this.generateTileMap();

    // Count tiles of each type
    const tileCounts = this.countTileTypes();

    // Create instanced meshes for each tile type
    this.createInstancedTiles('sea', tileCounts.sea);
    this.createInstancedTiles('sand', tileCounts.sand);
    this.createInstancedTiles('rock', tileCounts.rock);

    // Create highlight cursor
    this.createHighlightMesh();
  }

  private generateTileMap(): void {
    this.tileMap = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(getTileTypeAt(x, z));
      }
      this.tileMap.push(row);
    }
  }

  private countTileTypes(): Record<TileType, number> {
    const counts: Record<TileType, number> = { sea: 0, sand: 0, rock: 0 };
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        counts[this.tileMap[z][x]]++;
      }
    }
    return counts;
  }

  private createInstancedTiles(tileType: TileType, count: number): void {
    if (count === 0) return;

    // Create base tile mesh
    const baseTile = MeshBuilder.CreateBox(
      `tile_${tileType}`,
      { width: TILE_SIZE * 0.95, height: 0.1, depth: TILE_SIZE * 0.95 },
      this.scene
    );

    // Create material with tile color
    const material = new StandardMaterial(`mat_${tileType}`, this.scene);
    const color = getTileColor(tileType);
    material.diffuseColor = new Color3(color.r, color.g, color.b);
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    baseTile.material = material;

    // Make base tile invisible (we only use instances)
    baseTile.isVisible = false;

    // Create transformation matrices for all tiles of this type
    const matrices: Matrix[] = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.tileMap[z][x] === tileType) {
          const matrix = Matrix.Translation(
            x * TILE_SIZE + TILE_SIZE / 2,
            0,
            z * TILE_SIZE + TILE_SIZE / 2
          );
          matrices.push(matrix);
        }
      }
    }

    // Apply instances
    baseTile.thinInstanceSetBuffer('matrix', this.matricesToFloat32Array(matrices), 16);
    baseTile.isVisible = true;

    this.tileMeshes.set(tileType, baseTile);
  }

  private matricesToFloat32Array(matrices: Matrix[]): Float32Array {
    const array = new Float32Array(matrices.length * 16);
    for (let i = 0; i < matrices.length; i++) {
      matrices[i].copyToArray(array, i * 16);
    }
    return array;
  }

  private createHighlightMesh(): void {
    this.highlightMesh = MeshBuilder.CreateBox(
      'highlight',
      { width: TILE_SIZE, height: 0.15, depth: TILE_SIZE },
      this.scene
    );

    this.highlightMaterial = new StandardMaterial('highlightMat', this.scene);
    this.highlightMaterial.diffuseColor = this.validColor;
    this.highlightMaterial.alpha = 0.5;
    this.highlightMaterial.emissiveColor = this.validColor.scale(0.5);
    this.highlightMesh.material = this.highlightMaterial;

    this.highlightMesh.isVisible = false;
  }

  /**
   * Show highlight at grid position
   */
  public showHighlight(gridX: number, gridZ: number, valid = true): void {
    if (!this.highlightMesh || !this.highlightMaterial) return;

    this.highlightMesh.position = new Vector3(
      gridX * TILE_SIZE + TILE_SIZE / 2,
      0.05,
      gridZ * TILE_SIZE + TILE_SIZE / 2
    );

    const color = valid ? this.validColor : this.invalidColor;
    this.highlightMaterial.diffuseColor = color;
    this.highlightMaterial.emissiveColor = color.scale(0.5);

    this.highlightMesh.isVisible = true;
  }

  /**
   * Hide the highlight cursor
   */
  public hideHighlight(): void {
    if (this.highlightMesh) {
      this.highlightMesh.isVisible = false;
    }
  }

  /**
   * Get tile type at grid position
   */
  public getTileAt(gridX: number, gridZ: number): TileType | null {
    if (gridX < 0 || gridX >= GRID_SIZE || gridZ < 0 || gridZ >= GRID_SIZE) {
      return null;
    }
    return this.tileMap[gridZ][gridX];
  }

  /**
   * Check if a position is within grid bounds
   */
  public isInBounds(gridX: number, gridZ: number): boolean {
    return gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE;
  }

  public dispose(): void {
    this.tileMeshes.forEach(mesh => mesh.dispose());
    this.highlightMesh?.dispose();
  }
}
