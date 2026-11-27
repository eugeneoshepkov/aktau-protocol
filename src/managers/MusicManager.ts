class MusicManagerClass {
  private tracks: string[] = [
    '/audio/background/track1.mp3',
    '/audio/background/track2.mp3',
    '/audio/background/track3.mp3',
    '/audio/background/track4.mp3',
    '/audio/background/track5.mp3',
    '/audio/background/track6.mp3'
  ];
  private playlist: string[] = [];
  private currentIndex = 0;
  private audio: HTMLAudioElement | null = null;
  private volume = 0.3;
  private muted = false;
  private isPlaying = false;
  private shore: { context: AudioContext; gain: GainNode; surf: GainNode } | null = null;
  private stormBuffer: AudioBuffer | null = null;
  private stormSource: AudioBufferSourceNode | null = null;
  private shoreLevel = 0;
  private shorePlaying = false;

  // The launch tap can unlock Web Audio on iOS. The mix stays silent until the city is ready.
  public async prepareShore(): Promise<void> {
    if (this.shore || !window.AudioContext) return;
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      const surf = context.createGain();
      surf.gain.value = this.shoreLevel;
      surf.connect(gain);
      this.shore = { context, gain, surf };
      document.addEventListener('visibilitychange', this.mixShore);
      void context.resume().catch(() => {});
      const load = async (file: string) => {
        const response = await fetch('/audio/' + file);
        if (!response.ok) throw new Error(`${file}: ${response.status}`);
        return context.decodeAudioData(await response.arrayBuffer());
      };
      void load('sandstorm.mp3')
        .then((buffer) => {
          if (this.shore?.context === context) this.stormBuffer = buffer;
        })
        .catch(() => {});
      const buffer = await load('caspian-shore.mp3').catch(() => null);
      if (!buffer || this.shore?.context !== context) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(surf);
      source.start();
    } catch {
      this.disposeShore();
    }
  }

  public setShoreLevel(level: number): void {
    if (level === this.shoreLevel) return;
    this.shoreLevel = level;
    if (this.shore) {
      this.shore.surf.gain.setTargetAtTime(
        level,
        this.shore.context.currentTime,
        level ? 0.35 : 0.025
      );
    }
  }

  public playSandstorm(distanceToKiosk: number): void {
    if (
      !this.shore ||
      !this.stormBuffer ||
      !this.shorePlaying ||
      this.muted ||
      !this.volume ||
      document.hidden
    )
      return;
    const { context, gain } = this.shore;
    if (context.state !== 'running') return;
    this.stormSource?.stop();
    // The low gust carries across town; distance muffles the high shutter rattle.
    const nearby = Math.max(0, 1 - distanceToKiosk / 14);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = 540 + 5900 * nearby * nearby;
    filter.connect(gain);
    const source = context.createBufferSource();
    source.buffer = this.stormBuffer;
    source.connect(filter);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      if (this.stormSource === source) this.stormSource = null;
    };
    source.start();
    this.stormSource = source;
  }

  private mixShore = (): void => {
    if (!this.shore) return;
    const { context, gain } = this.shore;
    const volume = this.shorePlaying && !this.muted && !document.hidden ? this.volume : 0;
    if (!volume) this.stormSource?.stop();
    gain.gain.setTargetAtTime(volume, context.currentTime, volume ? 0.35 : 0.025);
  };

  public disposeShore(): void {
    document.removeEventListener('visibilitychange', this.mixShore);
    this.stormSource?.stop();
    this.stormSource = null;
    this.stormBuffer = null;
    if (this.shore) void this.shore.context.close().catch(() => {});
    this.shore = null;
  }

  public initialize(): void {
    this.shufflePlaylist();
    this.audio = new Audio();

    const savedVolume = localStorage.getItem('aktau-volume');
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
    const savedMuted = localStorage.getItem('aktau-muted');
    if (savedMuted !== null) {
      this.muted = savedMuted === 'true';
    }

    this.audio.volume = this.muted ? 0 : this.volume;

    this.audio.addEventListener('ended', () => {
      this.playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[MusicManager] Error loading track, skipping...', e);
      this.playNext();
    });
  }

  private shufflePlaylist(): void {
    this.playlist = [...this.tracks];
    for (let i = this.playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
    this.currentIndex = 0;
  }

  public play(): void {
    if (!this.audio || this.isPlaying) return;

    this.isPlaying = true;
    this.shorePlaying = true;
    this.mixShore();
    this.playTrack(this.playlist[this.currentIndex]);
  }

  private playTrack(src: string): void {
    if (!this.audio) return;

    this.audio.src = src;
    this.audio.play().catch((err) => {
      console.warn('[MusicManager] Autoplay blocked, will retry on user interaction', err);
      document.addEventListener(
        'click',
        () => {
          if (this.audio && this.isPlaying) {
            this.audio.play().catch(() => {});
          }
        },
        { once: true }
      );
    });
  }

  private playNext(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.playlist.length) {
      this.shufflePlaylist();
    }
    this.playTrack(this.playlist[this.currentIndex]);
  }

  public stop(): void {
    if (!this.audio) return;
    this.isPlaying = false;
    this.pause();
    this.audio.currentTime = 0;
  }

  public pause(): void {
    if (!this.audio) return;
    this.shorePlaying = false;
    this.mixShore();
    this.audio.pause();
  }

  public resume(): void {
    if (!this.audio || !this.isPlaying) return;
    this.shorePlaying = true;
    this.mixShore();
    this.audio.play().catch(() => {});
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.mixShore();
    if (this.audio && !this.muted) {
      this.audio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.mixShore();
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }
}

export const musicManager = new MusicManagerClass();
