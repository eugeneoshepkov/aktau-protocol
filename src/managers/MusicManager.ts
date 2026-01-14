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
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  public pause(): void {
    if (!this.audio) return;
    this.audio.pause();
  }

  public resume(): void {
    if (!this.audio || !this.isPlaying) return;
    this.audio.play().catch(() => {});
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.audio && !this.muted) {
      this.audio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }
}

export const musicManager = new MusicManagerClass();
