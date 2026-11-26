import { Scene, ParticleSystem, Texture, Vector3, Color4, AbstractMesh } from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { TILE_SIZE, GRID_SIZE } from '../types';
import type { Building, BuildingType } from '../types';

interface BuildingParticles {
  buildingId: string;
  type: BuildingType;
  systems: ParticleSystem[];
}

export class ParticleManager {
  private scene: Scene;
  private particles: Map<string, BuildingParticles> = new Map();
  private dustSystems: ParticleSystem[] = [];
  private vaporTexture: Texture;
  private snowSystem: ParticleSystem | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.vaporTexture = new Texture('/pictures/vapor.png', scene);
    this.vaporTexture.hasAlpha = true;

    gameState.on('buildingPlaced', (data) => this.onBuildingPlaced(data as Building));
    gameState.on('buildingRemoved', (data) => this.onBuildingRemoved(data as Building));
  }

  private onBuildingPlaced(building: Building): void {
    if (building.type === 'distiller') {
      this.createSteam(building);
    } else if (building.type === 'reactor') {
      this.createSmoke(building);
    }
  }

  private onBuildingRemoved(building: Building): void {
    const particles = this.particles.get(building.id);
    if (particles) {
      for (const system of particles.systems) {
        system.dispose(false);
      }
      this.particles.delete(building.id);
    }
  }

  public createSmoke(building: Building): void {
    const system = new ParticleSystem(`smoke_${building.id}`, 100, this.scene);

    system.particleTexture = this.vaporTexture;

    // Stack outlet on the eastern side of the reactor hall.
    system.emitter = new Vector3(
      building.gridX * TILE_SIZE + TILE_SIZE / 2 + 0.59,
      2.70,
      building.gridZ * TILE_SIZE + TILE_SIZE / 2 - 0.48
    );

    system.minEmitBox = new Vector3(-0.045, 0, -0.045);
    system.maxEmitBox = new Vector3(0.045, 0, 0.045);

    system.color1 = new Color4(0.88, 0.86, 0.77, 0.36);
    system.color2 = new Color4(0.80, 0.82, 0.79, 0.25);
    system.colorDead = new Color4(0.4, 0.4, 0.42, 0);

    system.minSize = 0.12;
    system.maxSize = 0.32;

    system.minLifeTime = 1.7;
    system.maxLifeTime = 2.5;

    system.emitRate = 6;

    system.direction1 = new Vector3(-0.2, 1, -0.2);
    system.direction2 = new Vector3(0.2, 1.5, 0.2);

    system.minEmitPower = 0.2;
    system.maxEmitPower = 0.4;

    system.updateSpeed = 0.015;

    system.gravity = new Vector3(0.1, 0.08, 0);

    system.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    system.start();

    const existing = this.particles.get(building.id);
    if (existing) {
      existing.systems.push(system);
    } else {
      this.particles.set(building.id, {
        buildingId: building.id,
        type: building.type,
        systems: [system]
      });
    }
  }

  public createSteam(building: Building): void {
    const system = new ParticleSystem(`steam_${building.id}`, 80, this.scene);

    system.particleTexture = this.vaporTexture;

    // Convert grid coordinates to world position
    system.emitter = new Vector3(
      building.gridX * TILE_SIZE + TILE_SIZE / 2 - 0.51,
      1.31,
      building.gridZ * TILE_SIZE + TILE_SIZE / 2 + 0.23
    );

    system.minEmitBox = new Vector3(-0.04, 0, -0.04);
    system.maxEmitBox = new Vector3(0.04, 0, 0.04);

    system.color1 = new Color4(1, 1, 1, 0.4);
    system.color2 = new Color4(0.95, 0.98, 1, 0.3);
    system.colorDead = new Color4(1, 1, 1, 0);

    system.minSize = 0.14;
    system.maxSize = 0.28;

    system.minLifeTime = 0.5;
    system.maxLifeTime = 1.2;

    system.emitRate = 8;

    system.direction1 = new Vector3(-0.1, 1.5, -0.1);
    system.direction2 = new Vector3(0.1, 2, 0.1);

    system.minEmitPower = 0.8;
    system.maxEmitPower = 1.2;

    system.updateSpeed = 0.02;

    system.gravity = new Vector3(0, 0.1, 0);

    system.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    system.start();

    const existing = this.particles.get(building.id);
    if (existing) {
      existing.systems.push(system);
    } else {
      this.particles.set(building.id, {
        buildingId: building.id,
        type: building.type,
        systems: [system]
      });
    }
  }

  public createDust(position: Vector3, _mesh?: AbstractMesh): void {
    const system = new ParticleSystem('dust_burst', 60, this.scene);

    system.particleTexture = this.vaporTexture.clone();

    system.emitter = position.clone();
    system.emitter.y = 0.1;

    system.minEmitBox = new Vector3(-0.3, 0, -0.3);
    system.maxEmitBox = new Vector3(0.3, 0.1, 0.3);

    system.color1 = new Color4(0.85, 0.75, 0.55, 0.8);
    system.color2 = new Color4(0.75, 0.65, 0.45, 0.6);
    system.colorDead = new Color4(0.7, 0.6, 0.4, 0);

    system.minSize = 0.2;
    system.maxSize = 0.5;

    system.minLifeTime = 0.4;
    system.maxLifeTime = 0.8;

    system.emitRate = 0;
    system.manualEmitCount = 18;

    system.direction1 = new Vector3(-1, 0.5, -1);
    system.direction2 = new Vector3(1, 1.5, 1);

    system.minEmitPower = 1.5;
    system.maxEmitPower = 3;

    system.updateSpeed = 0.02;

    system.gravity = new Vector3(0, -4, 0);

    system.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    system.targetStopDuration = 0.3;
    system.disposeOnStop = true;

    system.start();

    this.dustSystems.push(system);
    setTimeout(() => {
      const idx = this.dustSystems.indexOf(system);
      if (idx !== -1) this.dustSystems.splice(idx, 1);
    }, 1500);
  }

  public updateReactorIntensity(): void {
    const temp = gameState.getReactorState().temperature;
    const intensity = Math.min(1, temp / 100);

    for (const [, particles] of this.particles) {
      if (particles.type === 'reactor') {
        for (const system of particles.systems) {
          system.emitRate = 6 + intensity * 7;
          system.minSize = 0.12 + intensity * 0.15;
          system.maxSize = 0.32 + intensity * 0.35;

          const density = 0.85 - intensity * 0.45;
          const alpha = 0.36 + intensity * 0.32;
          system.color1.set(density, density * 0.98, density * 0.91, alpha);
          system.color2.set(density, density, density * 0.96, alpha * 0.75);
        }
      }
    }
  }

  /**
   * Start snow particle effect for blizzard/arctic front events.
   * Creates a wide emitter covering the whole map with falling snow.
   */
  public startSnow(): void {
    // Already snowing
    if (this.snowSystem) return;

    const system = new ParticleSystem('snow', 600, this.scene);

    // Use smoke texture tinted white for snow particles
    system.particleTexture = this.vaporTexture;

    // Emitter covering the whole map from above
    const mapSize = GRID_SIZE * TILE_SIZE;
    const mapCenter = mapSize / 2;
    system.emitter = new Vector3(mapCenter, 15, mapCenter);

    // Wide emission area covering the grid
    system.minEmitBox = new Vector3(-mapCenter, 0, -mapCenter);
    system.maxEmitBox = new Vector3(mapCenter, 0, mapCenter);

    // White with slight blue tint for snow
    system.color1 = new Color4(1, 1, 1, 0.9);
    system.color2 = new Color4(0.9, 0.95, 1, 0.7);
    system.colorDead = new Color4(1, 1, 1, 0);

    // Small particles for snowflakes
    system.minSize = 0.08;
    system.maxSize = 0.15;

    system.minLifeTime = 3;
    system.maxLifeTime = 5;

    system.emitRate = 400;

    // Falling downward with diagonal drift (wind effect)
    system.direction1 = new Vector3(-0.3, -1, 0.1);
    system.direction2 = new Vector3(0.1, -1, 0.3);

    system.minEmitPower = 2;
    system.maxEmitPower = 4;

    system.updateSpeed = 0.01;

    // Slight gravity to ensure falling
    system.gravity = new Vector3(0.2, -0.5, 0.1);

    system.blendMode = ParticleSystem.BLENDMODE_ADD;

    system.start();
    this.snowSystem = system;
  }

  /**
   * Stop snow particle effect.
   */
  public stopSnow(): void {
    if (this.snowSystem) {
      this.snowSystem.stop();
      this.snowSystem.dispose(false);
      this.snowSystem = null;
    }
  }

  public dispose(): void {
    for (const [, particles] of this.particles) {
      for (const system of particles.systems) {
        system.dispose(false);
      }
    }
    this.particles.clear();

    for (const system of this.dustSystems) {
      system.dispose();
    }
    this.dustSystems = [];

    this.stopSnow();

    this.vaporTexture.dispose();
  }
}
