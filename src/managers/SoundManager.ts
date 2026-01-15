// ZzFX - Zuper Zmall Zound Zynth
// https://github.com/KilledByAPixel/ZzFX

// ZzFX parameters: volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo

type ZzFXParams = number[];

// Procedural sound definitions - these play at their defined volumes
const SOUNDS: Record<string, ZzFXParams> = {
  // Construction thud - low, punchy industrial clang
  build: [0.8, 0, 120, 0.01, 0.08, 0.15, 4, 2, 0, 0, 0, 0, 0, 0.4, 0, 0.1, 0, 0.6, 0.02],

  // Water splash - bubbly pump sound
  pump: [0.6, 0, 350, 0.02, 0.15, 0.25, 2, 0.5, 0, 0, 40, 0.05, 0.08, 0.2, 0, 0, 0.08, 0.6, 0.1],

  // Geiger click - sharp radioactive tick
  geiger: [0.25, 0.1, 1800, 0, 0.008, 0.02, 4, 0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 1, 0],

  // Reactor placement - deep industrial hum with power-up
  reactor: [0.7, 0.1, 60, 0.2, 0.4, 0.3, 1, 0.8, 20, 0, 0, 0, 0, 0.2, 8, 0, 0.1, 0.4, 0.15],

  // Distiller placement - steam/water processing
  distiller: [
    0.5, 0, 500, 0.05, 0.2, 0.3, 2, 0.3, -20, 0, 30, 0.08, 0.1, 0.3, 0, 0, 0.05, 0.5, 0.1
  ],

  // Housing placement - construction, multiple hits
  microrayon: [0.6, 0.2, 200, 0.02, 0.1, 0.2, 4, 1.2, 0, 0, 0, 0, 0.05, 0.3, 0, 0.15, 0, 0.5, 0.03],

  // Water tank - metallic clang
  water_tank: [
    0.6, 0, 180, 0.01, 0.12, 0.25, 4, 1.8, 0, 0, 0, 0, 0, 0.15, 0, 0.2, 0.02, 0.55, 0.04
  ],

  // UI click - crisp button press
  click: [0.4, 0, 900, 0, 0.015, 0.04, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],

  // Error/denied sound
  error: [0.5, 0, 200, 0, 0.08, 0.1, 3, 0, 0, 0, -50, 0.05, 0, 0.2, 0, 0, 0, 0.4, 0.05],

  // Success/confirm sound
  success: [0.5, 0, 600, 0, 0.05, 0.1, 0, 0, 50, 0, 200, 0.05, 0, 0, 0, 0, 0, 0.8, 0.05],

  // Chronicle discovery - mystical chime with rising tone
  discover: [0.5, 0, 800, 0.02, 0.15, 0.3, 0, 0.5, 30, 0, 150, 0.08, 0, 0, 0, 0, 0.05, 0.7, 0.1],

  // Warning alarm
  warning: [0.6, 0, 300, 0, 0.15, 0.1, 2, 0, 0, 0, 100, 0.1, 0.2, 0, 0, 0, 0, 0.5, 0.1],

  // Game over - terrifying descending doom
  gameover: [1, 0, 80, 0.3, 1.2, 0.8, 1, 0.8, -50, -5, 0, 0, 0, 0.6, 0, 0.2, 0.15, 0.2, 0.4],

  // Meltdown siren - alarming nuclear warning
  meltdown: [0.9, 0, 400, 0.1, 0.4, 0.2, 2, 0, 200, 0, -200, 0.15, 0.3, 0.3, 0, 0, 0.05, 0.6, 0.1]
};

class SoundManagerClass {
  private enabled: boolean = true;
  private muted: boolean = false;
  private zzfx: ((...args: number[]) => AudioBufferSourceNode) | null = null;
  private initialized: boolean = false;

  constructor() {
    const savedMuted = localStorage.getItem('aktau-muted');
    if (savedMuted !== null) {
      this.muted = savedMuted === 'true';
    }
    this.initOnInteraction();
  }

  private initOnInteraction(): void {
    const init = async () => {
      if (this.initialized) return;
      this.initialized = true;

      try {
        const zzfxModule = await import('zzfx');
        this.zzfx = zzfxModule.zzfx;
        console.log('SoundManager initialized');
      } catch (e) {
        console.warn('Failed to load ZzFX:', e);
      }

      document.removeEventListener('click', init);
      document.removeEventListener('keydown', init);
    };

    document.addEventListener('click', init, { once: true });
    document.addEventListener('keydown', init, { once: true });
  }

  public play(soundName: keyof typeof SOUNDS): void {
    if (!this.enabled || !this.zzfx || this.muted) return;

    const params = [...SOUNDS[soundName]];
    if (params) {
      try {
        this.zzfx(...params);
      } catch {}
    }
  }

  public playGeigerClick(): void {
    if (!this.enabled || !this.zzfx || this.muted) return;

    const params = [...SOUNDS.geiger];
    params[2] = 1200 + Math.random() * 600;
    params[0] = 0.15 + Math.random() * 0.15;

    try {
      this.zzfx(...params);
    } catch {}
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): void {
    this.enabled = !this.enabled;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('aktau-muted', muted.toString());
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('aktau-muted', this.muted.toString());
    return this.muted;
  }
}

export const soundManager = new SoundManagerClass();
