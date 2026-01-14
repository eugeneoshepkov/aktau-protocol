import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Observer,
  TransformNode,
  Animation,
  EasingFunction,
  BackEase
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { GridManager } from '../grid/GridManager';
import { getTileCenter } from '../grid/GridCoords';
import { assetManager } from './AssetManager';
import { feedbackManager } from '../ui/FeedbackManager';
import { soundManager } from './SoundManager';
import type { Building, BuildingType } from '../types';
import type { ParticleManager } from '../effects/ParticleManager';

// Ground level offset - buildings sit on top of terrain
const GROUND_LEVEL = 0.15;

interface AnimatedBuilding {
  mesh: Mesh | TransformNode;
  type: BuildingType;
  baseY: number;
  phase: number;
}

export class BuildingManager {
  private scene: Scene;
  private gridManager: GridManager;
  private particleManager: ParticleManager | null = null;
  private meshes: Map<string, Mesh | TransformNode> = new Map();
  private animatedBuildings: Map<string, AnimatedBuilding> = new Map();
  private materials: Map<string, StandardMaterial> = new Map();
  private renderObserver: Observer<Scene> | null = null;
  private animationTime = 0;

  private selectedBuildingType: BuildingType | null = null;
  private onSelectionChangeCallback: ((type: BuildingType | null) => void) | null = null;

