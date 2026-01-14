import { Vector3 } from '@babylonjs/core';
import { TILE_SIZE, GRID_SIZE } from '../types';

export interface GridPosition {
  x: number;
  z: number;
}

/**
 * Convert grid coordinates to world position
 */
export function gridToWorld(gridX: number, gridZ: number): Vector3 {
  return new Vector3(gridX * TILE_SIZE + TILE_SIZE / 2, 0, gridZ * TILE_SIZE + TILE_SIZE / 2);
}

/**
 * Convert world position to grid coordinates
 */
export function worldToGrid(worldPos: Vector3): GridPosition {
  return {
    x: Math.floor(worldPos.x / TILE_SIZE),
    z: Math.floor(worldPos.z / TILE_SIZE)
  };
}

/**
 * Check if grid position is within bounds
 */
export function isValidGridPosition(x: number, z: number): boolean {
  return x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE;
}

/**
 * Get world position for tile center
 */
export function getTileCenter(gridX: number, gridZ: number): Vector3 {
  return new Vector3(gridX * TILE_SIZE + TILE_SIZE / 2, 0, gridZ * TILE_SIZE + TILE_SIZE / 2);
}
