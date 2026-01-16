import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOTS_DIR = './public/pictures/screenshots';
const THUMB_WIDTH = 800; // Reasonable preview size
const QUALITY = 80;

async function generateThumbnails() {
  const files = await readdir(SCREENSHOTS_DIR);
  const pngs = files.filter(f => f.endsWith('.png') && !f.includes('-thumb'));

  for (const file of pngs) {
    const input = join(SCREENSHOTS_DIR, file);
    const output = join(SCREENSHOTS_DIR, file.replace('.png', '-thumb.png'));

    const info = await sharp(input)
      .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
      .png({ quality: QUALITY, compressionLevel: 9 })
      .toFile(output);

    const originalSize = (await sharp(input).metadata()).size || 0;
    console.log(`${file} → ${file.replace('.png', '-thumb.png')}`);
    console.log(`  ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(info.size / 1024).toFixed(0)}KB`);
  }

  console.log('\nDone!');
}

generateThumbnails().catch(console.error);
