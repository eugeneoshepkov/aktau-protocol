import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Matrix,
  Vector3,
  Texture,
} from "@babylonjs/core";
import { GRID_SIZE, TILE_SIZE } from "../types";
import type { TileType } from "../types";
import { getTileTypeAt } from "./TileTypes";

// Atlas dimensions
const ATLAS_WIDTH = 968;
const ATLAS_HEIGHT = 526;
const TILE_PITCH = 17; // 16px tile + 1px margin

// Single sand tile for uniform desert look
const SAND_TILE = { col: 8, row: 0 }; // Tan sand (bottom section)

// Rock tile position
const ROCK_TILE = { col: 7, row: 0 }; // Gray stone

// Sea uses flat color, no texture
const SEA_COLOR = "#2F8D8D";

export class GridManager {
  private scene: Scene;
  private tileMap: TileType[][] = [];
  private tileMeshes: Map<TileType, Mesh> = new Map();
  private highlightMesh: Mesh | null = null;
  private highlightMaterial: StandardMaterial | null = null;
  private validColor = new Color3(1, 1, 0);
  private invalidColor = new Color3(1, 0.3, 0.3);
  private atlasTexture: Texture | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Generate the entire grid using instanced meshes for performance
   */
  public generateGrid(): void {
    // Generate tile type map
    this.generateTileMap();

    // Load the terrain atlas texture
    this.atlasTexture = new Texture(
      "/models/2d-terrain/Spritesheet/roguelikeSheet_transparent.png",
      this.scene,
    );
    this.atlasTexture.hasAlpha = true;

    // Count tiles of each type
    const tileCounts = this.countTileTypes();

    // Create instanced meshes for each tile type
    this.createInstancedTiles("sea", tileCounts.sea);
    this.createInstancedTiles("sand", tileCounts.sand);
    this.createInstancedTiles("rock", tileCounts.rock);

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

    // Collect all tile positions for this type
    const positions: { x: number; z: number }[] = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.tileMap[z][x] === tileType) {
          positions.push({ x, z });
        }
      }
    }

    if (tileType === "sea") {
      // Sea: flat color, no texture
      this.createFlatColorTiles("sea", positions, SEA_COLOR);
    } else if (tileType === "rock") {
      // Rock: single textured tile
      this.createTexturedTiles("rock", positions, ROCK_TILE);
    } else if (tileType === "sand") {
      // Sand: single textured tile for uniform look
      this.createTexturedTiles("sand", positions, SAND_TILE);
    }
  }

  private matricesToFloat32Array(matrices: Matrix[]): Float32Array {
    const array = new Float32Array(matrices.length * 16);
    for (let i = 0; i < matrices.length; i++) {
      matrices[i].copyToArray(array, i * 16);
    }
    return array;
  }

  private createFlatColorTiles(
    name: string,
    positions: { x: number; z: number }[],
    colorHex: string,
  ): void {
    const baseTile = MeshBuilder.CreateBox(
      `tile_${name}`,
      { width: TILE_SIZE * 0.95, height: 0.1, depth: TILE_SIZE * 0.95 },
      this.scene,
    );

    const material = new StandardMaterial(`mat_${name}`, this.scene);
    const hex = colorHex.replace("#", "");
    material.diffuseColor = new Color3(
      parseInt(hex.substring(0, 2), 16) / 255,
      parseInt(hex.substring(2, 4), 16) / 255,
      parseInt(hex.substring(4, 6), 16) / 255,
    );
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    baseTile.material = material;
    baseTile.isVisible = false;

    const matrices = positions.map((pos) =>
      Matrix.Translation(
        pos.x * TILE_SIZE + TILE_SIZE / 2,
        0,
        pos.z * TILE_SIZE + TILE_SIZE / 2,
      ),
    );

    baseTile.thinInstanceSetBuffer(
      "matrix",
      this.matricesToFloat32Array(matrices),
      16,
    );
    baseTile.isVisible = true;
    this.tileMeshes.set(name as TileType, baseTile);
  }

  private createTexturedTiles(
    name: string,
    positions: { x: number; z: number }[],
    tile: { col: number; row: number },
  ): void {
    if (!this.atlasTexture) return;

    const baseTile = MeshBuilder.CreateBox(
      `tile_${name}`,
      { width: TILE_SIZE * 0.95, height: 0.1, depth: TILE_SIZE * 0.95 },
      this.scene,
    );

    const material = new StandardMaterial(`mat_${name}`, this.scene);
    const tileTexture = this.atlasTexture.clone();
    tileTexture.uOffset = (tile.col * TILE_PITCH) / ATLAS_WIDTH;
    tileTexture.vOffset = 1 - ((tile.row + 1) * TILE_PITCH) / ATLAS_HEIGHT;
    tileTexture.uScale = TILE_PITCH / ATLAS_WIDTH;
    tileTexture.vScale = TILE_PITCH / ATLAS_HEIGHT;
    material.diffuseTexture = tileTexture;
    material.specularColor = Color3.Black();
    baseTile.material = material;
    baseTile.isVisible = false;

    const matrices = positions.map((pos) =>
      Matrix.Translation(
        pos.x * TILE_SIZE + TILE_SIZE / 2,
        0,
        pos.z * TILE_SIZE + TILE_SIZE / 2,
      ),
    );

    baseTile.thinInstanceSetBuffer(
      "matrix",
      this.matricesToFloat32Array(matrices),
      16,
    );
    baseTile.isVisible = true;
    this.tileMeshes.set(name as TileType, baseTile);
  }

  private createHighlightMesh(): void {
    this.highlightMesh = MeshBuilder.CreateBox(
      "highlight",
      { width: TILE_SIZE, height: 0.15, depth: TILE_SIZE },
      this.scene,
    );

    this.highlightMaterial = new StandardMaterial("highlightMat", this.scene);
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
      gridZ * TILE_SIZE + TILE_SIZE / 2,
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
    this.tileMeshes.forEach((mesh) => mesh.dispose());
    this.highlightMesh?.dispose();
  }
}
