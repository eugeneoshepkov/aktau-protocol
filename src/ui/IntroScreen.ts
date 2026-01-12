import { ICONS } from './Icons';

export class IntroScreen {
  private overlay: HTMLDivElement;
  private onStart: () => void;
  private audio: HTMLAudioElement | null = null;
  private muted: boolean = false;

  constructor(onStart: () => void) {
    this.onStart = onStart;
    
    const savedMuted = localStorage.getItem('aktau-intro-muted');
    this.muted = savedMuted === 'true';
    
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);

    this.initAudio();

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private initAudio(): void {
    this.audio = new Audio('/audio/title.mp3');
    this.audio.loop = false;
    this.audio.volume = 0.55;
    this.audio.muted = this.muted;
    
    const playPromise = this.audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        const playOnClick = () => {
          this.audio?.play();
          document.removeEventListener('click', playOnClick);
        };
        document.addEventListener('click', playOnClick);
      });
    }
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.innerHTML = `
      <div class="intro-content">
        <div class="intro-header">
          <div class="intro-emblem">☢</div>
          <h1>THE AKTAU PROTOCOL</h1>
          <div class="intro-subtitle">Mangyshlak Atomic Energy Complex</div>
        </div>

        <div class="intro-lore">
          <p class="intro-year">1958 — KAZAKH SSR</p>
          
          <p>In the barren Mangyshlak Peninsula, where the Caspian Sea meets endless desert, Soviet engineers attempted the impossible: building a city where no city should exist.</p>
          
          <p><strong>Shevchenko</strong> — a closed nuclear city, hidden from maps. Its beating heart: the <em>BN-350</em>, the world's first fast breeder reactor designed not just for power, but to turn seawater into drinking water.</p>
          
          <p>For decades, the reactor sustained 150,000 souls in this hostile land. Fresh water flowed. Lights never dimmed. The desert bloomed.</p>
          
          <p class="intro-highlight">Then came 1991. The Union fell. The reactor aged. Now renamed <strong>Aktau</strong>, the city faces an uncertain future.</p>
          
          <p class="intro-mission">Your mission: manage the delicate balance of water, power, and heat. Keep the reactor stable. Keep the people alive. One miscalculation, and the desert reclaims what was never meant to be.</p>
        </div>

        <button class="intro-start-btn">
          <span>[ INITIALIZE PROTOCOL ]</span>
        </button>

        <div class="intro-footer">
          <span>WASD: move │ QE: rotate │ Scroll: zoom │ Shift+Drag: pan</span>
        </div>

        <button class="intro-mute-btn" title="Toggle music">
          <span class="icon-wrap">${this.muted ? ICONS.volumeOff : ICONS.volumeOn}</span>
        </button>
      </div>
    `;

    const startBtn = overlay.querySelector('.intro-start-btn');
    startBtn?.addEventListener('click', () => this.dismiss());

    const muteBtn = overlay.querySelector('.intro-mute-btn');
    muteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
      const iconWrap = muteBtn.querySelector('.icon-wrap');
      if (iconWrap) {
        iconWrap.innerHTML = this.muted ? ICONS.volumeOff : ICONS.volumeOn;
      }
    });

    return overlay;
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    localStorage.setItem('aktau-intro-muted', String(this.muted));
    if (this.audio) {
      this.audio.muted = this.muted;
    }
  }

  private dismiss(): void {
    this.overlay.classList.remove('visible');
    this.overlay.classList.add('dismissed');

    if (this.audio) {
      const fadeOut = setInterval(() => {
        if (this.audio && this.audio.volume > 0.01) {
          this.audio.volume = Math.max(0, this.audio.volume - 0.02);
        } else {
          clearInterval(fadeOut);
          this.audio?.pause();
          this.audio = null;
        }
      }, 50);
    }

    setTimeout(() => {
      this.overlay.remove();
      this.onStart();
    }, 800);
  }
}
