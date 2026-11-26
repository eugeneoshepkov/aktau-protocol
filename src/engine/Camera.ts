import { ArcRotateCamera, Vector3, Scene, Animation, EasingFunction, CubicEase, type AbstractMesh } from '@babylonjs/core';
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
  private home = Vector3.Zero();
  private beforeSight: { target: Vector3; alpha: number; beta: number; radius: number } | null = null;
  private walkSight: AbstractMesh | null = null;

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

    this.camera.attachControl(true, false, 0);
    this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

    this.camera.lowerRadiusLimit = MIN_ZOOM;
    this.camera.upperRadiusLimit = MAX_ZOOM;

    this.camera.lowerBetaLimit = ISOMETRIC_BETA;
    this.camera.upperBetaLimit = ISOMETRIC_BETA;

    this.camera.wheelDeltaPercentage = 0.015;
    this.camera.useNaturalPinchZoom = true;

    this.camera.panningAxis = new Vector3(1, 0, 1);
    scene.getEngine().onResizeObservable.add(() => {
      if (this.walkSight) this.fitSight(this.walkSight);
    });

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
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(normalizeKey(e.key));
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

    this.camera.panningSensibility = 110;
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
    const limit = GRID_SIZE * TILE_SIZE;
    const target = this.camera.target;
    // The historic waterfront continues ten units beyond the playable lots.
    const x = Math.max(0, Math.min(limit + 10, target.x));
    const z = Math.max(0, Math.min(limit, target.z));
    if (x !== target.x || z !== target.z) this.camera.setTarget(new Vector3(x, target.y, z));
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

  public setHome(target: Vector3): void {
    this.home.copyFrom(target);
    this.resetView();
  }

  private stopMotion(): void {
    this.scene.stopAnimation(this.camera);
    this.camera.inertialPanningX = this.camera.inertialPanningY = 0;
    this.camera.inertialAlphaOffset = this.camera.inertialBetaOffset = this.camera.inertialRadiusOffset = 0;
  }

  public visitSight(mesh: AbstractMesh): void {
    const camera = this.camera;
    this.beforeSight ??= {
      target: camera.target.clone(), alpha: camera.alpha, beta: camera.beta, radius: camera.radius
    };
    this.stopMotion();
    this.walkSight = mesh.metadata?.neighbourhood ? mesh : null;
    const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
    const height = maximum.y - minimum.y;
    camera.setTarget(new Vector3(mesh.position.x, mesh.position.y + height * 0.46, mesh.position.z));
    camera.alpha = ISOMETRIC_ALPHA - mesh.rotation.y;
    camera.beta = ISOMETRIC_BETA;
    this.fitSight(mesh);
  }

  private fitSight(mesh: AbstractMesh): void {
    const camera = this.camera;
    const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
    const span = Math.max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z);
    const canvas = this.scene.getEngine().getRenderingCanvas()!;
    const portrait = Math.max(1, 0.7 * canvas.clientHeight / Math.max(1, canvas.clientWidth));
    camera.radius = Math.max(MIN_ZOOM + 0.6, span * 2.35) * portrait;
    // The open album occupies the lower half of a phone. Project its subject above the paper.
    const phoneWalk = this.walkSight && canvas.clientHeight > canvas.clientWidth;
    camera.targetScreenOffset.y = phoneWalk ? camera.radius * Math.tan(camera.fov / 2) * 0.56 : 0;
  }

  public leaveSight(): void {
    const saved = this.beforeSight;
    if (!saved) return;
    this.stopMotion();
    this.camera.setTarget(saved.target);
    this.camera.alpha = saved.alpha;
    this.camera.beta = saved.beta;
    this.camera.radius = saved.radius;
    this.camera.targetScreenOffset.y = 0;
    this.walkSight = null;
    this.beforeSight = null;
  }

  public resetView(): void {
    this.stopMotion();
    this.camera.setTarget(this.home.clone());
    this.camera.alpha = ISOMETRIC_ALPHA;
    this.camera.beta = ISOMETRIC_BETA;
    const canvas = this.scene.getEngine().getRenderingCanvas()!;
    const portraitScale = Math.max(1, 0.62 * canvas.clientHeight / Math.max(canvas.clientWidth, 1));
    this.camera.radius = Math.min(MAX_ZOOM, DEFAULT_ZOOM * portraitScale);
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
