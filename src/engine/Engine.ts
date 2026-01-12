import {
  Engine,
  Scene,
  HemisphericLight,
  Vector3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Animation,
  ParticleSystem,
  Texture
} from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../types';

const DUST_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA2klEQVQ4jZ2TMQ6CQBBF/wBegZ7CxsLGxlNYeAobL2DhBSy8gIW38QCewMZT2NjY0BB3nQm7LCz6ki/DzLz5M8suAHjvc5VwAHZ5E9A4TtLkKGGGmQDA1kVfqsQJZubunWYJQGkiZKhMPMfMAGBmBqCOYGmyANCKQm1cAGgVwdJSANwwM9TNQiQeANxyuZwBsE3TxOV5DgCYTCYL7/0GgJmmKQBgPB4DwGQ6nTpNE4/Ho4wxPgBgt9t1lDQcDvuaJgCA8XgMABiNRo79fs+ur+8BeL1e5WQy2eh1/AN/DvINL4Fo1HmPTNUAAAAASUVORK5CYII=';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private hemiLight!: HemisphericLight;
  private sunLight!: HemisphericLight;
  private ambientDust: ParticleSystem | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    this.canvas = canvas;

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.4, 0.6, 0.85, 1);

    this.setupLighting();
    this.setupSky();
    this.setupAmbientDust();
    this.preventBrowserZoom();

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private preventBrowserZoom(): void {
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  private setupLighting(): void {
    this.hemiLight = new HemisphericLight(
      'hemiLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.hemiLight.intensity = 0.9;
    this.hemiLight.groundColor.set(0.3, 0.3, 0.35);

    this.sunLight = new HemisphericLight(
      'sunLight',
      new Vector3(1, 1, -0.5),
      this.scene
    );
    this.sunLight.intensity = 0.4;
  }

  private setupSky(): void {
    const skybox = MeshBuilder.CreateBox('skyBox', { size: 500 }, this.scene);
    const skyMaterial = new StandardMaterial('skyMat', this.scene);

    skyMaterial.backFaceCulling = false;
    skyMaterial.disableLighting = true;

    skyMaterial.emissiveColor = new Color3(0.55, 0.75, 0.95);
    skyMaterial.diffuseColor = new Color3(0, 0, 0);
    skyMaterial.specularColor = new Color3(0, 0, 0);

    skybox.material = skyMaterial;
    skybox.infiniteDistance = true;
    skybox.renderingGroupId = 0;

    this.createClouds();
  }

  private setupAmbientDust(): void {
    const gridCenter = (GRID_SIZE * TILE_SIZE) / 2;
    const gridExtent = GRID_SIZE * TILE_SIZE;

    this.ambientDust = new ParticleSystem('ambientDust', 200, this.scene);

    this.ambientDust.particleTexture = new Texture(DUST_TEXTURE, this.scene);

    this.ambientDust.emitter = new Vector3(gridCenter, 5, gridCenter);

    this.ambientDust.minEmitBox = new Vector3(-gridExtent / 2, 0, -gridExtent / 2);
    this.ambientDust.maxEmitBox = new Vector3(gridExtent / 2, 15, gridExtent / 2);

    this.ambientDust.color1 = new Color4(0.85, 0.78, 0.6, 0.15);
    this.ambientDust.color2 = new Color4(0.9, 0.82, 0.65, 0.1);
    this.ambientDust.colorDead = new Color4(0.85, 0.75, 0.55, 0);

    this.ambientDust.minSize = 0.03;
    this.ambientDust.maxSize = 0.08;

    this.ambientDust.minLifeTime = 8;
    this.ambientDust.maxLifeTime = 15;

    this.ambientDust.emitRate = 15;

    this.ambientDust.direction1 = new Vector3(0.8, -0.1, 0.3);
    this.ambientDust.direction2 = new Vector3(1.2, 0.1, 0.5);

    this.ambientDust.minEmitPower = 0.3;
    this.ambientDust.maxEmitPower = 0.6;

    this.ambientDust.updateSpeed = 0.01;

    this.ambientDust.gravity = new Vector3(0.1, -0.02, 0.05);

    this.ambientDust.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    this.ambientDust.start();
  }

  private createClouds(): void {
    const cloudPositions = [
      { x: -80, y: 60, z: -50, scale: 1.2 },
      { x: 40, y: 55, z: -80, scale: 0.9 },
      { x: 100, y: 65, z: -30, scale: 1.0 },
      { x: -30, y: 70, z: 80, scale: 1.4 },
      { x: 80, y: 58, z: 60, scale: 0.8 },
      { x: -100, y: 62, z: 30, scale: 1.1 },
      { x: 20, y: 68, z: -100, scale: 1.0 },
      { x: -60, y: 55, z: -120, scale: 0.7 },
    ];

    const cloudMaterial = new StandardMaterial('cloudMat', this.scene);
    cloudMaterial.diffuseColor = new Color3(1, 1, 1);
    cloudMaterial.emissiveColor = new Color3(0.95, 0.95, 0.98);
    cloudMaterial.specularColor = new Color3(0, 0, 0);
    cloudMaterial.alpha = 0.85;
    cloudMaterial.backFaceCulling = false;

    cloudPositions.forEach((pos, i) => {
      const cloud = this.createCloudMesh(`cloud_${i}`, pos.scale);
      cloud.position = new Vector3(pos.x, pos.y, pos.z);
      cloud.material = cloudMaterial;
      cloud.renderingGroupId = 0;

      const anim = new Animation(
        `cloudAnim_${i}`,
        'position.x',
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );

      const startX = pos.x;
      const drift = 30 + Math.random() * 20;
      const duration = 600 + Math.random() * 400;

      anim.setKeys([
        { frame: 0, value: startX },
        { frame: duration / 2, value: startX + drift },
        { frame: duration, value: startX }
      ]);

      cloud.animations.push(anim);
      this.scene.beginAnimation(cloud, 0, duration, true);
    });
  }

  private createCloudMesh(name: string, scale: number) {
    const cloud = MeshBuilder.CreateSphere(name, {
      diameter: 20 * scale,
      segments: 8
    }, this.scene);

    const puff1 = MeshBuilder.CreateSphere(`${name}_puff1`, {
      diameter: 14 * scale,
      segments: 6
    }, this.scene);
    puff1.position = new Vector3(-8 * scale, 2 * scale, 0);
    puff1.parent = cloud;

    const puff2 = MeshBuilder.CreateSphere(`${name}_puff2`, {
      diameter: 16 * scale,
      segments: 6
    }, this.scene);
    puff2.position = new Vector3(7 * scale, 1 * scale, 3 * scale);
    puff2.parent = cloud;

    const puff3 = MeshBuilder.CreateSphere(`${name}_puff3`, {
      diameter: 12 * scale,
      segments: 6
    }, this.scene);
    puff3.position = new Vector3(0, 4 * scale, -4 * scale);
    puff3.parent = cloud;

    return cloud;
  }

  public updateDayNightCycle(_day: number): void {
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public dispose(): void {
    this.ambientDust?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
