import { Matrix, type Scene, Vector3 } from '@babylonjs/core';
import type { PipeType } from '../config/ResourceFlow';
import { getTileCenter } from '../grid/GridCoords';
import { LAND_Y } from '../grid/TileTypes';
import { t } from '../i18n';
import type { Building } from '../types';

export class PlacementCaption {
  private readonly scene: Scene;
  private readonly anchor: Vector3;
  private readonly point = Vector3.Zero();
  private readonly label?: HTMLDivElement;
  private readonly insetX: number = 0;
  private readonly insetY: number = 0;

  constructor(scene: Scene, building: Building, missing: PipeType[]) {
    this.scene = scene;
    this.anchor = getTileCenter(building.gridX, building.gridZ);
    const roof = scene.getMeshByName('building_' + building.id)?.getBoundingInfo().boundingBox
      .maximum.y;
    this.anchor.y = LAND_Y + (roof ?? 1) + 0.12;
    if (!scene.getEngine().getRenderingCanvas()) return;

    this.label = document.createElement('div');
    this.label.className = 'placement-caption';
    this.label.setAttribute('role', 'status');
    document.body.append(this.label);
    if (building.type === 'water_tank') {
      this.label.textContent = t('build.needsMain');
    } else if (missing.includes('heat') && missing.includes('water')) {
      this.label.textContent = t(
        building.type === 'distiller' ? 'build.needsSeawaterHeat' : 'build.needsFreshWaterHeat'
      );
    } else if (missing.includes('heat')) {
      this.label.textContent = t('build.preview.noHeat');
    } else {
      const key = building.type === 'distiller' ? 'build.preview.noSeawater' : 'build.preview.noFreshWater';
      this.label.textContent = t(key);
    }
    this.insetX = this.label.offsetWidth / 2 + 4;
    this.insetY = this.label.offsetHeight + 4;
  }

  public update(): void {
    const camera = this.scene.activeCamera;
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!this.label || !camera || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const view = camera.viewport.toGlobal(bounds.width, bounds.height);
    Vector3.ProjectToRef(
      this.anchor,
      Matrix.IdentityReadOnly,
      this.scene.getTransformMatrix(),
      view,
      this.point
    );
    const { x, y, z } = this.point;
    this.label.hidden = z < 0 || z > 1 || x < 0 || x > bounds.width || y < 0 || y > bounds.height;
    if (this.label.hidden) return;
    const left = bounds.left + Math.max(this.insetX, Math.min(x, bounds.width - this.insetX));
    const top = bounds.top + Math.max(this.insetY, y);
    this.label.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) translate(-50%, -100%)`;
  }

  public dispose(): void {
    this.label?.remove();
  }
}
