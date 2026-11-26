import { GRID_SIZE, type BuildingType } from '../types';
import { gameState } from '../simulation/GameState';
import type { PipeManager } from '../managers/PipeManager';
import { isValidGridPosition, type GridPosition } from './GridCoords';
import { getTileTypeAt } from './TileTypes';

export function isBuildableLot(type: BuildingType, x: number, z: number): boolean {
  return isValidGridPosition(x, z) && gameState.canPlaceBuilding(type, x, z, getTileTypeAt(x, z), false).canPlace;
}

export function findSuitableLot(
  type: BuildingType,
  pipes: PipeManager,
  anchor: GridPosition,
  preferred: readonly [number, number][] = []
): GridPosition | null {
  return findBuildableLot(type, anchor, preferred, (x, z) => pipes.isSuitableLot(type, x, z));
}

export function findBuildableLot(
  type: BuildingType,
  anchor: GridPosition,
  preferred: readonly [number, number][],
  connects: (x: number, z: number) => boolean
): GridPosition | null {
  const suitable = (x: number, z: number) => isBuildableLot(type, x, z) && connects(x, z);
  for (const [x, z] of preferred) {
    if (suitable(x, z)) return { x, z };
  }

  const candidates: GridPosition[] = [];
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) candidates.push({ x, z });
  }
  const distance = (p: GridPosition) => (p.x - anchor.x) ** 2 + (p.z - anchor.z) ** 2;
  candidates.sort((a, b) => distance(a) - distance(b));
  return candidates.find(({ x, z }) => suitable(x, z)) ?? null;
}
