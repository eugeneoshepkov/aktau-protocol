import { Scene, PointerEventTypes, Vector3, Plane } from '@babylonjs/core';
import { GridManager } from '../grid/GridManager';
import { worldToGrid, isValidGridPosition } from '../grid/GridCoords';
import type { GridPosition } from '../grid/GridCoords';

type PointerPosition = Pick<PointerEvent, 'clientX' | 'clientY'>;
type TileCallback = (gridX: number, gridZ: number, pointer: PointerPosition) => void;

export class InputManager {
  private scene: Scene;
  private gridManager: GridManager;
  private isPlacing: () => boolean;
  private groundPlane = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());
  private onTileClick: TileCallback | null = null;
  private onTileHover: TileCallback | null = null;
  private onPointerLeave: (() => void) | null = null;
  private lastHoveredTile: GridPosition | null = null;

  constructor(scene: Scene, gridManager: GridManager, isPlacing: () => boolean) {
    this.scene = scene;
    this.gridManager = gridManager;
    this.isPlacing = isPlacing;

    scene.onPointerObservable.add(({ type, event }) => {
      if (type === PointerEventTypes.POINTERMOVE) {
        if ((event as PointerEvent).pointerType !== 'touch' && event.buttons === 0)
          this.hover(event);
      } else if (
        (type === PointerEventTypes.POINTERTAP || type === PointerEventTypes.POINTERDOUBLETAP) &&
        event.button === 0
      ) {
        const tile = this.resolveTile();
        if (tile) this.onTileClick?.(tile.x, tile.z, event);
        else this.clearHover();
      } else if (type === PointerEventTypes.POINTERDOWN) {
        this.clearHover();
      }
    });
    scene
      .getEngine()
      .getRenderingCanvas()
      ?.addEventListener('pointerleave', (event) => {
        // Touch devices dispatch pointerleave immediately after a tap. Keep the inspected card open.
        if (event.pointerType !== 'touch') this.clearHover();
      });
  }

  private resolveTile(): GridPosition | null {
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      null,
      this.scene.activeCamera
    );
    if (!this.isPlacing()) {
      const facade = this.scene.pickWithRay(ray, (mesh) => Boolean(mesh.metadata?.buildingId));
      const tile = facade?.pickedMesh?.metadata;
      if (tile) return { x: tile.gridX, z: tile.gridZ };
    }
    const distance = ray.intersectsPlane(this.groundPlane);
    if (distance === null || distance < 0) return null;
    const tile = worldToGrid(ray.origin.add(ray.direction.scale(distance)));
    return isValidGridPosition(tile.x, tile.z) ? tile : null;
  }

  private hover(pointer: PointerPosition): void {
    const tile = this.resolveTile();
    if (!tile) {
      if (this.lastHoveredTile) this.clearHover();
      return;
    }
    if (tile.x === this.lastHoveredTile?.x && tile.z === this.lastHoveredTile.z) return;
    this.lastHoveredTile = tile;
    this.gridManager.showHighlight(tile.x, tile.z);
    this.onTileHover?.(tile.x, tile.z, pointer);
  }

  private clearHover(): void {
    this.lastHoveredTile = null;
    this.gridManager.hideHighlight();
    this.onPointerLeave?.();
  }

  public setTileClickCallback(callback: TileCallback): void {
    this.onTileClick = callback;
  }

  public setTileHoverCallback(callback: TileCallback): void {
    this.onTileHover = callback;
  }

  public setPointerLeaveCallback(callback: () => void): void {
    this.onPointerLeave = callback;
  }
}
