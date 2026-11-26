import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { GRID_SIZE, TILE_SIZE } from '../types';
import type { TileType } from '../types';
import { generateTileMap, shoreAt } from './TileTypes';
import { coastalGround, groundColor, STRAND_LENGTH, STRAND_WIDTH } from './CoastalGround';
import type { Season } from '../simulation/GameState';
import { seasonalCoast } from '../engine/Seasons';

const LAND_Y = 0.15;
const SEA_Y = -0.04;

const waterVertex = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 p;
  varying float depth;
  varying float distanceToCamera;
  void main() {
    p = position.xz;
    depth = uv.x;
    gl_Position = worldViewProjection * vec4(position, 1.0);
    distanceToCamera = gl_Position.w;
  }`;

const waterFragment = `
  precision highp float;
  varying vec2 p;
  varying float depth;
  varying float distanceToCamera;
  uniform float time;
  uniform float wind;
  uniform vec3 deep;
  uniform vec3 shallow;
  uniform vec3 horizon;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(27.61, 61.73))) * 4375.54); }
  void main() {
    float swell = time * wind;
    float sandbar = depth + 0.42 * sin(p.x * 1.4 + p.y * 1.6);
    vec3 color = mix(shallow, deep, smoothstep(-0.25, 6.2, sandbar));
    color += (0.011 + wind * 0.011) * sin(p.x * 0.8 + p.y * 2.4 + swell * 0.48) + 0.013 * sin(p.y * 0.6 - swell * 0.28);
    float wash = depth + (0.06 + wind * 0.04) * sin(2.1 * p.x + swell) + 0.05 * sin(4.0 * p.x);
    float foam = (1.0 - smoothstep(0.035, 0.11, abs(wash - 0.15)))
               + (1.0 - smoothstep(0.03, 0.085, abs(wash - 0.52))) * 0.42;
    color = mix(color, vec3(0.82, 0.87, 0.76), clamp(foam, 0.0, 0.85));
    // Small broken crests stretch parallel to the prevailing wind.
    vec2 cell = vec2(p.x * 1.25 + p.y * 0.7, p.y * 3.4);
    cell.x += 0.32 * sin(floor(cell.y) * 7.5 + swell * 0.5);
    float seed = hash(floor(cell));
    vec2 f = abs(fract(cell) - 0.5);
    float glint = (1.0 - smoothstep(0.04, 0.26, f.x)) * (1.0 - smoothstep(0.02, 0.085, f.y));
    color += glint * step(0.83 - wind * 0.12, seed) * (0.10 + 0.065 * wind + 0.07 * sin(seed * 17.0 + swell));
    float haze = smoothstep(35.0, 100.0, distanceToCamera);
    gl_FragColor = vec4(mix(color, horizon, haze), 1.0);
  }`;

export class GridManager {
  private scene: Scene;
  private tileMap: TileType[][] = [];
  private land: Mesh | null = null;
  private water: Mesh | null = null;
  private survey: Mesh | null = null;
  private dryGround: Float32Array | null = null;
  private highlight: Mesh | null = null;
  private highlightMaterial: StandardMaterial | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public generateGrid(): void {
    this.tileMap = generateTileMap();
    this.land = this.createLand();
    this.water = this.createWater();
    this.survey = this.createSurvey();

    this.highlight = MeshBuilder.CreateGround(
      'selection tile',
      { width: TILE_SIZE, height: TILE_SIZE },
      this.scene
    );
    this.highlight.isPickable = false;
    this.highlight.isVisible = false;
    this.highlightMaterial = new StandardMaterial('selection wash', this.scene);
    this.highlightMaterial.disableLighting = true;
    this.highlightMaterial.alpha = 0.42;
    this.highlight.material = this.highlightMaterial;
  }

  private createLand(): Mesh {
    const positions: number[] = [],
      colors: number[] = [],
      uvs: number[] = [],
      shorelineUVs: number[] = [],
      indices: number[] = [];
    // Smaller sections keep the waterline smooth, longer sections carry the
    // landscape to the horizon without drawing an edge around the city.
    const columns: number[] = [],
      rows: number[] = [];
    for (let x = -150; x < -5; x += 4) columns.push(x);
    for (let x = -5; x < GRID_SIZE + 6; x += 0.5) columns.push(x);
    for (let x = GRID_SIZE + 6; x <= 206; x += 4) columns.push(x);
    for (let z = 0; z <= GRID_SIZE + 1; z++) rows.push(z);
    for (let z = GRID_SIZE + 4; z < 206; z += 4) rows.push(z);

    for (let col = 0; col < columns.length - 1; col++) {
      const left = columns[col],
        right = columns[col + 1];
      const leftShore = shoreAt(left),
        rightShore = shoreAt(right);
      for (let row = 0; row < rows.length - 1; row++) {
        const bottom = rows[row],
          top = rows[row + 1];
        if (top < Math.min(leftShore, rightShore)) continue;
        const index = positions.length / 3;
        for (const [x, z, coast] of [
          [left, bottom, leftShore],
          [left, top, leftShore],
          [right, bottom, rightShore],
          [right, top, rightShore]
        ]) {
          const wz = Math.max(z, coast);
          const distance = Math.max(0, wz - coast);
          // The old town continues east on level ground before the steppe rises.
          const edge = Math.max(-x, x - GRID_SIZE - 10, wz - GRID_SIZE, 0);
          const hills = Math.min(1, edge / 18) * (1.2 + Math.sin(x * 0.22 + wz * 0.1)) ** 2;
          const y =
            SEA_Y +
            Math.min(1, distance / 0.47) * (LAND_Y - SEA_Y) +
            hills * Math.min(1, distance / 4);
          const color = groundColor(x, wz, distance);
          positions.push(x * TILE_SIZE, y, wz * TILE_SIZE);
          colors.push(color.r, color.g, color.b, 1);
          uvs.push(x / 8, wz / 8);
          shorelineUVs.push(x / STRAND_LENGTH, distance / STRAND_WIDTH);
        }
        indices.push(index, index + 2, index + 1, index + 2, index + 3, index + 1);
      }
    }
    const data = new VertexData();
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    Object.assign(data, { positions, normals, colors, uvs, uvs2: shorelineUVs, indices });
    const mesh = new Mesh('landMesh', this.scene);
    data.applyToMesh(mesh);
    this.dryGround = Float32Array.from(colors);
    mesh.material = coastalGround(this.scene);
    mesh.receiveShadows = true;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  private createSurvey(): Mesh {
    const positions: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    // One narrow strip of triangles follows the shoreline and ends at the construction boundary.
    for (let x = 0; x <= GRID_SIZE; x += 0.5) {
      const coast = shoreAt(x) + 0.47; // Start on level sand above the wash.
      const i = positions.length / 3;
      positions.push(
        x * TILE_SIZE,
        LAND_Y + 0.002,
        coast * TILE_SIZE,
        x * TILE_SIZE,
        LAND_Y + 0.002,
        GRID_SIZE * TILE_SIZE
      );
      uvs.push(x / 4, coast / 4, x / 4, GRID_SIZE / 4);
      if (i > 0) indices.push(i - 2, i, i - 1, i, i + 1, i - 1);
    }
    const mesh = new Mesh('construction survey', this.scene);
    const data = new VertexData();
    Object.assign(data, { positions, uvs, indices });
    data.applyToMesh(mesh);
    const crosses = new DynamicTexture(
      'survey crosses',
      256,
      this.scene,
      true,
      Texture.TRILINEAR_SAMPLINGMODE
    );
    const ctx = crosses.getContext();
    ctx.fillStyle = 'rgba(81,73,61,.28)';
    for (let x = 0; x <= 256; x += 64) {
      for (let z = 0; z <= 256; z += 64) {
        ctx.fillRect(x - 2.7, z - 0.55, 5.4, 1.1);
        ctx.fillRect(x - 0.55, z - 2.7, 1.1, 5.4);
      }
    }
    crosses.hasAlpha = true;
    crosses.wrapU = crosses.wrapV = Texture.WRAP_ADDRESSMODE;
    crosses.update();
    const material = new StandardMaterial('survey ink', this.scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.White();
    material.diffuseTexture = crosses;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.isVisible = false;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  public setSurveyVisible(visible: boolean): void {
    if (this.survey && this.survey.isVisible !== visible) this.survey.isVisible = visible;
  }

  private createWater(): Mesh {
    const mesh = new Mesh('seaMesh', this.scene);
    const positions: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let x = -150; x <= 206; x += 0.5) {
      const coast = shoreAt(x);
      const i = positions.length / 3;
      for (const z of [-180, coast + 0.35]) {
        positions.push(x * TILE_SIZE, SEA_Y, z * TILE_SIZE);
        uvs.push(coast - z, 0);
      }
      if (i > 0) indices.push(i - 2, i, i - 1, i, i + 1, i - 1);
    }
    const data = new VertexData();
    Object.assign(data, { positions, uvs, indices });
    data.applyToMesh(mesh);
    const mat = new ShaderMaterial(
      'Caspian water',
      this.scene,
      {
        vertexSource: waterVertex,
        fragmentSource: waterFragment
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'time', 'wind', 'deep', 'shallow', 'horizon']
      }
    );
    mat.backFaceCulling = false;
    mat.onBindObservable.add(() => mat.setFloat('time', performance.now() * 0.001));
    mesh.material = mat;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  public setSeason(season: Season): void {
    const climate = seasonalCoast[season];
    const water = this.water?.material as ShaderMaterial | undefined;
    water?.setColor3('deep', Color3.FromHexString(climate.deep));
    water?.setColor3('shallow', Color3.FromHexString(climate.shallows));
    water?.setColor3('horizon', this.scene.fogColor);
    water?.setFloat('wind', climate.wind);

    const positions = this.land?.getVerticesData(VertexBuffer.PositionKind);
    if (!this.dryGround || !positions || !this.land) return;
    const colors = new Float32Array(this.dryGround);
    const sand = Color3.FromHexString(climate.sand);
    const summer = Color3.FromHexString(seasonalCoast.summer.sand);
    const snow = Color3.FromHexString('#e1e9e7');
    for (let i = 0, c = 0; i < positions.length; i += 3, c += 4) {
      const x = positions[i],
        z = positions[i + 2];
      colors[c] *= sand.r / summer.r;
      colors[c + 1] *= sand.g / summer.g;
      colors[c + 2] *= sand.b / summer.b;
      if (season === 'winter') {
        // Wind scours the shore and leaves long, uneven drifts further inland.
        const ripple =
          Math.sin(x * 0.65 + z * 0.27 + Math.sin(z * 0.5)) + 0.67 * Math.cos(x * 0.39 - z * 0.71);
        const cover =
          Math.max(0, Math.min(0.98, 0.68 + 0.57 * ripple)) *
          Math.max(0, Math.min(1, (z - shoreAt(x)) / 1.8));
        colors[c] += (snow.r - colors[c]) * cover;
        colors[c + 1] += (snow.g - colors[c + 1]) * cover;
        colors[c + 2] += (snow.b - colors[c + 2]) * cover;
      }
    }
    this.land.setVerticesData(VertexBuffer.ColorKind, colors);
  }

  public showHighlight(gridX: number, gridZ: number, valid = true): void {
    if (!this.highlight || !this.highlightMaterial) return;
    const y = this.getTileAt(gridX, gridZ) === 'sea' ? SEA_Y : LAND_Y;
    this.highlight.position.set((gridX + 0.5) * TILE_SIZE, y + 0.025, (gridZ + 0.5) * TILE_SIZE);
    this.highlightMaterial.emissiveColor = Color3.FromHexString(valid ? '#8be3cc' : '#ed7158');
    this.highlight.isVisible = true;
  }

  public hideHighlight(): void {
    if (this.highlight) this.highlight.isVisible = false;
  }

  public getTileAt(gridX: number, gridZ: number): TileType | null {
    return this.isInBounds(gridX, gridZ) ? this.tileMap[gridZ][gridX] : null;
  }

  public isInBounds(gridX: number, gridZ: number): boolean {
    return gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE;
  }

  public dispose(): void {
    this.land?.dispose(false, true);
    this.water?.dispose(false, true);
    this.survey?.dispose(false, true);
    this.highlight?.dispose(false, true);
  }
}
