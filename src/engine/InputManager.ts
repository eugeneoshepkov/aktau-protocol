import { Scene, PointerEventTypes, Vector3, Plane, PointerInfo } from '@babylonjs/core';
import { GridManager } from '../grid/GridManager';
import { worldToGrid, isValidGridPosition } from '../grid/GridCoords';
import type { GridPosition } from '../grid/GridCoords';

export type TileClickCallback = (gridX: number, gridZ: number) => void;
export type TileHoverCallback = (gridX: number, gridZ: number) => void;
export type PointerLeaveCallback = () => void;

export class InputManager {
  private scene: Scene;
  private gridManager: GridManager;
  private groundPlane: Plane;

  private onTileClick: TileClickCallback | null = null;
  private onTileHover: TileHoverCallback | null = null;
  private onPointerLeave: PointerLeaveCallback | null = null;

  private lastHoveredTile: GridPosition | null = null;

  constructor(scene: Scene, gridManager: GridManager) {
    this.scene = scene;
    this.gridManager = gridManager;

    // Create a ground plane at y=0 for raycasting
    this.groundPlane = Plane.FromPositionAndNormal(
      Vector3.Zero(),
      Vector3.Up()
    );

    this.setupPointerEvents();
  }

  private setupPointerEvents(): void {
    this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERMOVE:
          this.handlePointerMove();
          break;
        case PointerEventTypes.POINTERPICK:
          this.handlePointerClick();
          break;
      }
    });
  }

  private getGridPositionFromPointer(): GridPosition | null {
    // Create picking ray from camera through mouse position
    const pickRay = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      null,
      this.scene.activeCamera
    );

    if (!pickRay) return null;

    // Calculate intersection with ground plane
    const distance = pickRay.intersectsPlane(this.groundPlane);
    if (distance === null || distance < 0) return null;

    const worldPos = pickRay.origin.add(pickRay.direction.scale(distance));
    const gridPos = worldToGrid(worldPos);

    // Check bounds
    if (!isValidGridPosition(gridPos.x, gridPos.z)) {
      return null;
    }

    return gridPos;
  }

  private handlePointerMove(): void {
    const gridPos = this.getGridPositionFromPointer();

    if (!gridPos) {
      if (this.lastHoveredTile !== null) {
        this.gridManager.hideHighlight();
        this.lastHoveredTile = null;
        if (this.onPointerLeave) this.onPointerLeave();
      }
      return;
    }

    // Check if we moved to a new tile
    if (
      this.lastHoveredTile === null ||
      this.lastHoveredTile.x !== gridPos.x ||
      this.lastHoveredTile.z !== gridPos.z
    ) {
      this.lastHoveredTile = gridPos;
      this.gridManager.showHighlight(gridPos.x, gridPos.z);

      if (this.onTileHover) {
        this.onTileHover(gridPos.x, gridPos.z);
      }
    }
  }

  private handlePointerClick(): void {
    const gridPos = this.getGridPositionFromPointer();

    if (!gridPos) return;

    // Log to console as per Sprint 1 requirements
    const tileType = this.gridManager.getTileAt(gridPos.x, gridPos.z);
    console.log(`Clicked tile at (${gridPos.x}, ${gridPos.z}) - Type: ${tileType}`);

    if (this.onTileClick) {
      this.onTileClick(gridPos.x, gridPos.z);
    }
  }

  /**
   * Register callback for tile clicks
   */
  public setTileClickCallback(callback: TileClickCallback): void {
    this.onTileClick = callback;
  }

  /**
   * Register callback for tile hovers
   */
  public setTileHoverCallback(callback: TileHoverCallback): void {
    this.onTileHover = callback;
  }

  /**
   * Register callback for when pointer leaves grid
   */
  public setPointerLeaveCallback(callback: PointerLeaveCallback): void {
    this.onPointerLeave = callback;
  }
}
