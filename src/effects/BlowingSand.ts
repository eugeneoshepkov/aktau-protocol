import { Mesh, RawTexture, Scene, ShaderMaterial, Texture } from '@babylonjs/core';

// The lowest part of a gust skims the kerbs. Its crest rolls up the sides of the flats.
export function createBlowingSand(scene: Scene): Mesh {
  const land = scene.getMeshByName('landMesh') as Mesh;
  const mesh = new Mesh('blowing sand', scene);
  land.geometry!.applyToMesh(mesh);
  mesh.isPickable = false;
  mesh.alphaIndex = -1;
  mesh.freezeWorldMatrix();

  const material = new ShaderMaterial(
    'windblown shell dust',
    scene,
    {
      vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv2;
      uniform mat4 worldViewProjection;
      uniform float time;
      varying vec2 ground;
      varying float coverage;
      varying float crest;
      void main() {
        ground = position.xz;
        float front = ground.y * 1.25 + ground.x * 0.57 + time * 2.85;
        crest = pow(0.5 + 0.5 * sin(front + 1.8 * sin(ground.x * 0.64 - time * 0.3)), 3.0);
        float lift = 0.10 + 0.56 * crest;
        gl_Position = worldViewProjection * vec4(position + vec3(0.0, lift, 0.0), 1.0);
        coverage = smoothstep(0.0, 0.25, uv2.y) * (1.0 - smoothstep(34.0, 65.0, gl_Position.w));
      }`,
      fragmentSource: `
      precision highp float;
      varying vec2 ground;
      varying float coverage;
      varying float crest;
      uniform float time;
      uniform float strength;
      uniform vec3 sky;
      uniform sampler2D noise;
      float sampleWind(vec2 p) { return texture2D(noise, p / 64.0).r; }
      void main() {
        if (coverage <= 0.0) discard;
        // The larger sheets travel towards the sea; finer streamers overtake them.
        vec2 drift = vec2(ground.x - 0.29 * ground.y, ground.y + time * 2.1);
        float swell = sampleWind(drift * vec2(0.54, 0.32));
        float lane = drift.x + 0.58 * sin(drift.y * 0.72 + 3.4 * swell);
        float sheet = sampleWind(vec2(lane * 1.1, drift.y * 0.49));
        float ribbons = sampleWind(vec2(lane * 6.4 + 2.1 * sheet, drift.y * 0.86 + time * 0.5));
        float grain = sampleWind(vec2(lane * 16.0 + swell, drift.y * 1.7 + time));
        float density = smoothstep(0.27, 0.72, swell) * smoothstep(0.26, 0.72, sheet);
        float alpha = density * (0.15 + 0.38 * ribbons + 0.17 * grain + 0.27 * crest) * strength * coverage;
        vec3 dust = mix(vec3(0.65, 0.46, 0.26), vec3(1.0, 0.92, 0.73), 0.68 * ribbons + 0.32 * crest);
        gl_FragColor = vec4(dust * (0.30 + 0.83 * sky), alpha);
      }`
    },
    {
      attributes: ['position', 'uv2'],
      uniforms: ['worldViewProjection', 'time', 'strength', 'sky'],
      samplers: ['noise'],
      needAlphaBlending: true
    }
  );
  // One small repeatable noise tile is shared by all four scales of wind.
  const grains = new Uint8Array(64 * 64);
  let seed = 1963;
  for (let i = 0; i < grains.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    grains[i] = seed >>> 24;
  }
  const noise = RawTexture.CreateLuminanceTexture(grains, 64, 64, scene, true);
  noise.wrapU = noise.wrapV = Texture.WRAP_ADDRESSMODE;
  material.backFaceCulling = false;
  material.setTexture('noise', noise);
  material.onBindObservable.add(() => {
    material.setFloat('time', performance.now() * 0.001);
    material.setColor3('sky', scene.fogColor);
  });
  mesh.material = material;
  mesh.onDisposeObservable.addOnce(() => material.dispose(false, true));
  return mesh;
}
