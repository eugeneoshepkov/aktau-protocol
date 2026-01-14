import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Observer,
  Vector3
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { getTileCenter } from '../grid/GridCoords';
import type { Building, BuildingType } from '../types';
import {
  PIPE_VISUAL_CONFIG,
  MAX_PIPE_DISTANCE,
  BUILDING_REQUIREMENTS
} from '../config/ConnectionRules';

interface PipeData {
  mesh: Mesh;
  type: 'water' | 'heat';
}

interface PreviewPipe {
  mesh: Mesh;
  type: 'water' | 'heat';
}

const PIPE_CONNECTIONS = PIPE_VISUAL_CONFIG;

export interface BuildingConnection {
  building: Building;
  type: 'water' | 'heat';
  direction: 'outgoing' | 'incoming';
}

export { PIPE_CONNECTIONS, MAX_PIPE_DISTANCE };

export class PipeManager {
  private scene: Scene;
  private pipes: Map<string, PipeData> = new Map();
  private previewPipes: PreviewPipe[] = [];
  private materials: Map<string, StandardMaterial> = new Map();
  private previewMaterials: Map<string, StandardMaterial> = new Map();
  private baseColors: Map<string, Color3> = new Map();
  private animationTime = 0;
  private renderObserver: Observer<Scene> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;

    this.createMaterial('water', '#2F8D8D');
    this.createMaterial('heat', '#FF6B35');
    this.createPreviewMaterial('water', '#2F8D8D');
    this.createPreviewMaterial('heat', '#FF6B35');

