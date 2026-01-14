import { TILE_COLORS, GRID_SIZE, SEA_ROWS } from '../types';
import type { TileType } from '../types';

/**
 * Calculate the coastline Z position at a given X coordinate.
 * Creates a natural fractal shoreline using layered frequencies.
 * @param x - The x coordinate (0 to GRID_SIZE-1)
 * @returns The Z position of the coastline at this X
 */
export function getCoastlineZ(x: number): number {
  // Mix of frequencies creates a natural, jagged "fractal" shoreline
  const primaryWave = Math.sin(x * 0.1) * 4; // Large bays/peninsulas
  const secondaryWave = Math.sin(x * 0.4) * 1.5; // Medium variation
  const tertiaryWave = Math.cos(x * 1.3) * 0.5; // Fine detail/jaggedness
  return SEA_ROWS + primaryWave + secondaryWave + tertiaryWave;
}

/**
 * Determine tile type based on grid position
 * - Sea tiles based on organic coastline
 * - Random rock patches in sand areas
 * - Rest is sand
 */
export function getTileTypeAt(x: number, z: number): TileType {
  const coastlineZ = getCoastlineZ(x);

  // Sea tiles based on organic coastline
  if (z < coastlineZ) {
    return 'sea';
  }

  // Deterministic rock placement using simple hash
  // Creates scattered rock formations in the sand
  const hash = simpleHash(x, z);
  if (hash % 17 === 0 && z > coastlineZ + 2) {
    return 'rock';
  }

  return 'sand';
}

/**
 * Simple deterministic hash for procedural generation
 */
function simpleHash(x: number, z: number): number {
  let hash = x * 374761393 + z * 668265263;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  return Math.abs(hash);
}

/**
 * Parse hex color to RGB values (0-1 range)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 1, g: 1, b: 1 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

/**
 * Get color for tile type
 */
export function getTileColor(type: TileType): {
  r: number;
  g: number;
  b: number;
} {
  return hexToRgb(TILE_COLORS[type]);
}

/**
 * Generate the full tile map as a 2D array
 */
export function generateTileMap(): TileType[][] {
  const map: TileType[][] = [];
  for (let z = 0; z < GRID_SIZE; z++) {
    const row: TileType[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(getTileTypeAt(x, z));
    }
    map.push(row);
  }
  return map;
}
