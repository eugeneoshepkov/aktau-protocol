import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  VertexData,
  VertexBuffer
} from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../types';
import type { TileType } from '../types';
import { getTileTypeAt, getTileColor } from './TileTypes';

export class GridManager {
  private scene: Scene;
  private tileMap: TileType[][] = [];

  // Diorama meshes
  private landMesh: Mesh | null = null;
  private seaMesh: Mesh | null = null;
  private baseMesh: Mesh | null = null;

  // Highlight cursor
  private highlightMesh: Mesh | null = null;
  private highlightMaterial: StandardMaterial | null = null;
  private validColor = new Color3(1, 1, 0);
  private invalidColor = new Color3(1, 0.3, 0.3);

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Generate the organic diorama terrain
   */
  public generateGrid(): void {
    // Generate tile type map
    this.generateTileMap();

    // Create diorama meshes
    this.createLandMesh();
    this.createWaterMesh();
    this.createDioramaBase();

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

  /**
   * Deterministic seeded random based on position
   * Returns value between 0 and 1
   */
  private seededRandom(vx: number, vz: number): number {
    let hash = vx * 374761393 + vz * 668265263;
    hash = (hash ^ (hash >> 13)) * 1274126177;
    hash = hash ^ (hash >> 16);
    return (Math.abs(hash) % 10000) / 10000;
  }

  /**
   * Returns a roughness value (0-1) for terrain patches.
   * Uses low-frequency sine waves to create large clustered patches
   * of flat plains (0) and rough dunes/hills (1).
   */
  private getRoughness(x: number, z: number): number {
    const scale1 = 0.1; // ~10-15 tile wide patches
    const scale2 = 0.07; // Secondary frequency to break up repetition

    // Combine two wave patterns
    const noise = Math.sin(x * scale1) + Math.cos(z * scale1) + Math.sin(z * scale2 + x * 0.5);

    // noise ranges roughly from -3 to +3, normalize to 0..1
    const normalized = (noise + 3) / 6;

    // Apply smoothstep for sharper transitions between flat and rough
    const t = Math.max(0, Math.min(1, normalized));
    const smoothed = t * t * (3 - 2 * t);

    // Hard floor: below 0.3 threshold becomes exactly 0 (perfect flat)
    return smoothed < 0.3 ? 0 : smoothed;
  }

  /**
   * Get jitter for a corner point (deterministic, shared between adjacent tiles)
   */
  private getCornerJitter(cornerX: number, cornerZ: number): { jx: number; jz: number } {
    const roughness = this.getRoughness(cornerX, cornerZ);
    const jitterAmount = 0.6 * roughness; // Scale base jitter by roughness

    return {
      jx: (this.seededRandom(cornerX, cornerZ) - 0.5) * jitterAmount,
      jz: (this.seededRandom(cornerX + 1000, cornerZ + 1000) - 0.5) * jitterAmount
    };
  }

  /**
   * Create the main land mesh with non-indexed geometry for crisp tile edges.
   * Sea tiles are skipped entirely, leaving holes for water to show through.
   */
  private createLandMesh(): void {
    // Count land tiles (non-sea) to allocate arrays
    let landTileCount = 0;
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.tileMap[z][x] !== 'sea') {
          landTileCount++;
        }
      }
    }

    if (landTileCount === 0) return;

    // Each land tile = 4 unique vertices (non-shared for flat shading)
    // Each land tile = 2 triangles = 6 indices
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    let vertexIndex = 0;

    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tileType = this.tileMap[z][x];

        // Skip sea tiles - leave holes for water mesh to show through
        if (tileType === 'sea') continue;

        // Get jitter for each corner (consistent across adjacent tiles)
        const j00 = this.getCornerJitter(x, z); // top-left
        const j10 = this.getCornerJitter(x + 1, z); // top-right
        const j01 = this.getCornerJitter(x, z + 1); // bottom-left
        const j11 = this.getCornerJitter(x + 1, z + 1); // bottom-right

        // World positions for corners with jitter applied
        const x0 = x * TILE_SIZE + j00.jx;
        const x1 = (x + 1) * TILE_SIZE + j10.jx;
        const z0 = z * TILE_SIZE + j00.jz;
        const z1_topRight = z * TILE_SIZE + j10.jz;
        const z2_bottomLeft = (z + 1) * TILE_SIZE + j01.jz;
        const z3 = (z + 1) * TILE_SIZE + j11.jz;
        const x2 = x * TILE_SIZE + j01.jx;
        const x3 = (x + 1) * TILE_SIZE + j11.jx;

        // Get tile color (same for all 4 vertices - crisp flat color)
        const rgb = getTileColor(tileType);

        // Add color variation for sand tiles (simulates dunes/texture)
        let r = rgb.r,
          g = rgb.g,
          b = rgb.b;
        if (tileType === 'sand') {
          // Get roughness at tile center for consistent per-tile appearance
          const tileRoughness = this.getRoughness(x + 0.5, z + 0.5);

          // Scale variation by roughness: flat=±1%, rough=±10%
          const baseVariation = (this.seededRandom(x + 5000, z + 5000) - 0.5) * 0.2;
          const variation = tileRoughness > 0 ? baseVariation : baseVariation * 0.1;

          // Rough areas are slightly darker (up to 10% darker at max roughness)
          const roughnessDarken = tileRoughness * 0.1;

          r = Math.max(0, Math.min(1, rgb.r + variation - roughnessDarken));
          g = Math.max(0, Math.min(1, rgb.g + variation - roughnessDarken));
          b = Math.max(0, Math.min(1, rgb.b + variation - roughnessDarken));
        }

        // Height: rocks elevated above sand, all corners same height (no gaps)
        const tileY = tileType === 'rock' ? 0.25 : 0.15;

        // Create 4 unique vertices for this tile
        // Vertex 0: top-left corner (x, z)
        positions.push(x0, tileY, z0);
        colors.push(r, g, b, 1.0);
        normals.push(0, 1, 0);

        // Vertex 1: top-right corner (x+1, z)
        positions.push(x1, tileY, z1_topRight);
        colors.push(r, g, b, 1.0);
        normals.push(0, 1, 0);

        // Vertex 2: bottom-left corner (x, z+1)
        positions.push(x2, tileY, z2_bottomLeft);
        colors.push(r, g, b, 1.0);
        normals.push(0, 1, 0);

        // Vertex 3: bottom-right corner (x+1, z+1)
        positions.push(x3, tileY, z3);
        colors.push(r, g, b, 1.0);
        normals.push(0, 1, 0);

        // Two triangles: 0-2-1 and 1-2-3 (counter-clockwise winding)
        indices.push(
          vertexIndex,
          vertexIndex + 2,
          vertexIndex + 1,
          vertexIndex + 1,
          vertexIndex + 2,
          vertexIndex + 3
        );

        vertexIndex += 4;
      }
    }

    // Create mesh from vertex data
    this.landMesh = new Mesh('landMesh', this.scene);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.normals = normals;

    vertexData.applyToMesh(this.landMesh);

    // Create matte material that uses vertex colors
    const material = new StandardMaterial('landMat', this.scene);
    material.specularColor = Color3.Black();
    material.diffuseColor = Color3.White(); // Let vertex colors show through
    material.backFaceCulling = false; // Show both sides

    this.landMesh.material = material;
  }

  /**
   * Create animated water plane
   */
  private createWaterMesh(): void {
    // Create ground with enough subdivisions for wave vertices
    const subdivisions = Math.floor(GRID_SIZE / 2); // ~25 segments
    this.seaMesh = MeshBuilder.CreateGround(
      'seaMesh',
      {
        width: GRID_SIZE,
        height: GRID_SIZE,
        subdivisions: subdivisions,
        updatable: true // Required for vertex animation
      },
      this.scene
    );

    // Position below land level
    // Water base at -0.55 ensures waves (max +0.6 amplitude) stay below land (min 0.1)
    this.seaMesh.position.x = GRID_SIZE / 2;
    this.seaMesh.position.z = GRID_SIZE / 2;
    this.seaMesh.position.y = -0.55;

    // Create unlit water material (fully opaque to hide base underneath)
    const waterMaterial = new StandardMaterial('waterMat', this.scene);
    waterMaterial.emissiveColor = new Color3(0.18, 0.45, 0.52); // Teal
    waterMaterial.diffuseColor = Color3.Black();
    waterMaterial.specularColor = Color3.Black();
    waterMaterial.alpha = 1.0; // Fully opaque - no dark base showing through
    waterMaterial.backFaceCulling = false;
    waterMaterial.disableLighting = true;

    this.seaMesh.material = waterMaterial;
    this.seaMesh.receiveShadows = false;

    // Register animation callback
    this.scene.registerBeforeRender(() => {
      this.animateWater(performance.now() / 1000);
    });
  }

  /**
   * Animate water vertices with sine waves for low-poly effect
   */
  private animateWater(time: number): void {
    if (!this.seaMesh) return;

    const positions = this.seaMesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;

    // Get mesh world position offset
    const offsetX = this.seaMesh.position.x;
    const offsetZ = this.seaMesh.position.z;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] + offsetX;
      const z = positions[i + 2] + offsetZ;

      // Enhanced wave formula with increased amplitude
      const primaryWave = Math.sin(x * 0.5 + time) * 0.3;
      const secondaryWave = Math.cos(z * 0.3 + time) * 0.3;
      const height = primaryWave + secondaryWave;

      positions[i + 1] = height; // Y coordinate
    }

    // Update mesh with new positions
    this.seaMesh.updateVerticesData(VertexBuffer.PositionKind, positions);

    // Skip normal recalculation - keeps smooth lighting without dark spots
  }

  /**
   * Create diorama base (pedestal)
   */
  private createDioramaBase(): void {
    this.baseMesh = MeshBuilder.CreateBox(
      'baseMesh',
      {
        width: GRID_SIZE + 2, // Slightly larger than land
        depth: GRID_SIZE + 2,
        height: 10
      },
      this.scene
    );

    // Position: top surface below lowest wave valley (water can dip to -1.15)
    this.baseMesh.position.x = GRID_SIZE / 2;
    this.baseMesh.position.z = GRID_SIZE / 2;
    this.baseMesh.position.y = -6.5; // Center of 10-height box at -6.5 means top at -1.5

    // Dark rock material
    const baseMaterial = new StandardMaterial('baseMat', this.scene);
    baseMaterial.diffuseColor = new Color3(0.15, 0.12, 0.1); // Dark brown/black
    baseMaterial.specularColor = Color3.Black();

    this.baseMesh.material = baseMaterial;
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

    // Position highlight above ground level (sand=0.15, rock=0.25)
    const tileType = this.getTileAt(gridX, gridZ);
    const groundY = tileType === 'rock' ? 0.25 : 0.15;

    this.highlightMesh.position = new Vector3(
      gridX * TILE_SIZE + TILE_SIZE / 2,
      groundY + 0.01, // Slightly above ground to prevent z-fighting
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
    this.landMesh?.dispose();
    this.seaMesh?.dispose();
    this.baseMesh?.dispose();
    this.highlightMesh?.dispose();
  }
}