  constructor(scene: Scene, gridManager: GridManager) {
    this.scene = scene;
    this.gridManager = gridManager;

    this.createMaterials();

    gameState.on('buildingPlaced', (data) => this.onBuildingPlaced(data as Building));
    gameState.on('buildingRemoved', (data) => this.onBuildingRemoved(data as Building));

    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.animateBuildings();
    });
  }

  public setParticleManager(pm: ParticleManager): void {
    this.particleManager = pm;
  }

  private animateBuildings(): void {
    this.animationTime += this.scene.getEngine().getDeltaTime() / 1000;
    const reactorTemp = gameState.getReactorState().temperature;

    for (const [, anim] of this.animatedBuildings) {
      if (anim.type === 'reactor') {
        if (anim.mesh instanceof Mesh && anim.mesh.material instanceof StandardMaterial) {
          const mat = anim.mesh.material;
          const glow = 0.3 + (reactorTemp / 100) * 0.7;
          const pulse = Math.sin(this.animationTime * 4 + anim.phase) * 0.1 * (reactorTemp / 100);
          mat.emissiveColor.set(glow + pulse, (glow + pulse) * 0.4, 0);
        }
      } else if (anim.type === 'distiller') {
        anim.mesh.scaling.y = 1 + Math.sin(this.animationTime * 2 + anim.phase) * 0.02;
      }
    }
  }

  private createMaterials(): void {
    const buildingTypes: BuildingType[] = [
      'pump',
      'reactor',
      'distiller',
      'microrayon',
      'water_tank'
    ];

    for (const type of buildingTypes) {
      const primitive = assetManager.getBuildingPrimitive(type);
      const material = new StandardMaterial(`mat_building_${type}`, this.scene);
      const color = this.hexToColor3(primitive.color);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.2, 0.2, 0.2);
      if (type === 'reactor') {
        material.emissiveColor = new Color3(0.3, 0.1, 0);
      }
      this.materials.set(type, material);
    }
  }

  private hexToColor3(hex: string): Color3 {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Color3(1, 1, 1);
    return new Color3(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    );
  }

  public selectBuildingType(type: BuildingType | null): void {
    this.selectedBuildingType = type;
    console.log(`Selected building: ${type ?? 'none'}`);
    this.onSelectionChangeCallback?.(type);
  }

  public onSelectionChange(callback: (type: BuildingType | null) => void): void {
    this.onSelectionChangeCallback = callback;
  }

  public getSelectedBuildingType(): BuildingType | null {
    return this.selectedBuildingType;
  }

  public tryPlaceBuilding(gridX: number, gridZ: number): boolean {
    if (!this.selectedBuildingType) {
      console.log('No building type selected');
      return false;
    }

    const tileType = this.gridManager.getTileAt(gridX, gridZ);
    if (!tileType) {
      console.log('Invalid tile position');
      return false;
    }

    const check = gameState.canPlaceBuilding(this.selectedBuildingType, gridX, gridZ, tileType);

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

  public canPlaceAt(gridX: number, gridZ: number): boolean {
    if (!this.selectedBuildingType) return false;

    const tileType = this.gridManager.getTileAt(gridX, gridZ);
    if (!tileType) return false;

    return gameState.canPlaceBuilding(this.selectedBuildingType, gridX, gridZ, tileType).canPlace;
  }

  private playSquashStretchAnimation(node: Mesh | TransformNode): void {
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

  private onBuildingPlaced(building: Building): void {
    const position = getTileCenter(building.gridX, building.gridZ);

    if (this.particleManager) {
      this.particleManager.createDust(new Vector3(position.x, GROUND_LEVEL, position.z));
    }

    const buildingSounds: Record<
      BuildingType,
      keyof (typeof import('./SoundManager'))['soundManager'] extends never ? string : string
    > = {
      pump: 'pump',
      reactor: 'reactor',
      distiller: 'distiller',
      microrayon: 'microrayon',
      water_tank: 'water_tank',
      thermal_plant: 'reactor' // Use reactor sound for thermal plant
    };
    const sound = buildingSounds[building.type];
    if (sound) {
      soundManager.play(sound as 'pump' | 'reactor' | 'distiller' | 'microrayon' | 'water_tank');
    }

    if (assetManager.shouldUseModels()) {
      this.createBuildingFromModel(building, position);
    } else {
      this.createBuildingFromPrimitive(building, position);
    }
  }

  private createBuildingFromPrimitive(
    building: Building,
    position: { x: number; z: number }
  ): void {
    const primitive = assetManager.getBuildingPrimitive(building.type);

    let mesh: Mesh;

    if (primitive.type === 'cylinder') {
      mesh = MeshBuilder.CreateCylinder(
        `building_${building.id}`,
        {
          height: primitive.height,
          diameter: primitive.diameter ?? 1
        },
        this.scene
      );
    } else {
      mesh = MeshBuilder.CreateBox(
        `building_${building.id}`,
        {
          width: primitive.width ?? 1,
          height: primitive.height,
          depth: primitive.depth ?? 1
        },
        this.scene
      );
    }

    const baseY = primitive.height / 2 + GROUND_LEVEL;
    mesh.position = new Vector3(position.x, baseY, position.z);

    if (building.type === 'reactor') {
      const baseMat = this.materials.get(building.type) as StandardMaterial;
      const mat = baseMat.clone(`mat_${building.type}_${building.id}`);
      mesh.material = mat;
    } else {
      mesh.material = this.materials.get(building.type) ?? null;
    }

    this.meshes.set(building.id, mesh);

    this.playSquashStretchAnimation(mesh);

    const animTypes: BuildingType[] = ['reactor', 'distiller'];
    if (animTypes.includes(building.type)) {
      this.animatedBuildings.set(building.id, {
        mesh,
        type: building.type,
        baseY,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private async createBuildingFromModel(
    building: Building,
    position: { x: number; z: number }
  ): Promise<void> {
    if (assetManager.hasCompositeModel(building.type)) {
      await this.createCompositeModel(building, position);
      return;
    }

    let modelConfig = assetManager.getBuildingModel(building.type);

    if (assetManager.hasVariants(building.type)) {
      modelConfig = assetManager.getRandomVariant(building.type);
    }

    if (!modelConfig) {
      this.createBuildingFromPrimitive(building, position);
      return;
    }

    try {
      const meshes = await assetManager.loadModelFromConfig(modelConfig);

      if (!meshes || meshes.length === 0) {
        console.warn(`[BuildingManager] No meshes loaded for ${building.type}, using primitive`);
        this.createBuildingFromPrimitive(building, position);
        return;
      }

      const parent = new TransformNode(`building_${building.id}`, this.scene);
      parent.position = new Vector3(position.x, modelConfig.yOffset + GROUND_LEVEL, position.z);
      parent.scaling = new Vector3(modelConfig.scale, modelConfig.scale, modelConfig.scale);

      let rotation = modelConfig.rotation;
      if (building.type === 'microrayon') {
        rotation = Math.floor(Math.random() * 4) * (Math.PI / 2);
      }
      parent.rotation.y = rotation;

      for (const mesh of meshes) {
        mesh.parent = parent;
      }

      this.meshes.set(building.id, parent);

      this.playSquashStretchAnimation(parent);

      const animTypes: BuildingType[] = ['reactor', 'distiller'];
      if (animTypes.includes(building.type)) {
        this.animatedBuildings.set(building.id, {
          mesh: parent,
          type: building.type,
          baseY: modelConfig.yOffset,
          phase: Math.random() * Math.PI * 2
        });
      }
    } catch (error) {
      console.error(`[BuildingManager] Failed to load model for ${building.type}:`, error);
      this.createBuildingFromPrimitive(building, position);
    }
  }

  private async createCompositeModel(
    building: Building,
    position: { x: number; z: number }
  ): Promise<void> {
    const modelConfigs = assetManager.getBuildingModels(building.type);

    if (!modelConfigs || modelConfigs.length === 0) {
      this.createBuildingFromPrimitive(building, position);
      return;
    }

    const parent = new TransformNode(`building_${building.id}`, this.scene);
    parent.position = new Vector3(position.x, GROUND_LEVEL, position.z);

    try {
      for (const config of modelConfigs) {
        const meshes = await assetManager.loadModelFromConfig(config);

        if (!meshes || meshes.length === 0) continue;

        const subParent = new TransformNode(`${building.id}_part`, this.scene);
        subParent.parent = parent;

        const offset = config.offset ?? { x: 0, y: 0, z: 0 };
        subParent.position = new Vector3(offset.x, config.yOffset + offset.y, offset.z);
        subParent.scaling = new Vector3(config.scale, config.scale, config.scale);
        subParent.rotation.y = config.rotation;

        for (const mesh of meshes) {
          mesh.parent = subParent;
        }
      }

      this.meshes.set(building.id, parent);

      this.playSquashStretchAnimation(parent);

      const animTypes: BuildingType[] = ['reactor', 'distiller'];
      if (animTypes.includes(building.type)) {
        this.animatedBuildings.set(building.id, {
          mesh: parent,
          type: building.type,
          baseY: 0,
          phase: Math.random() * Math.PI * 2
        });
      }
    } catch (error) {
      console.error(
        `[BuildingManager] Failed to create composite model for ${building.type}:`,
        error
      );
      this.createBuildingFromPrimitive(building, position);
    }
  }

  private onBuildingRemoved(building: Building): void {
    const node = this.meshes.get(building.id);
    if (node) {
      if (node instanceof Mesh) {
        if (building.type === 'reactor' && node.material) {
          node.material.dispose();
        }
      }

      if (node instanceof TransformNode && !(node instanceof Mesh)) {
        const children = node.getChildMeshes();
        for (const child of children) {
          child.dispose();
        }
      }

      node.dispose();
      this.meshes.delete(building.id);
    }
    this.animatedBuildings.delete(building.id);
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
    }
    for (const node of this.meshes.values()) {
      if (node instanceof TransformNode && !(node instanceof Mesh)) {
        const children = node.getChildMeshes();
        for (const child of children) {
          child.dispose();
        }
      }
      node.dispose();
    }
    this.meshes.clear();
    this.animatedBuildings.clear();
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }
}
