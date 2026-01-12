import {
  Scene,
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
  AbstractMesh
} from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import { TILE_SIZE } from '../types';
import type { Building, BuildingType } from '../types';

interface BuildingParticles {
  buildingId: string;
  type: BuildingType;
  systems: ParticleSystem[];
}

const SMOKE_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIi8+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7kSLWoAAABe0lEQVRYhe2XMU7DQBBF/zgRFRUlR+ASHIIjcASOwBFyBKroKCgoE4mOgoqWgoKCfRTsrO2dfWPHCFL8aqXNzrz5M7veGQN/PqpWB2C7BHgFtv3aAfAMvALPVQf8bgDGhsV6xW0hzl2LtiKuW4CdyJ7VKN4r7trqCjvTsW+Ad+AduKs6oGkJrjvVCbyh7Ii7CvCBuBcgbbFTnQCz+B3inuqAhyXAdifA2FC8T4ALLq24o+IFuO3WbMEy/gR4BO6rDqhrAjwDN4g7BF6K9cVdqe6VuKc6YFyLOzesLM6dVNcVO0LcdupcifsW1HbiPqh7AOwT9+0ScG4J3o3E/WriHisOqGuBF5XgdUvwk0vA06rCugJYX1wC3O1UeUNx7hL8INYn7tqq4VVNcN1KOEnccetVxkHiTgmeBl8DnwMvPcG3ivVO3PXE3Tg4tuKuFDxfHHwVNe55JeC9SsCpJfhe1Y4S8FoJ8Oiq+MhSwKlVwJ0lcC/EvYvqruCrVYf8FfgCb/+SLoGHEdEAAAAASUVORK5CYII=';

const DUST_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA2klEQVQ4jZ2TMQ6CQBBF/wBegZ7CxsLGxlNYeAobL2DhBSy8gIW38QCewMZT2NjY0BB3nQm7LCz6ki/DzLz5M8suAHjvc5VwAHZ5E9A4TtLkKGGGmQDA1kVfqsQJZubunWYJQGkiZKhMPMfMAGBmBqCOYGmyANCKQm1cAGgVwdJSANwwM9TNQiQeANxyuZwBsE3TxOV5DgCYTCYL7/0GgJmmKQBgPB4DwGQ6nTpNE4/Ho4wxPgBgt9t1lDQcDvuaJgCA8XgMABiNRo79fs+ur+8BeL1e5WQy2eh1/AN/DvINL4Fo1HmPTNUAAAAASUVORK5CYII=';

export class ParticleManager {
  private scene: Scene;
  private particles: Map<string, BuildingParticles> = new Map();
  private dustSystems: ParticleSystem[] = [];
  private smokeTexture: Texture | null = null;
  private dustTexture: Texture | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.initTextures();

    gameState.on('buildingPlaced', (data) => this.onBuildingPlaced(data as Building));
    gameState.on('buildingRemoved', (data) => this.onBuildingRemoved(data as Building));
  }

  private initTextures(): void {
    this.smokeTexture = new Texture(SMOKE_TEXTURE, this.scene);
    this.dustTexture = new Texture(DUST_TEXTURE, this.scene);
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
        system.dispose();
      }
      this.particles.delete(building.id);
    }
  }

  public createSmoke(building: Building): void {
    const system = new ParticleSystem(`smoke_${building.id}`, 100, this.scene);

    system.particleTexture = this.smokeTexture;

    const height = 3.2;
    // Convert grid coordinates to world position
    system.emitter = new Vector3(
      building.gridX * TILE_SIZE + TILE_SIZE / 2,
      height,
      building.gridZ * TILE_SIZE + TILE_SIZE / 2
    );

    system.minEmitBox = new Vector3(-0.3, 0, -0.3);
    system.maxEmitBox = new Vector3(0.3, 0, 0.3);

    system.color1 = new Color4(0.25, 0.25, 0.28, 0.6);
    system.color2 = new Color4(0.35, 0.35, 0.38, 0.5);
    system.colorDead = new Color4(0.4, 0.4, 0.42, 0);

    system.minSize = 0.4;
    system.maxSize = 1.0;

    system.minLifeTime = 3;
    system.maxLifeTime = 5;

    system.emitRate = 8;

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

    system.particleTexture = this.smokeTexture;

    // Convert grid coordinates to world position
    system.emitter = new Vector3(
      building.gridX * TILE_SIZE + TILE_SIZE / 2,
      1.5,
      building.gridZ * TILE_SIZE + TILE_SIZE / 2
    );

    system.minEmitBox = new Vector3(-0.2, 0, -0.2);
    system.maxEmitBox = new Vector3(0.2, 0, 0.2);

    system.color1 = new Color4(1, 1, 1, 0.4);
    system.color2 = new Color4(0.95, 0.98, 1, 0.3);
    system.colorDead = new Color4(1, 1, 1, 0);

    system.minSize = 0.15;
    system.maxSize = 0.4;

    system.minLifeTime = 0.5;
    system.maxLifeTime = 1.2;

    system.emitRate = 15;

    system.direction1 = new Vector3(-0.1, 1.5, -0.1);
    system.direction2 = new Vector3(0.1, 2, 0.1);

    system.minEmitPower = 0.8;
    system.maxEmitPower = 1.2;

    system.updateSpeed = 0.02;

    system.gravity = new Vector3(0, 0.1, 0);

    system.blendMode = ParticleSystem.BLENDMODE_ADD;

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

    system.particleTexture = this.dustTexture;

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
    system.manualEmitCount = 40;

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
          system.emitRate = 8 + intensity * 25;
          system.minSize = 0.4 + intensity * 0.4;
          system.maxSize = 1.0 + intensity * 0.6;
          
          const alpha = 0.4 + intensity * 0.4;
          system.color1 = new Color4(0.25 + intensity * 0.15, 0.25, 0.28, alpha);
          system.color2 = new Color4(0.35 + intensity * 0.15, 0.30, 0.32, alpha * 0.8);
        }
      }
    }
  }

  public dispose(): void {
    for (const [, particles] of this.particles) {
      for (const system of particles.systems) {
        system.dispose();
      }
    }
    this.particles.clear();

    for (const system of this.dustSystems) {
      system.dispose();
    }
    this.dustSystems = [];

    this.smokeTexture?.dispose();
    this.dustTexture?.dispose();
  }
}
