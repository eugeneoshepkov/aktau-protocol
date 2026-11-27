import {
  Scene,
  Mesh,
  StandardMaterial,
  Color3,
  Vector3,
  Animation,
  EasingFunction,
  BackEase
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { GridManager } from '../grid/GridManager';
import { getTileCenter, type GridPosition } from '../grid/GridCoords';
import { buildingQuarterTurns, CityModels } from '../models/CityModels';
import { decorManager } from './DecorManager';
import { feedbackManager } from '../ui/FeedbackManager';
import { soundManager } from './SoundManager';
import { BUILDING_COSTS, type Building, type BuildingType, type Resources } from '../types';
import type { ParticleManager } from '../effects/ParticleManager';
import { t, td } from '../i18n';

type PreviewState = 'valid' | 'invalid' | 'inefficient';

export class BuildingManager {
  private scene: Scene;
  private gridManager: GridManager;
  private particleManager: ParticleManager | null = null;
  private models: CityModels;
  private meshes = new Map<string, Mesh>();
  private civicMesh: Mesh | null = null;
  private highlightedBuildings = new Set<Mesh>();
  private highlightTimeout?: number;
  private selectedBuildingType: BuildingType | null = null;
  private onSelectionChangeCallback?: (type: BuildingType | null, lot?: GridPosition) => void;
  private demolishMode: boolean = false;
  private onDemolishModeChangeCallback: ((enabled: boolean) => void) | null = null;

  private ghostMesh: Mesh | null = null;
  private ghostStyle = '';
  private previewMaterials: Record<PreviewState, StandardMaterial>;

  constructor(scene: Scene, gridManager: GridManager) {
    this.scene = scene;
    this.gridManager = gridManager;
    this.models = CityModels.forScene(scene);
    this.previewMaterials = {
      valid: this.previewMaterial('valid', '#70deaa'),
      invalid: this.previewMaterial('invalid', '#f77559'),
      inefficient: this.previewMaterial('inefficient', '#e8be74')
    };
    gameState.on('buildingPlaced', this.handlePlacement);
    gameState.on('buildingRemoved', this.handleRemoval);
    gameState.on('civicProjectChange', this.syncCivicProject);
    this.syncCivicProject();
  }

  public setParticleManager(pm: ParticleManager): void {
    this.particleManager = pm;
  }

  private previewMaterial(state: PreviewState, color: string): StandardMaterial {
    const material = new StandardMaterial('preview-' + state, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor.scale(0.28);
    material.alpha = 0.64;
    return material;
  }

  private positionModel(mesh: Mesh, type: BuildingType, x: number, z: number) {
    const center = getTileCenter(x, z);
    mesh.position.set(center.x, 0.15, center.z);
    mesh.rotation.y = buildingQuarterTurns(type, x, z) * Math.PI / 2;
  }

  public showGhostPreview(
    type: BuildingType,
    x: number,
    z: number,
    canPlace: boolean,
    wouldBeOperational: boolean
  ): void {
    const variant = type === 'microrayon' ? (x * 5 + z) % 3 : 0;
    const style = type + variant;
    if (!this.ghostMesh || this.ghostStyle !== style) {
      this.hideGhostPreview();
      this.ghostMesh = this.models.create(type, 'preview-' + type, variant);
      this.ghostMesh.useVertexColors = false;
      this.ghostMesh.isPickable = false;
      this.ghostMesh.receiveShadows = false;
      this.ghostStyle = style;
    }
    this.positionModel(this.ghostMesh, type, x, z);
    this.ghostMesh.material =
      this.previewMaterials[!canPlace ? 'invalid' : wouldBeOperational ? 'valid' : 'inefficient'];
  }

  public hideGhostPreview(): void {
    this.ghostMesh?.dispose();
    this.ghostMesh = null;
    this.ghostStyle = '';
  }

  public selectBuildingType(type: BuildingType | null, lot?: GridPosition): void {
    this.selectedBuildingType = type;
    console.log(`Selected building: ${type ?? 'none'}`);
    this.onSelectionChangeCallback?.(type, lot);
  }

  public onSelectionChange(callback: (type: BuildingType | null, lot?: GridPosition) => void): void {
    this.onSelectionChangeCallback = callback;
  }

  public getSelectedBuildingType(): BuildingType | null {
    return this.selectedBuildingType;
  }

  public setDemolishMode(enabled: boolean): void {
    this.demolishMode = enabled;
    // Exit building selection when entering demolish mode
    if (enabled && this.selectedBuildingType) {
      this.selectBuildingType(null);
    }
    this.onDemolishModeChangeCallback?.(enabled);
  }

  public isDemolishMode(): boolean {
    return this.demolishMode;
  }

  public onDemolishModeChange(callback: (enabled: boolean) => void): void {
    this.onDemolishModeChangeCallback = callback;
  }

  public tryPlaceBuilding(gridX: number, gridZ: number): boolean {
    if (!this.selectedBuildingType) {
      console.log('No building type selected');
      return false;
    }

    const check = this.checkPlacement(gridX, gridZ);

    if (!check.canPlace) {
      console.log(`Cannot place building: ${check.reason}`);
      feedbackManager.showPlacementError(
        check.reason ?? 'Cannot place here',
        this.selectedBuildingType
      );
      soundManager.play('error');
      return false;
    }

    const building = gameState.placeBuilding(this.selectedBuildingType, gridX, gridZ);
    if (!building) {
      console.log('Failed to place building');
      return false;
    }

    console.log(`Placed ${this.selectedBuildingType} at (${gridX}, ${gridZ})`);
    return true;
  }

  public tryDemolishBuilding(gridX: number, gridZ: number): boolean {
    if (!this.demolishMode) {
      return false;
    }

    const building = gameState.getBuildingAt(gridX, gridZ);
    if (!building) {
      soundManager.play('error');
      return false;
    }

    // Cannot demolish the reactor
    if (building.type === 'reactor') {
      feedbackManager.showToast(t('build.demolish.reactor'), 'error');
      soundManager.play('error');
      return false;
    }

    // Calculate 50% refund of base cost
    const baseCost = BUILDING_COSTS[building.type];
    const refund: Partial<Resources> = {};
    for (const [resource, amount] of Object.entries(baseCost)) {
      if (amount) {
        refund[resource as keyof Resources] = Math.floor(amount * 0.5);
      }
    }

    // Apply refund
    gameState.addResources(refund);

    // Remove the building
    const success = gameState.removeBuilding(building.id);
    if (success) {
      const buildingName = td(`building.${building.type}.name`);
      feedbackManager.showToast(t('build.demolish.confirm', { building: buildingName }), 'success');
      soundManager.play('success');
      console.log(`Demolished ${building.type} at (${gridX}, ${gridZ}), refund:`, refund);
    }

    return success;
  }

  public checkPlacement(gridX: number, gridZ: number): { canPlace: boolean; reason?: string } {
    const tileType = this.gridManager.getTileAt(gridX, gridZ);
    if (!tileType || !this.selectedBuildingType) return { canPlace: false };
    return gameState.canPlaceBuilding(this.selectedBuildingType, gridX, gridZ, tileType);
  }

  private playSquashStretchAnimation(node: Mesh): void {
    const fps = 60;
    const duration = 18;

    const scaleXZ = new Animation(
      'squashStretchXZ',
      'scaling',
      fps,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const easing = new BackEase(0.3);
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

    scaleXZ.setKeys([
      { frame: 0, value: new Vector3(0, 0, 0) },
      { frame: 6, value: new Vector3(1.25, 0.8, 1.25) },
      { frame: 12, value: new Vector3(0.95, 1.1, 0.95) },
      { frame: duration, value: new Vector3(1, 1, 1) }
    ]);

    scaleXZ.setEasingFunction(easing);

    node.animations = [scaleXZ];
    this.scene.beginAnimation(node, 0, duration, false);
  }

  private handlePlacement = (data: unknown): void => {
    const building = data as Building;
    const { type, gridX, gridZ } = building;
    const mesh = this.models.create(type, 'building_' + building.id, gridX * 5 + gridZ);
    this.positionModel(mesh, type, gridX, gridZ);
    mesh.metadata = { buildingId: building.id, gridX, gridZ };
    const shadowMap = this.scene.getLightByName('sunLight')?.getShadowGenerator()?.getShadowMap();
    shadowMap?.renderList?.push(mesh);
    this.meshes.set(building.id, mesh);
    this.particleManager?.createDust(mesh.position.clone());
    soundManager.play(type === 'thermal_plant' ? 'reactor' : type);
    this.playSquashStretchAnimation(mesh);
  };

  private syncCivicProject = (): void => {
    this.civicMesh?.dispose();
    this.civicMesh = null;
    const project = gameState.getCivicProject();
    decorManager.setCivicFootprint(project);
    if (!project) return;

    const mesh = this.models.create(project.kind, 'civic-' + project.kind);
    const center = getTileCenter(project.gridX, project.gridZ);
    mesh.position.set(center.x, 0.15, center.z);
    mesh.isPickable = false;
    const shadowMap = this.scene.getLightByName('sunLight')?.getShadowGenerator()?.getShadowMap();
    shadowMap?.renderList?.push(mesh);
    this.civicMesh = mesh;
    this.playSquashStretchAnimation(mesh);
  };

  private handleRemoval = (data: unknown): void => {
    const { id } = data as Building;
    const mesh = this.meshes.get(id);
    if (!mesh) return;
    this.highlightedBuildings.delete(mesh);
    mesh.dispose();
    this.meshes.delete(id);
  };

  public highlightBuildings(buildings: Building[]): void {
    this.clearHighlights();
    for (const building of buildings) {
      const mesh = this.meshes.get(building.id);
      if (!mesh) continue;
      mesh.overlayColor.set(1, 0.73, 0.31);
      mesh.overlayAlpha = 0.52;
      mesh.renderOverlay = true;
      this.highlightedBuildings.add(mesh);
    }
    this.highlightTimeout = window.setTimeout(() => this.clearHighlights(), 3000);
  }

  private clearHighlights(): void {
    window.clearTimeout(this.highlightTimeout);
    for (const mesh of this.highlightedBuildings) mesh.renderOverlay = false;
    this.highlightedBuildings.clear();
  }

  public dispose(): void {
    gameState.off('buildingPlaced', this.handlePlacement);
    gameState.off('buildingRemoved', this.handleRemoval);
    gameState.off('civicProjectChange', this.syncCivicProject);
    this.civicMesh?.dispose();
    decorManager.setCivicFootprint(null);
    this.hideGhostPreview();
    this.clearHighlights();
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
    for (const material of Object.values(this.previewMaterials)) material.dispose();
  }
}
