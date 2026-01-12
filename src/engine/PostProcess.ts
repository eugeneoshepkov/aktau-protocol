import {
  Scene,
  PostProcess,
  Effect,
  Camera
} from '@babylonjs/core';

const GRAIN_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float time;
uniform float grainIntensity;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    vec4 color = texture2D(textureSampler, vUV);

    float grain = noise(vUV * 500.0 + time * 10.0) - 0.5;
    grain *= grainIntensity;

    color.rgb += grain;

    vec2 center = vUV - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.5;
    color.rgb *= vignette;

    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(gray), 0.15);

    gl_FragColor = color;
}
`;

const HEAT_HAZE_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float time;
uniform float hazeIntensity;

void main(void) {
    vec2 uv = vUV;
    
    float horizonY = 0.7;
    float distFromHorizon = abs(uv.y - horizonY);
    float hazeMask = smoothstep(0.0, 0.4, 1.0 - distFromHorizon);
    hazeMask *= smoothstep(0.3, 0.7, uv.y);
    
    float wave1 = sin(uv.x * 30.0 + time * 2.0) * 0.002;
    float wave2 = sin(uv.x * 50.0 - time * 1.5) * 0.001;
    float wave3 = sin(uv.y * 20.0 + time * 1.0) * 0.0015;
    
    float distortion = (wave1 + wave2 + wave3) * hazeMask * hazeIntensity;
    
    uv.x += distortion;
    uv.y += distortion * 0.5;
    
    vec4 color = texture2D(textureSampler, uv);
    
    gl_FragColor = color;
}
`;

export class FilmGrainEffect {
  private postProcess: PostProcess | null = null;
  private time: number = 0;

  constructor(scene: Scene, camera: Camera) {
    this.createEffect(scene, camera);
  }

  private createEffect(scene: Scene, camera: Camera): void {
    Effect.ShadersStore['filmGrainFragmentShader'] = GRAIN_FRAGMENT_SHADER;

    this.postProcess = new PostProcess(
      'filmGrain',
      'filmGrain',
      ['time', 'grainIntensity'],
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
      effect.setFloat('grainIntensity', 0.08);
    };
  }

  public setIntensity(_intensity: number): void {
  }

  public dispose(): void {
    this.postProcess?.dispose();
  }
}

export class HeatHazeEffect {
  private postProcess: PostProcess | null = null;
  private time: number = 0;
  private intensity: number = 1.0;

  constructor(scene: Scene, camera: Camera) {
    this.createEffect(scene, camera);
  }

  private createEffect(scene: Scene, camera: Camera): void {
    Effect.ShadersStore['heatHazeFragmentShader'] = HEAT_HAZE_FRAGMENT_SHADER;

    this.postProcess = new PostProcess(
      'heatHaze',
      'heatHaze',
      ['time', 'hazeIntensity'],
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
      effect.setFloat('hazeIntensity', this.intensity);
    };
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
  }

  public dispose(): void {
    this.postProcess?.dispose();
  }
}
