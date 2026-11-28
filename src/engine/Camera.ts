import { ArcRotateCamera, ArcRotateCameraPointersInput, Plane, Vector3, Scene, Animation, EasingFunction, CubicEase, type AbstractMesh, type PointerTouch } from '@babylonjs/core';
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
// The historic waterfront continues east beyond the playable lots.
const waterfrontLimitX = GRID_SIZE * TILE_SIZE + 10;

export class MapPointers extends ArcRotateCameraPointersInput {
  private readonly ground = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());
  private previousAngle = 0;

  private groundAt(x: number, y: number): Vector3 | null {
    const ray = this.camera.getScene().createPickingRay(x, y, null, this.camera);
    const distance = ray.intersectsPlane(this.ground);
    return distance !== null && distance >= 0 ? ray.origin.add(ray.direction.scale(distance)) : null;
  }

  private moveGroundUnder(anchor: Vector3 | null, point: PointerTouch): void {
    const next = this.groundAt(point.x, point.y);
    if (anchor && next) this.camera.target.addInPlace(anchor.subtract(next));
  }

  override onTouch(point: PointerTouch | null, dx: number, dy: number): void {
    if (point?.type !== 'touch') return super.onTouch(point, dx, dy);
    this.moveGroundUnder(this.groundAt(point.x - dx, point.y - dy), point);
  }

  override onMultiTouch(
    a: PointerTouch | null, b: PointerTouch | null, previousDistanceSq: number, distanceSq: number,
    previousCenter: PointerTouch | null, center: PointerTouch | null
  ): void {
    if (!a || !b || !center || distanceSq < 1) return;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    if (previousCenter && previousDistanceSq >= 1) {
      const anchor = this.groundAt(previousCenter.x, previousCenter.y);
      const radius = this.camera.radius * Math.sqrt(previousDistanceSq / distanceSq);
      this.camera.radius = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, radius));
      this.camera.alpha += angle - this.previousAngle;
      this.moveGroundUnder(anchor, center);
    }
    this.previousAngle = angle;
  }
}

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
  private activeSight: AbstractMesh | null = null;
  private sightCard: HTMLElement | null = null;
  private readonly cardResize = new ResizeObserver(() => this.frameSightCard());

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

    this.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');
    this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    this.camera.inputs.removeByType('ArcRotateCameraPointersInput');
    this.camera.inputs.add(new MapPointers());
    this.camera.attachControl(true, false, 0);

    this.camera.lowerRadiusLimit = MIN_ZOOM;
    this.camera.upperRadiusLimit = MAX_ZOOM;

    this.camera.lowerBetaLimit = ISOMETRIC_BETA;
    this.camera.upperBetaLimit = ISOMETRIC_BETA;

    // Trackpads report small, frequent deltas and already supply their own scroll momentum.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      let pixelsPerUnit = 1;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) pixelsPerUnit = 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) pixelsPerUnit = canvas.clientHeight;
      const sensitivity = event.ctrlKey ? 0.015 : 0.0035;
      // Limit a single mouse-wheel notch while preserving fractional trackpad movement.
      const step = Math.max(-0.22, Math.min(0.22, event.deltaY * pixelsPerUnit * sensitivity));
      const radius = this.camera.radius * Math.exp(step);
      this.camera.radius = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, radius));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    this.camera.onDisposeObservable.addOnce(() => {
      canvas.removeEventListener('wheel', onWheel);
      this.cardResize.disconnect();
    });

    this.camera.panningAxis = new Vector3(1, 0, 1);
    scene.getEngine().onResizeObservable.add(() => {
      if (this.activeSight) this.fitSight(this.activeSight);
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
    const x = Math.max(0, Math.min(waterfrontLimitX, target.x));
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

  public visitSight(mesh: AbstractMesh, card: HTMLElement): void {
    const camera = this.camera;
    this.beforeSight ??= {
      target: camera.target.clone(), alpha: camera.alpha, beta: camera.beta, radius: camera.radius
    };
    this.stopMotion();
    this.activeSight = mesh;
    this.sightCard = card;
    this.cardResize.observe(card);
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
    this.frameSightCard();
  }

  private frameSightCard(): void {
    if (!this.sightCard) return;
    const canvas = this.scene.getEngine().getRenderingCanvas()!;
    const { clientWidth: width, clientHeight: height } = canvas;
    const card = this.sightCard.getBoundingClientRect();
    const unitsPerPixel = 2 * this.camera.radius * Math.tan(this.camera.fov / 2) / height;
    // Put the landmark halfway across the part of the canvas left open by the sheet.
    const beside = height <= 540 && width > height;
    const above = width <= 700 && !beside;
    this.camera.targetScreenOffset.set(
      beside ? card.right * 0.5 * unitsPerPixel : 0,
      above ? (height - card.top) * 0.5 * unitsPerPixel : 0
    );
  }

  public leaveSight(): void {
    const saved = this.beforeSight;
    if (!saved) return;
    this.stopMotion();
    this.camera.setTarget(saved.target);
    this.camera.alpha = saved.alpha;
    this.camera.beta = saved.beta;
    this.camera.radius = saved.radius;
    this.camera.targetScreenOffset.set(0, 0);
    this.activeSight = null;
    this.sightCard = null;
    this.cardResize.disconnect();
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

  public framePlacement(points: Vector3[]): void {
    const min = points[0].clone(), max = min.clone();
    for (const point of points) {
      min.minimizeInPlace(point);
      max.maximizeInPlace(point);
    }
    const center = Vector3.Center(min, max);
    // Leave room for the waterfront buildings and the placement controls at the bottom.
    const canvas = this.scene.getEngine().getRenderingCanvas()!;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const halfAngle = Math.atan(Math.tan(this.camera.fov / 2) * Math.min(0.84 * aspect, 0.57));
    const extent = Vector3.Distance(min, max) / 2 + 0.95;
    this.camera.radius = Math.min(MAX_ZOOM, Math.max(this.camera.radius, extent / Math.sin(halfAngle)));
    this.focusOn(center, 260);
  }

  public focusOn(target: Vector3, duration = 500, view?: { alpha: number; radius: number }): void {
    this.stopMotion();
    const camera = this.camera;
    const endX = Math.max(0, Math.min(waterfrontLimitX, target.x));
    const endZ = Math.max(0, Math.min(GRID_SIZE * TILE_SIZE, target.z));
    const frameRate = 60;
    const frames = Math.max(1, Math.round(duration * frameRate / 1000));
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    const move = (property: string, start: number, end: number) => {
      const animation = new Animation('focus-' + property, property, frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
      animation.setKeys([{ frame: 0, value: start }, { frame: frames, value: end }]);
      animation.setEasingFunction(ease);
      return animation;
    };
    camera.animations = [move('target.x', camera.target.x, endX), move('target.z', camera.target.z, endZ)];
    if (view) {
      const delta = view.alpha - camera.alpha;
      const turn = Math.atan2(Math.sin(delta), Math.cos(delta));
      camera.animations.push(move('alpha', camera.alpha, camera.alpha + turn));
      camera.animations.push(move('radius', camera.radius, Math.min(camera.radius, view.radius)));
    }
    this.scene.beginAnimation(camera, 0, frames, false);
  }
}

export function getCameraInstance(): IsometricCamera | null {
  return cameraInstance;
}
