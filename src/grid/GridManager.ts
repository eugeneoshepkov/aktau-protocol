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
import { generateTileMap, getCoastlineZ } from './TileTypes';
import type { Season } from '../simulation/GameState';
import { seasonalCoast } from '../engine/Seasons';

const LAND_Y = 0.15;
const SEA_Y = -0.04;

function shoreAt(x: number): number {
  // TileTypes classifies tile centers. Keep the drawn shoreline on the same sample.
  return getCoastlineZ(x - 0.5) + 0.5;
}

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

    const warmSand = Color3.FromHexString('#d9c6a4');
    const beach = Color3.FromHexString('#e4d3ae');
    const steppe = Color3.FromHexString('#baa98a');
    for (let col = 0; col < columns.length - 1; col++) {
      const left = columns[col],
        right = columns[col + 1];
      const leftShore = shoreAt(left),
        rightShore = shoreAt(right);
      for (let row = 0; row < rows.length - 1; row++) {
        const bottom = rows[row],
          top = rows[row + 1];
        if (top < Math.min(leftShore, rightShore)) continue;
        const ix = Math.floor(left),
          iz = Math.floor(bottom);
        const inside = this.isInBounds(ix, iz);
        const tone = inside ? warmSand : steppe;
        const fleck = Math.sin(ix * 32.617 + iz * 78.23) * 1364.56;
        const variation = 0.98 + (fleck - Math.floor(fleck)) * 0.032;
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
          const color = Color3.Lerp(beach, tone, Math.min(1, distance / 2.5));
          positions.push(x * TILE_SIZE, y, wz * TILE_SIZE);
          colors.push(color.r * variation, color.g * variation, color.b * variation, 1);
          uvs.push(x / 4, wz / 4);
        }
        indices.push(index, index + 2, index + 1, index + 2, index + 3, index + 1);
      }
    }
    const data = new VertexData();
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    Object.assign(data, { positions, normals, colors, uvs, indices });
    const mesh = new Mesh('landMesh', this.scene);
    data.applyToMesh(mesh);
    this.dryGround = Float32Array.from(colors);
    const mat = new StandardMaterial('steppe limestone', this.scene);
    mat.specularColor = Color3.Black();
    mat.diffuseTexture = this.createSurveyTexture();
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  private createSurveyTexture(): DynamicTexture {
    const texture = new DynamicTexture(
      'land survey',
      256,
      this.scene,
      true,
      Texture.TRILINEAR_SAMPLINGMODE
    );
    const ctx = texture.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    // Fine grain and small crosses give players a grid without obscuring the sand.
    let seed = 1963;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    ctx.fillStyle = 'rgba(99,84,65,.12)';
    for (let n = 0; n < 2600; n++)
      ctx.fillRect(random() * 256, random() * 256, 0.6 + random() * 1.4, 0.7);
    for (let x = 0; x <= 256; x += 64) {
      for (let z = 0; z <= 256; z += 64) {
        ctx.fillStyle = 'rgba(81,73,61,.28)';
        ctx.fillRect(x - 2.7, z - 0.55, 5.4, 1.1);
        ctx.fillRect(x - 0.55, z - 2.7, 1.1, 5.4);
      }
    }
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.update();
    return texture;
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
    const snow = Color3.FromHexString('#e1e9e7');
    for (let i = 0, c = 0; i < positions.length; i += 3, c += 4) {
      const x = positions[i],
        z = positions[i + 2];
      colors[c] *= sand.r / (217 / 255);
      colors[c + 1] *= sand.g / (198 / 255);
      colors[c + 2] *= sand.b / (164 / 255);
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
    this.highlight?.dispose(false, true);
  }
}