    gameState.on('buildingPlaced', () => this.rebuildPipes());
    gameState.on('buildingRemoved', () => this.rebuildPipes());

    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.animatePipes();
    });
  }

  private createMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_${name}`, this.scene);
    const c = this.hexToColor3(color);
    material.diffuseColor = c;
    material.emissiveColor = c.scale(0.3);
    material.alpha = 0.8;
    this.materials.set(name, material);
    this.baseColors.set(name, c);
  }

  private createPreviewMaterial(name: string, color: string): void {
    const material = new StandardMaterial(`pipe_preview_${name}`, this.scene);
    const c = this.hexToColor3(color);
    material.diffuseColor = c.scale(0.6);
    material.emissiveColor = c.scale(0.4);
    material.alpha = 0.4;
    this.previewMaterials.set(name, material);
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

  private animatePipes(): void {
    this.animationTime += this.scene.getEngine().getDeltaTime() / 1000;

    const waterPulse = (Math.sin(this.animationTime * Math.PI) + 1) / 2;
    const heatPulse = (Math.sin(this.animationTime * Math.PI * 1.5) + 1) / 2;

    const waterMat = this.materials.get('water');
    const heatMat = this.materials.get('heat');
    const waterBase = this.baseColors.get('water');
    const heatBase = this.baseColors.get('heat');

    if (waterMat && waterBase) {
      const minGlow = 0.2;
      const maxGlow = 0.6;
      const glow = minGlow + (maxGlow - minGlow) * waterPulse;
      waterMat.emissiveColor = waterBase.scale(glow);
    }

    if (heatMat && heatBase) {
      const minGlow = 0.3;
      const maxGlow = 0.8;
      const glow = minGlow + (maxGlow - minGlow) * heatPulse;
      heatMat.emissiveColor = heatBase.scale(glow);
    }
  }

  public update(): void {}

  public showConnectionPreview(buildingType: BuildingType, gridX: number, gridZ: number): void {
    this.hideConnectionPreview();

    const connections = PIPE_CONNECTIONS[buildingType];
    if (!connections || connections.length === 0) return;

    const buildings = gameState.getBuildings();
    const hoverPos = getTileCenter(gridX, gridZ);
    hoverPos.y = 0.3;

    for (const connRule of connections) {
      const targets = buildings.filter((b) => {
        if (!connRule.targets.includes(b.type)) return false;
        const dx = gridX - b.gridX;
        const dz = gridZ - b.gridZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist > 0 && dist <= MAX_PIPE_DISTANCE;
      });

      for (const target of targets) {
        this.createPreviewPipe(hoverPos, target, connRule.type);
      }
    }

    for (const [sourceType, rules] of Object.entries(PIPE_CONNECTIONS)) {
      for (const rule of rules) {
        if (!rule.targets.includes(buildingType)) continue;

        const sources = buildings.filter((b) => {
          if (b.type !== sourceType) return false;
          const dx = gridX - b.gridX;
          const dz = gridZ - b.gridZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });

        for (const source of sources) {
          this.createPreviewPipe(hoverPos, source, rule.type, true);
        }
      }
    }
  }

  public hideConnectionPreview(): void {
    for (const preview of this.previewPipes) {
      preview.mesh.dispose();
    }
    this.previewPipes = [];
  }

  private createPreviewPipe(
    hoverPos: { x: number; y: number; z: number },
    target: Building,
    type: 'water' | 'heat',
    incoming = false
  ): void {
    const targetPos = getTileCenter(target.gridX, target.gridZ);
    targetPos.y = 0.3;

    const startPos = incoming ? targetPos : hoverPos;
    const endPos = incoming ? hoverPos : targetPos;

    const direction = new Vector3(
      endPos.x - startPos.x,
      endPos.y - startPos.y,
      endPos.z - startPos.z
    );
    const length = direction.length();

    const segmentLength = 0.3;
    const gapLength = 0.2;
    const totalSegmentLength = segmentLength + gapLength;
    const numSegments = Math.floor(length / totalSegmentLength);

    for (let i = 0; i < numSegments; i++) {
      const t = (i * totalSegmentLength + segmentLength / 2) / length;
      const segmentCenter = new Vector3(
        startPos.x + direction.x * t,
        startPos.y + direction.y * t,
        startPos.z + direction.z * t
      );

      const pipe = MeshBuilder.CreateCylinder(
        `preview_pipe_${this.previewPipes.length}`,
        {
          height: segmentLength,
          diameter: 0.12,
          tessellation: 6
        },
        this.scene
      );

      pipe.position = segmentCenter;

      const angle = Math.atan2(direction.x, direction.z);
      pipe.rotation.x = Math.PI / 2;
      pipe.rotation.z = -angle;

      pipe.material = this.previewMaterials.get(type) ?? null;

      this.previewPipes.push({ mesh: pipe, type });
    }
  }

  public rebuildPipes(): void {
    for (const pipeData of this.pipes.values()) {
      pipeData.mesh.dispose();
    }
    this.pipes.clear();

    const buildings = gameState.getBuildings();

    for (const building of buildings) {
      const connections = PIPE_CONNECTIONS[building.type];
      if (!connections || connections.length === 0) continue;

      for (const connRule of connections) {
        const targets = buildings.filter((b) => {
          if (!connRule.targets.includes(b.type)) return false;
          const dist = this.getDistance(building, b);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });

        if (targets.length > 0) {
          const nearest = targets.reduce((a, b) =>
            this.getDistance(building, a) < this.getDistance(building, b) ? a : b
          );
          this.createPipe(building, nearest, connRule.type);
        }
      }
    }
  }

  private getDistance(a: Building, b: Building): number {
    const dx = a.gridX - b.gridX;
    const dz = a.gridZ - b.gridZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private createPipe(from: Building, to: Building, type: 'water' | 'heat'): void {
    const pipeId = `pipe_${from.id}_${to.id}`;

    if (this.pipes.has(pipeId) || this.pipes.has(`pipe_${to.id}_${from.id}`)) {
      return;
    }

    const startPos = getTileCenter(from.gridX, from.gridZ);
    const endPos = getTileCenter(to.gridX, to.gridZ);

    startPos.y = 0.3;
    endPos.y = 0.3;

    const direction = endPos.subtract(startPos);
    const length = direction.length();
    const center = startPos.add(direction.scale(0.5));

    const pipe = MeshBuilder.CreateCylinder(
      pipeId,
      {
        height: length,
        diameter: 0.15,
        tessellation: 8
      },
      this.scene
    );

    pipe.position = center;

    const angle = Math.atan2(direction.x, direction.z);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.z = -angle;

    pipe.material = this.materials.get(type) ?? null;

    this.pipes.set(pipeId, { mesh: pipe, type });
  }

  public getConnectionsForBuilding(building: Building): BuildingConnection[] {
    const connections: BuildingConnection[] = [];
    const buildings = gameState.getBuildings();

    const outgoingRules = PIPE_CONNECTIONS[building.type];
    if (outgoingRules) {
      for (const rule of outgoingRules) {
        const targets = buildings.filter((b) => {
          if (!rule.targets.includes(b.type)) return false;
          const dist = this.getDistance(building, b);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });
        if (targets.length > 0) {
          const nearest = targets.reduce((a, b) =>
            this.getDistance(building, a) < this.getDistance(building, b) ? a : b
          );
          connections.push({
            building: nearest,
            type: rule.type,
            direction: 'outgoing'
          });
        }
      }
    }

    for (const [sourceType, rules] of Object.entries(PIPE_CONNECTIONS)) {
      for (const rule of rules) {
        if (!rule.targets.includes(building.type)) continue;

        const sources = buildings.filter((b) => {
          if (b.type !== sourceType) return false;
          const dist = this.getDistance(building, b);
          return dist > 0 && dist <= MAX_PIPE_DISTANCE;
        });

        if (sources.length > 0) {
          const nearest = sources.reduce((a, b) =>
            this.getDistance(building, a) < this.getDistance(building, b) ? a : b
          );
          connections.push({
            building: nearest,
            type: rule.type,
            direction: 'incoming'
          });
        }
      }
    }

    return connections;
  }

  public isConnectedToReactor(building: Building): boolean {
    const connections = this.getConnectionsForBuilding(building);
    return connections.some((c) => c.building.type === 'reactor' && c.direction === 'incoming');
  }

  /**
   * Check if a water_tank has a valid supply chain back to a primary water source
   * (pump for seawater, distiller for freshwater)
   */
  private hasWaterSupplyChain(tank: Building, visited: Set<string> = new Set()): boolean {
    if (visited.has(tank.id)) return false; // Prevent infinite loops
    visited.add(tank.id);

    const connections = this.getConnectionsForBuilding(tank);
    const incomingWater = connections.filter(
      (c) => c.direction === 'incoming' && c.type === 'water'
    );

    for (const conn of incomingWater) {
      // Primary sources - direct supply
      if (conn.building.type === 'pump' || conn.building.type === 'distiller') {
        return true;
      }
      // Relay through another tank - recursive check
      if (conn.building.type === 'water_tank') {
        if (this.hasWaterSupplyChain(conn.building, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  public isFullyOperational(building: Building): boolean {
    const requirements = BUILDING_REQUIREMENTS[building.type];
    if (!requirements || requirements.requiredInputs.length === 0) {
      return true;
    }

    const connections = this.getConnectionsForBuilding(building);
    const incomingConnections = connections.filter((c) => c.direction === 'incoming');

    // Group requirements by resourceType - need at least ONE provider for each resourceType
    const resourceTypes = new Set(requirements.requiredInputs.map((r) => r.resourceType));

    for (const resourceType of resourceTypes) {
      // Get all building types that can provide this resource
      const providers = requirements.requiredInputs
        .filter((r) => r.resourceType === resourceType)
        .map((r) => r.type);

      let hasProvider = false;

      // Check direct connections
      for (const conn of incomingConnections) {
        if (conn.type !== resourceType) continue;

        // Direct connection from a primary source
        if (providers.includes(conn.building.type) && conn.building.type !== 'water_tank') {
          hasProvider = true;
          break;
        }

        // Water tank relay - check if tank has valid supply chain
        if (conn.building.type === 'water_tank' && resourceType === 'water') {
          if (this.hasWaterSupplyChain(conn.building)) {
            hasProvider = true;
            break;
          }
        }
      }

      if (!hasProvider) {
        return false;
      }
    }

    return true;
  }

  public getMissingConnections(
    building: Building
  ): { type: BuildingType; resourceType: 'water' | 'heat' }[] {
    const requirements = BUILDING_REQUIREMENTS[building.type];
    if (!requirements || requirements.requiredInputs.length === 0) {
      return [];
    }

    const connections = this.getConnectionsForBuilding(building);
    const incomingConnections = connections.filter((c) => c.direction === 'incoming');
    const missing: { type: BuildingType; resourceType: 'water' | 'heat' }[] = [];

    // Group requirements by resourceType
    const resourceTypes = new Set(requirements.requiredInputs.map((r) => r.resourceType));

    for (const resourceType of resourceTypes) {
      // Get all building types that can provide this resource
      const providers = requirements.requiredInputs
        .filter((r) => r.resourceType === resourceType)
        .map((r) => r.type);

      let hasProvider = false;

      // Check direct connections and relay chains
      for (const conn of incomingConnections) {
        if (conn.type !== resourceType) continue;

        // Direct connection from a primary source
        if (providers.includes(conn.building.type) && conn.building.type !== 'water_tank') {
          hasProvider = true;
          break;
        }

        // Water tank relay - check if tank has valid supply chain
        if (conn.building.type === 'water_tank' && resourceType === 'water') {
          if (this.hasWaterSupplyChain(conn.building)) {
            hasProvider = true;
            break;
          }
        }
      }

      if (!hasProvider) {
        // Return the first provider type as the missing one (for display purposes)
        missing.push({ type: providers[0], resourceType });
      }
    }

    return missing;
  }

  public dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
    }
    this.hideConnectionPreview();
    for (const pipeData of this.pipes.values()) {
      pipeData.mesh.dispose();
    }
    this.pipes.clear();
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
    for (const mat of this.previewMaterials.values()) {
      mat.dispose();
    }
    this.previewMaterials.clear();
  }
}
