import {
  ArcRotateCamera,
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

const sunsetSky = Color3.FromHexString('#e4ad91');
const eveningSky = Color3.FromHexString('#667993');
const sunsetSun = Color3.FromHexString('#ffb076');
const eveningSun = Color3.FromHexString('#9caccd');
const daylightFill = new Color3(0.93, 0.97, 1);
const eveningFill = Color3.FromHexString('#aab9e1');
const sunlitDust = Color3.FromHexString('#cba16e');
const eveningDust = Color3.FromHexString('#827069');
const clearFogStart = 35;
const clearFogEnd = 100;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private readonly skylight: HemisphericLight;
  private readonly sun: DirectionalLight;
  private season?: Season;
  private readonly daySky = new Color3();
  private readonly daySun = new Color3();
  private readonly dustColor = new Color3();
  private dust = 0;

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
    this.scene.fogColor = new Color3(0.67, 0.79, 0.76);
    this.scene.onBeforeCameraRenderObservable.add((camera) => {
      if (!this.dust || !(camera instanceof ArcRotateCamera)) return;
      // Keep the lot under the camera legible even when the player zooms far out.
      const radius = camera.radius;
      this.scene.fogStart = clearFogStart + (0.8 * radius - clearFogStart) * this.dust;
      this.scene.fogEnd = clearFogEnd + (radius + Math.max(7, 0.5 * radius) - clearFogEnd) * this.dust;
    });

    this.skylight = new HemisphericLight('skylight', Vector3.Up(), this.scene);
    this.skylight.groundColor = new Color3(0.43, 0.47, 0.5);

    const sun = new DirectionalLight('sunLight', new Vector3(-0.65, -1, 0.48), this.scene);
    this.sun = sun;
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
    this.setDaylight('spring', 0);

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  public setDaylight(season: Season, dusk: number, dust = 0): void {
    const light = seasonalLight[season];
    if (this.season !== season) {
      this.season = season;
      this.daySky.fromHexString(light.sky);
      this.daySun.fromHexString(light.sun);
    }
    const afterglow = 4 * dusk * (1 - dusk);
    const sky = this.scene.fogColor;
    Color3.LerpToRef(this.daySky, eveningSky, dusk, sky);
    Color3.LerpToRef(sky, sunsetSky, 0.82 * afterglow, sky);
    this.dust = dust;
    if (dust > 0) {
      Color3.LerpToRef(sunlitDust, eveningDust, dusk, this.dustColor);
      Color3.LerpToRef(sky, this.dustColor, 0.94 * dust, sky);
    } else {
      this.scene.fogStart = clearFogStart;
      this.scene.fogEnd = clearFogEnd;
    }
    this.scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    Color3.LerpToRef(daylightFill, eveningFill, dusk, this.skylight.diffuse);
    this.skylight.diffuse.b *= 1 - 0.12 * dust;
    this.skylight.intensity = 0.76 - 0.23 * dusk;
    Color3.LerpToRef(this.daySun, eveningSun, dusk, this.sun.diffuse);
    Color3.LerpToRef(this.sun.diffuse, sunsetSun, afterglow, this.sun.diffuse);
    this.sun.intensity = light.intensity * (1 - 0.82 * dusk) * (1 - 0.24 * dust);
    const elevation = light.elevation * (1 - dusk) + 0.44 * dusk;
    this.sun.direction.set(-0.65, -elevation, 0.48);
    // Keep even the low evening sun's shadow camera centred over the board.
    this.sun.position.set(25 + 26, 40 * elevation, 25 - 19.2);
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
