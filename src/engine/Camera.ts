import { ArcRotateCamera, Vector3, Scene, Animation, EasingFunction, CubicEase } from '@babylonjs/core';
import {
  ISOMETRIC_ALPHA,
  ISOMETRIC_BETA,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  GRID_SIZE,
  TILE_SIZE
} from '../types';
import { normalizeKey } from '../utils/keyboard';

let cameraInstance: IsometricCamera | null = null;

export class IsometricCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private keysPressed: Set<string> = new Set();
  private readonly PAN_SPEED = 0.4;
  private readonly ROTATION_SPEED = 0.03;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTime = 0;
  private originalTarget: Vector3 | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    cameraInstance = this;

    const gridCenter = new Vector3((GRID_SIZE * TILE_SIZE) / 2, 0, (GRID_SIZE * TILE_SIZE) / 2);

    this.camera = new ArcRotateCamera(
      'isometricCamera',
      ISOMETRIC_ALPHA,
      ISOMETRIC_BETA,
      DEFAULT_ZOOM,
      gridCenter,
      scene
    );

    this.camera.attachControl(canvas, true);

    this.camera.lowerRadiusLimit = MIN_ZOOM;
    this.camera.upperRadiusLimit = MAX_ZOOM;

    this.camera.lowerBetaLimit = ISOMETRIC_BETA;
    this.camera.upperBetaLimit = ISOMETRIC_BETA;

    this.camera.wheelPrecision = 3;

    this.camera.panningAxis = new Vector3(1, 0, 1);
    this.camera.panningSensibility = 50;
    this.camera._useCtrlForPanning = false;

    const shouldIgnoreKeyboard = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreKeyboard()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        this.keysPressed.clear();
        return;
      }

      const key = normalizeKey(e.key);
      this.keysPressed.add(key);

      if (e.key === 'Shift') {
        this.camera.panningSensibility = 50;
        this.camera.angularSensibilityX = Infinity;
        this.camera.angularSensibilityY = Infinity;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      this.keysPressed.delete(key);

      if (e.key === 'Shift') {
        this.camera.panningSensibility = Infinity;
        this.camera.angularSensibilityX = 500;
        this.camera.angularSensibilityY = 500;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    window.addEventListener('blur', () => {
      this.keysPressed.clear();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keysPressed.clear();
      }
    });

    canvas.addEventListener('click', () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    this.camera.panningSensibility = Infinity;
    this.camera.angularSensibilityX = 500;
    this.camera.angularSensibilityY = 500;

    scene.onBeforeRenderObservable.add(() => {
      this.processKeyboardInput();
      this.updateShake();
    });
  }

  private processKeyboardInput(): void {
    const target = this.camera.target.clone();

    let moved = false;

    // Screen-space directions based on camera rotation (for 2D-style panning)
    const alpha = this.camera.alpha;

    // Right vector on screen projected to XZ plane
    const rightX = Math.sin(alpha);
    const rightZ = -Math.cos(alpha);

    // Up vector on screen projected to XZ plane (perpendicular to right)
    const upX = -Math.cos(alpha);
    const upZ = -Math.sin(alpha);

    // WASD: Screen-space panning (like dragging)
    if (this.keysPressed.has('w')) {
      target.x += upX * this.PAN_SPEED;
      target.z += upZ * this.PAN_SPEED;
      moved = true;
    }
    if (this.keysPressed.has('s')) {
      target.x -= upX * this.PAN_SPEED;
      target.z -= upZ * this.PAN_SPEED;
      moved = true;
    }
    if (this.keysPressed.has('a')) {
      target.x -= rightX * this.PAN_SPEED;
      target.z -= rightZ * this.PAN_SPEED;
      moved = true;
    }
    if (this.keysPressed.has('d')) {
      target.x += rightX * this.PAN_SPEED;
      target.z += rightZ * this.PAN_SPEED;
      moved = true;
    }

    // Arrow keys: Use Babylon's panning system (identical to Shift+drag)
    const ARROW_PAN_SPEED = 0.15;

    if (this.keysPressed.has('arrowup')) {
      this.camera.inertialPanningY += ARROW_PAN_SPEED;
    }
    if (this.keysPressed.has('arrowdown')) {
      this.camera.inertialPanningY -= ARROW_PAN_SPEED;
    }
    if (this.keysPressed.has('arrowleft')) {
      this.camera.inertialPanningX -= ARROW_PAN_SPEED;
    }
    if (this.keysPressed.has('arrowright')) {
      this.camera.inertialPanningX += ARROW_PAN_SPEED;
    }

    // Clamp target to grid bounds
    const PADDING = 0;
    const worldSize = GRID_SIZE * TILE_SIZE;
    target.x = Math.max(-PADDING, Math.min(worldSize + PADDING, target.x));
    target.z = Math.max(-PADDING, Math.min(worldSize + PADDING, target.z));

    if (moved) {
      this.camera.setTarget(target);
    }

    // Also clamp after Babylon's internal panning (Shift+drag, arrow keys)
    this.clampCameraTarget();

    if (this.keysPressed.has('q')) {
      this.camera.alpha -= this.ROTATION_SPEED;
    }
    if (this.keysPressed.has('e')) {
      this.camera.alpha += this.ROTATION_SPEED;
    }
  }

  private clampCameraTarget(): void {
    const PADDING = 0;
    const worldSize = GRID_SIZE * TILE_SIZE;
    const target = this.camera.target;

    let needsClamp = false;
    let clampedX = target.x;
    let clampedZ = target.z;

    if (target.x < -PADDING) {
      clampedX = -PADDING;
      needsClamp = true;
    } else if (target.x > worldSize + PADDING) {
      clampedX = worldSize + PADDING;
      needsClamp = true;
    }

    if (target.z < -PADDING) {
      clampedZ = -PADDING;
      needsClamp = true;
    } else if (target.z > worldSize + PADDING) {
      clampedZ = worldSize + PADDING;
      needsClamp = true;
    }

    if (needsClamp) {
      this.camera.setTarget(new Vector3(clampedX, target.y, clampedZ));
    }
  }

  private updateShake(): void {
    if (this.shakeDuration <= 0) return;

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    this.shakeTime += deltaTime;

    if (this.shakeTime >= this.shakeDuration) {
      this.shakeDuration = 0;
      this.shakeTime = 0;
      if (this.originalTarget) {
        this.camera.setTarget(this.originalTarget);
        this.originalTarget = null;
      }
      return;
    }

    const progress = this.shakeTime / this.shakeDuration;
    const decay = 1 - progress;
    const intensity = this.shakeIntensity * decay;

    const offsetX = (Math.random() * 2 - 1) * intensity;
    const offsetZ = (Math.random() * 2 - 1) * intensity;

    if (this.originalTarget) {
      const shakeTarget = this.originalTarget.clone();
      shakeTarget.x += offsetX;
      shakeTarget.z += offsetZ;
      this.camera.setTarget(shakeTarget);
    }
  }

  public shake(intensity: number = 0.3, duration: number = 0.2): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = 0;
    this.originalTarget = this.camera.target.clone();
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public setTarget(target: Vector3): void {
    this.camera.setTarget(target);
  }

  public resetView(): void {
    const gridCenter = new Vector3((GRID_SIZE * TILE_SIZE) / 2, 0, (GRID_SIZE * TILE_SIZE) / 2);
    this.camera.setTarget(gridCenter);
    this.camera.alpha = ISOMETRIC_ALPHA;
    this.camera.beta = ISOMETRIC_BETA;
    this.camera.radius = DEFAULT_ZOOM;
  }

  public focusOn(target: Vector3, duration: number = 500): void {
    const startTarget = this.camera.target.clone();
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);

    // Clamp target to valid bounds
    const worldSize = GRID_SIZE * TILE_SIZE;
    const clampedX = Math.max(0, Math.min(worldSize, target.x));
    const clampedZ = Math.max(0, Math.min(worldSize, target.z));

    // Animate X
    const animX = new Animation('focusX', 'target.x', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    animX.setKeys([
      { frame: 0, value: startTarget.x },
      { frame: totalFrames, value: clampedX }
    ]);

    // Animate Z
    const animZ = new Animation('focusZ', 'target.z', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    animZ.setKeys([
      { frame: 0, value: startTarget.z },
      { frame: totalFrames, value: clampedZ }
    ]);

    // Add easing
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    animX.setEasingFunction(ease);
    animZ.setEasingFunction(ease);

    this.camera.animations = [animX, animZ];
    this.scene.beginAnimation(this.camera, 0, totalFrames, false);
  }
}

export function getCameraInstance(): IsometricCamera | null {
  return cameraInstance;
}
