import {
  Engine,
  Scene,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Vector3,
  Color4,
  Color3
} from '@babylonjs/core';
import { seasonalLight } from './Seasons';
import type { Season } from '../simulation/GameState';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
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
    this.scene.clearColor = new Color4(0.67, 0.79, 0.76, 1);
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogStart = 35;
    this.scene.fogEnd = 100;
    this.scene.fogColor = new Color3(0.67, 0.79, 0.76);

    this.setupLighting();

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupLighting(): void {
    const skylight = new HemisphericLight('skylight', Vector3.Up(), this.scene);
    skylight.intensity = 0.76;
    skylight.diffuse = new Color3(0.93, 0.97, 1);
    skylight.groundColor = new Color3(0.43, 0.47, 0.5);

    const sun = new DirectionalLight('sunLight', new Vector3(-0.65, -1, 0.48), this.scene);
    sun.position = new Vector3(51, 40, 5);
    sun.diffuse = new Color3(1, 0.92, 0.78);
    sun.intensity = 0.52;
    sun.shadowFrustumSize = 60;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 95;
    const shadowSize = window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048;
    const shadows = new ShadowGenerator(shadowSize, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
    shadows.bias = 0.0002;
    shadows.normalBias = 0.018;
    shadows.setDarkness(0.28);
  }

  public setSeason(season: Season): void {
    const light = seasonalLight[season];
    const sky = Color3.FromHexString(light.sky);
    this.scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    this.scene.fogColor.copyFrom(sky);
    const sun = this.scene.getLightByName('sunLight') as DirectionalLight;
    sun.diffuse = Color3.FromHexString(light.sun);
    sun.direction.set(-0.65, -light.elevation, 0.48);
    // Keep the shadow map centered over the board as the seasonal sun lowers.
    sun.position.set(25 + 26 / light.elevation, 40, 25 - 19.2 / light.elevation);
    sun.intensity = light.intensity;
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
    this.scene.dispose();
    this.engine.dispose();
  }
}
