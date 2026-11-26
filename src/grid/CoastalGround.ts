import { Color3, DynamicTexture, Scene, StandardMaterial, Texture } from '@babylonjs/core';

const shell = Color3.FromHexString('#e4d4b3');
const sand = Color3.FromHexString('#d9c49c');
const ochre = Color3.FromHexString('#c0aa83');

function smooth(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

// Continuous dry washes cross the construction boundary without exposing the shape of the board.
export function groundColor(x: number, z: number, distance: number): Color3 {
  const longRidge = Math.sin(x * 0.48 + z * 1.13 + 1.45 * Math.sin(z * 0.43 - x * 0.23));
  const wash = Math.sin(x * 0.31 - z * 0.22 + 0.8 * Math.cos(z * 0.47));
  const weathering = 0.44 * smooth(0.45 + 0.35 * longRidge + 0.27 * wash);
  return Color3.Lerp(shell, Color3.Lerp(sand, ochre, weathering), smooth((distance - 1.6) / 2.8));
}

// Horizontally repeating wrack line. Its second UV follows the actual waterline, with a plain
// white last row that clamps inland. The wind texture uses world coordinates independently.
export const STRAND_LENGTH = 16;
export const STRAND_WIDTH = 4;

export function coastalGround(scene: Scene): StandardMaterial {
  let seed = 1963;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const strand = new DynamicTexture(
    'shell grit and wet sand',
    { width: 1024, height: 256 },
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE
  );
  const ctx = strand.getContext() as CanvasRenderingContext2D;
  for (let x = 0; x < 1024; x++) {
    const angle = (x * 2 * Math.PI) / 1024;
    const damp = 0.88 + 0.17 * Math.sin(5 * angle) + 0.09 * Math.sin(8 * angle + 0.4);
    const wrack = 1.13 + 0.23 * Math.sin(2 * angle) + 0.14 * Math.cos(3 * angle + 1.2);
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#a99286');
    gradient.addColorStop((damp - 0.43) / STRAND_WIDTH, '#b8aca1');
    gradient.addColorStop(damp / STRAND_WIDTH, '#ede6da');
    gradient.addColorStop(Math.max(damp + 0.04, wrack) / STRAND_WIDTH, '#fefdfb');
    gradient.addColorStop((wrack + 0.5) / STRAND_WIDTH, '#eee8dd');
    gradient.addColorStop(0.89, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, 1, 256);
  }
  for (let group = 0; group < 100; group++) {
    const x = random() * 1024,
      angle = (x * 2 * Math.PI) / 1024;
    const y = (1.13 + 0.23 * Math.sin(2 * angle) + 0.14 * Math.cos(3 * angle + 1.2)) * 64;
    for (let n = 0; n < 22; n++) {
      const px = (x + (random() - 0.5) * 62 + 1024) % 1024;
      const py = y + (random() - 0.5) * 40,
        width = 0.8 + random() * 2.2;
      ctx.fillStyle = ['#fbf8ee', '#d1bfad', '#d9cbb6', '#c2b2a0'][n % 4];
      ctx.beginPath();
      ctx.ellipse(px, py, width, width * 0.49, random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  strand.coordinatesIndex = 1;
  strand.wrapU = Texture.WRAP_ADDRESSMODE;
  strand.wrapV = Texture.CLAMP_ADDRESSMODE;
  strand.update(false);

  const wind = new DynamicTexture(
    'wind-combed sand',
    512,
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE
  );
  const detail = wind.getContext() as CanvasRenderingContext2D;
  // Whole wave counts on each axis make the wind streaks tile continuously.
  const ripples = detail.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    const v = (y * Math.PI * 2) / 512;
    for (let x = 0; x < 512; x++) {
      const u = (x * Math.PI * 2) / 512;
      const bend = 0.55 * Math.sin(2 * u - v) + 0.4 * Math.cos(v) + 0.2 * Math.sin(3 * u + v);
      const ridge = (0.5 + 0.5 * Math.cos(u - 3 * v + 2.2 * bend)) ** 3;
      const crests = (0.5 + 0.5 * Math.cos(4 * (u - 3 * v) + 3 * bend)) ** 5;
      const value = 219 + 3.0 * Math.sin(u + v) + 9.5 * ridge + 4.0 * crests;
      const i = (y * 512 + x) * 4;
      ripples.data[i] = ripples.data[i + 1] = ripples.data[i + 2] = value;
      ripples.data[i + 3] = 255;
    }
  }
  detail.putImageData(ripples, 0, 0);
  detail.fillStyle = 'rgba(102,88,72,.10)';
  for (let n = 0; n < 17000; n++)
    detail.fillRect(random() * 512, random() * 512, 0.6 + random() * 1.3, 0.7);
  for (let group = 0; group < 65; group++) {
    const cx = random() * 512,
      cy = random() * 512;
    for (let line = 0; line < 13; line++) {
      const x = (cx + (random() - 0.5) * 86 + 512) % 512;
      const y = (cy + (random() - 0.5) * 27 + 512) % 512;
      const length = 8 + random() * 24,
        height = length * (0.18 + random() * 0.1);
      detail.lineWidth = 0.5 + random() * 0.85;
      detail.strokeStyle = line % 3 ? 'rgba(255,252,239,.48)' : 'rgba(156,141,113,.095)';
      // Draw any part of a mark that continues into the neighbouring tile.
      const stroke = (px: number, py: number) => {
        detail.beginPath();
        detail.moveTo(px, py);
        detail.quadraticCurveTo(px + length * 0.45, py - height * 0.68, px + length, py - height);
        detail.stroke();
      };
      stroke(x, y);
      if (x + length > 511) stroke(x - 512, y);
      if (y - height < 1) stroke(x, y + 512);
      if (x + length > 511 && y - height < 1) stroke(x - 512, y + 512);
    }
  }
  // Leave room in the colour range for crests and sunlit grains above the base sand.
  wind.level = 255 / 225;
  wind.wrapU = wind.wrapV = Texture.WRAP_ADDRESSMODE;
  wind.update(false);

  const material = new StandardMaterial('steppe limestone', scene);
  material.specularColor = Color3.Black();
  material.diffuseTexture = wind;
  material.ambientTexture = strand;
  material.backFaceCulling = false;
  return material;
}
