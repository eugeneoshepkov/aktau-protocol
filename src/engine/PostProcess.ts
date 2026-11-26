import { Scene, PostProcess, Effect, Camera } from '@babylonjs/core';

const FROST_VIGNETTE_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float frostIntensity;
uniform float time;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    vec4 color = texture2D(textureSampler, vUV);

    // Vignette from edges - frost creeps in from screen borders
    float dist = distance(vUV, vec2(0.5));
    float frost = smoothstep(0.3, 0.7, dist) * frostIntensity;

    // Add some subtle animation/texture to the frost edge
    float frostNoise = noise(vUV * 50.0 + time * 0.5) * 0.1;
    frost += frostNoise * frostIntensity * 0.3;

    // Blue-white frost tint
    vec3 frostColor = vec3(0.8, 0.9, 1.0);
    color.rgb = mix(color.rgb, frostColor, frost * 0.4);

    // Slight desaturation in frosted areas
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(gray) * frostColor, frost * 0.2);

    gl_FragColor = color;
}
`;

export class FrostVignetteEffect {
  private postProcess: PostProcess | null = null;
  private time: number = 0;
  private intensity: number = 0;

  private scene: Scene;
  private camera: Camera;

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  private createEffect(scene: Scene, camera: Camera): void {
    Effect.ShadersStore['frostVignetteFragmentShader'] = FROST_VIGNETTE_FRAGMENT_SHADER;

    this.postProcess = new PostProcess(
      'frostVignette',
      'frostVignette',
      ['time', 'frostIntensity'],
      null,
      1.0,
      camera,
      0,
      scene.getEngine(),
      false
    );

    this.postProcess.onApply = (effect) => {
      this.time += 0.016;
      effect.setFloat('time', this.time);
      effect.setFloat('frostIntensity', this.intensity);
    };
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    if (intensity > 0 && !this.postProcess) this.createEffect(this.scene, this.camera);
    if (intensity === 0) this.dispose();
  }

  public dispose(): void {
    this.postProcess?.dispose(this.camera);
    this.postProcess = null;
  }
}
