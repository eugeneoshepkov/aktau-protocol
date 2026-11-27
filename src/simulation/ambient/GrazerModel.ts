import {
  Bone,
  Color3,
  Matrix,
  Mesh,
  Quaternion,
  Skeleton,
  StandardMaterial,
  Vector3,
  VertexData,
  type Scene
} from '@babylonjs/core';

export type GrazerSpecies = 'camel' | 'horse';

// Each rigid piece belongs to a joint. Merging the pieces leaves one draw call per animal.
export function createGrazerModel(scene: Scene, species: GrazerSpecies) {
  const camel = species === 'camel';
  const mesh = new Mesh(species, scene);
  const skeleton = new Skeleton(species, String(mesh.uniqueId), scene);
  const pieces: VertexData[] = [];
  const pale = !scene.getMaterialByName(species + '-light-coat');
  const coat = camel ? (pale ? '#c59764' : '#b78554') : pale ? '#b87951' : '#784a3a';
  const light = camel ? '#d5a671' : '#b47952';
  const dark = camel ? '#79583c' : '#423b36';
  const body = new Bone('body', skeleton);
  const neck = new Bone('neck', skeleton, body, Matrix.Translation(0, 0.54, 0.23));
  const tail = new Bone('tail', skeleton, body, Matrix.Translation(0, 0.55, -0.31));

  function piece(
    bone: Bone,
    data: VertexData,
    scale: Vector3,
    rotation: Quaternion,
    at: Vector3,
    color: string
  ) {
    data.transform(Matrix.Compose(scale, rotation, at));
    const tint = Color3.FromHexString(color);
    data.colors = [];
    data.matricesIndices = [];
    data.matricesWeights = [];
    for (let i = 0; i < data.positions!.length; i += 3) {
      data.colors.push(tint.r, tint.g, tint.b, 1);
      data.matricesIndices.push(bone.getIndex(), 0, 0, 0);
      data.matricesWeights.push(1, 0, 0, 0);
    }
    pieces.push(data);
  }

  function oval(
    bone: Bone,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: string,
    pitch = 0
  ) {
    const shape = VertexData.CreateIcoSphere({
      radius: 0.5,
      subdivisions: Math.max(width, height, depth) < 0.13 ? 1 : 2,
      flat: true
    });
    piece(
      bone,
      shape,
      new Vector3(width, height, depth),
      Quaternion.RotationAxis(Vector3.Right(), pitch),
      new Vector3(x, y, z),
      color
    );
  }

  function taper(
    bone: Bone,
    from: number[],
    to: number[],
    base: number,
    tip: number,
    color: string
  ) {
    const a = Vector3.FromArray(from);
    const b = Vector3.FromArray(to);
    const dir = b.subtract(a);
    const shape = VertexData.CreateCylinder({
      height: dir.length(),
      diameterBottom: base,
      diameterTop: tip,
      tessellation: 7
    });
    const rotation = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir.normalize(), rotation);
    piece(bone, shape, Vector3.One(), rotation, Vector3.Center(a, b), color);
  }

  oval(body, 0, 0.5, -0.025, 0.32, camel ? 0.32 : 0.36, 0.72, coat);
  oval(body, 0, 0.505, -0.215, 0.32, 0.33, 0.38, coat);
  if (camel) {
    for (const z of [-0.18, 0.13]) {
      const hump = VertexData.CreateIcoSphere({ radius: 0.5, subdivisions: 2, flat: true });
      const vertices = hump.positions!;
      for (let i = 0; i < vertices.length; i += 3) {
        const height = vertices[i + 1];
        vertices[i] *= 1 - height * 0.98;
        vertices[i + 2] = vertices[i + 2] * (1 - height * 0.85) - 0.075 * height;
      }
      VertexData.ComputeNormals(vertices, hump.indices!, hump.normals!);
      piece(
        body,
        hump,
        new Vector3(0.32, 0.42, 0.34),
        Quaternion.Identity(),
        new Vector3(0, 0.622, z),
        coat
      );
    }
    taper(neck, [0, 0.52, 0.23], [0, 0.59, 0.39], 0.21, 0.16, coat);
    oval(neck, 0, 0.588, 0.385, 0.167, 0.167, 0.167, coat);
    taper(neck, [0, 0.58, 0.38], [0, 0.86, 0.47], 0.165, 0.122, coat);
    oval(neck, 0, 0.87, 0.494, 0.154, 0.149, 0.201, light);
    oval(neck, 0, 0.855, 0.59, 0.14, 0.09, 0.15, '#e1ba88');
    oval(neck, 0, 0.881, 0.637, 0.101, 0.033, 0.048, dark);
    for (const side of [-1, 1]) {
      oval(neck, side * 0.057, 0.935, 0.45, 0.053, 0.066, 0.044, coat);
      oval(neck, side * 0.073, 0.892, 0.524, 0.018, 0.026, 0.029, '#403a30');
    }
    taper(tail, [0, 0.55, -0.32], [0, 0.25, -0.39], 0.048, 0.027, coat);
    oval(tail, 0, 0.227, -0.39, 0.052, 0.11, 0.057, dark);
  } else {
    oval(neck, 0, 0.634, 0.315, 0.21, 0.45, 0.235, coat, 0.55);
    oval(neck, 0, 0.696, 0.282, 0.105, 0.34, 0.16, dark, 0.56);
    oval(neck, 0, 0.755, 0.49, 0.163, 0.145, 0.31, coat, 0.43);
    oval(neck, 0, 0.701, 0.6, 0.123, 0.094, 0.15, '#735847', 0.46);
    taper(neck, [0, 0.81, 0.433], [0, 0.785, 0.537], 0.12, 0.054, dark);
    for (const side of [-1, 1]) {
      taper(neck, [side * 0.046, 0.805, 0.431], [side * 0.063, 0.905, 0.444], 0.06, 0.011, coat);
      oval(neck, side * 0.074, 0.779, 0.5, 0.019, 0.025, 0.03, '#292a28');
    }
    taper(tail, [0, 0.56, -0.32], [0, 0.405, -0.412], 0.095, 0.115, dark);
    taper(tail, [0, 0.42, -0.406], [0, 0.145, -0.465], 0.117, 0.046, dark);
  }

  const legs = [];
  for (const front of [false, true]) {
    for (const side of [-1, 1]) {
      const x = side * 0.094;
      const z = front ? 0.208 : -0.235;
      const hip = new Bone(
        front ? 'foreleg' : 'hindleg',
        skeleton,
        body,
        Matrix.Translation(x, 0.458, z)
      );
      const knee = new Bone('lower leg', skeleton, hip, Matrix.Translation(0, -0.218, 0));
      oval(hip, x, 0.432, z, 0.121, 0.184, 0.151, coat);
      taper(hip, [x, 0.465, z], [x, 0.237, z], 0.098, 0.052, coat);
      taper(knee, [x, 0.247, z], [x, 0.048, z], 0.061, 0.04, camel ? light : dark);
      oval(knee, x, 0.031, z + 0.012, 0.067, 0.058, camel ? 0.095 : 0.078, dark);
      legs.push({
        hip,
        knee,
        front,
        offset: (side > 0 ? 0.5 : 0) + (front ? (camel ? 0.065 : 0.24) : 0)
      });
    }
  }

  const [geometry, ...details] = pieces;
  geometry.merge(details, true);
  geometry.applyToMesh(mesh);
  const material = new StandardMaterial(species + (pale ? '-light-coat' : '-dark-coat'), scene);
  material.specularColor.set(0.025, 0.025, 0.02);
  mesh.material = material;
  mesh.skeleton = skeleton;
  mesh.numBoneInfluencers = 1;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  scene.getLightByName('sunLight')?.getShadowGenerator()?.getShadowMap()?.renderList?.push(mesh);
  return { mesh, body, neck, tail, legs };
}
