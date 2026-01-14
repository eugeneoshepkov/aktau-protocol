import { ICONS } from './Icons';
import { t } from '../i18n';

export class IntroScreen {
  private overlay: HTMLDivElement;
  private onStart: () => void;
  private audio: HTMLAudioElement | null = null;
  private muted: boolean = false;

  constructor(onStart: () => void) {
    this.onStart = onStart;
    
    const savedMuted = localStorage.getItem('aktau-muted');
    this.muted = savedMuted === 'true';
    
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);

    this.initAudio();
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
    // Start visible immediately to prevent flash of game underneath
    overlay.classList.add('visible');
    overlay.innerHTML = `
      <div class="intro-content">
        <div class="intro-header">
          <div class="intro-emblem">☢</div>
          <h1>THE AKTAU PROTOCOL</h1>
          <div class="intro-subtitle">${t('intro.subtitle')}</div>
        </div>

        <div class="intro-image">
          <img src="/pictures/intro-horizontal.png" alt="Aktau" />
        </div>

        <div class="intro-lore">
          <p class="intro-year">${t('intro.year')}</p>

          <p>${t('intro.lore1')}</p>

          <p>${t('intro.lore2')}</p>

          <p>${t('intro.lore3')}</p>

          <p class="intro-highlight">${t('intro.lore4')}</p>

          <p class="intro-mission">${t('intro.mission')}</p>
        </div>

        <button class="intro-start-btn">
          <span>${t('intro.start')}</span>
        </button>

        <div class="intro-footer">
          <span>${t('intro.controls')}</span>
        </div>

        <button class="intro-mute-btn" title="${t('intro.mute')}">
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
    localStorage.setItem('aktau-muted', String(this.muted));
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
