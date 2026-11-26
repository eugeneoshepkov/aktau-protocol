import {
  Color3,
  DynamicTexture,
  Mesh,
  Scene,
  StandardMaterial,
  Texture,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';

export function createNeighbourhoodPaths(scene: Scene): Mesh {
  const left = 51,
    right = 56,
    beach = 8,
    flats = 18;
  const texture = new DynamicTexture(
    'packed earth and shell dust',
    { width: 256, height: 512 },
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE
  );
  texture.hasAlpha = true;
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.setTransform(
    256 / (right - left),
    0,
    0,
    512 / (flats - beach),
    (-left * 256) / (right - left),
    (-beach * 512) / (flats - beach)
  );
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();

  // From the slab entrance to the tail of the kiosk queue.
  ctx.moveTo(52.41, 17.1);
  ctx.bezierCurveTo(52.8, 17.09, 52.85, 16.58, 53.06, 16.4);
  ctx.quadraticCurveTo(53.25, 16.26, 53.44, 16.16);
  // The fork slips between the two rows of flats and meets the paved promenade.
  ctx.moveTo(52.9, 16.58);
  ctx.bezierCurveTo(52.87, 16.18, 52.33, 15.9, 52.34, 15.43);
  ctx.bezierCurveTo(52.34, 14.88, 52.57, 14.2, 52.54, 13.49);
  ctx.bezierCurveTo(52.48, 12.59, 53.11, 12.41, 53.34, 11.63);
  // The paved square carries the middle of the walk. Sand resumes at its seaward edge.
  ctx.moveTo(53.19, 9.24);
  ctx.bezierCurveTo(52.87, 9.04, 52.39, 8.99, 52.14, 8.73);
  ctx.quadraticCurveTo(51.95, 8.55, 51.8, 8.3);

  // Overlapping translucent strokes feather the margins into the surrounding ground.
  ctx.strokeStyle = '#aa8962';
  for (const width of [0.42, 0.37, 0.31, 0.26, 0.2]) {
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  let seed = 51;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 6500; i++) {
    ctx.fillStyle = i % 4 ? '#dec99e' : '#8f795e';
    ctx.globalAlpha = 0.2 + 0.25 * random();
    ctx.fillRect(random() * 256, random() * 512, 0.5 + random() * 1.8, 0.7 + random() * 2.8);
  }
  texture.update();

  // Project the paint onto the actual shore triangles so the last steps follow the sloped beach.
  const ground = scene.getMeshByName('landMesh')!;
  const groundVertices = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const groundNormals = ground.getVerticesData(VertexBuffer.NormalKind)!;
  const groundIndices = ground.getIndices()!;
  const path = new Mesh('worn paths to the kiosk and beach', scene);
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let i = 0; i < groundIndices.length; i += 3) {
    const a = 3 * groundIndices[i],
      x = groundVertices[a],
      z = groundVertices[a + 2];
    if (x < left - 0.5 || x > right + 0.5 || z < beach - 1 || z > flats + 1) continue;
    for (let corner = 0; corner < 3; corner++) {
      const n = groundIndices[i + corner] * 3;
      positions.push(groundVertices[n], groundVertices[n + 1], groundVertices[n + 2]);
      normals.push(groundNormals[n], groundNormals[n + 1], groundNormals[n + 2]);
      uvs.push(
        (groundVertices[n] - left) / (right - left),
        (flats - groundVertices[n + 2]) / (flats - beach)
      );
      indices.push(indices.length);
    }
  }
  const data = new VertexData();
  Object.assign(data, { positions, normals, uvs, indices });
  data.applyToMesh(path);
  const material = new StandardMaterial('worn sand', scene);
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  material.zOffset = -1;
  path.material = material;
  path.isPickable = false;
  path.receiveShadows = true;
  path.freezeWorldMatrix();
  path.onDisposeObservable.addOnce(() => material.dispose(false, true));
  return path;
}
