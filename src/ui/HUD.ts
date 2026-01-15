import { gameState, type ResourceTrend, type Season } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';
import { musicManager } from '../managers/MusicManager';
import { soundManager } from '../managers/SoundManager';
import { ICONS } from './Icons';
import type { Resources } from '../types';
import { t, td } from '../i18n';

export class HUD {
  private container: HTMLDivElement;
  private resourceElements: Map<string, HTMLSpanElement> = new Map();
  private trendElements: Map<string, HTMLSpanElement> = new Map();
  private dayElement: HTMLSpanElement | null = null;
  private seasonElement: HTMLSpanElement | null = null;
  private tempElement: HTMLSpanElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private speedButtons: HTMLButtonElement[] = [];
  private readonly speeds = [1000, 500, 250];

  private readonly seasonIcons: Record<Season, string> = {
    spring: ICONS.spring,
    summer: ICONS.summer,
    autumn: ICONS.autumn,
    winter: ICONS.winter
  };

  constructor() {
    this.container = this.createHUD();
    document.body.appendChild(this.container);

    gameState.on('resourceChange', () => this.updateResources());
    gameState.on('resourceTrend', (data) => this.updateTrends(data as ResourceTrend));
    gameState.on('dayAdvance', () => this.updateDay());
    gameState.on('seasonChange', () => this.updateSeason());
    gameState.on('gameOver', (data) => this.showGameOver(data as { reason: string; day: number }));
    gameState.on('reactorWarning', () => this.flashWarning());

    this.updateResources();
    this.updateDay();
    this.updateSeason();
  }

  private createHUD(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'hud';
    container.innerHTML = `
      <div class="hud-top">
        <div class="hud-section">
          <span class="hud-label">${t('hud.day')}</span>
          <span id="hud-day" class="hud-value">1</span>
          <span id="hud-season" class="hud-season icon-wrap icon-season">${ICONS.spring}</span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-population">${ICONS.population}</span> ${t('hud.pop')}</span>
          <span id="hud-population" class="hud-value">0</span>
          <span id="hud-trend-population" class="hud-trend"></span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-water">${ICONS.water}</span> ${t('hud.water')}</span>
          <span id="hud-freshWater" class="hud-value">0</span>
          <span id="hud-trend-freshWater" class="hud-trend"></span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-seawater">${ICONS.seawater}</span> ${t('hud.sea')}</span>
          <span id="hud-seawater" class="hud-value">0</span>
          <span id="hud-trend-seawater" class="hud-trend"></span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-heat">${ICONS.heat}</span> ${t('hud.heat')}</span>
          <span id="hud-heat" class="hud-value">0</span>
          <span id="hud-trend-heat" class="hud-trend"></span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-electricity">${ICONS.electricity}</span> ${t('hud.power')}</span>
          <span id="hud-electricity" class="hud-value">0</span>
          <span id="hud-trend-electricity" class="hud-trend"></span>
        </div>
        <div class="hud-section reactor-temp">
          <span class="hud-label"><span class="icon-wrap icon-nuclear">${ICONS.nuclear}</span> ${t('hud.temp')}</span>
          <span id="hud-temp" class="hud-value">0</span>
          <span class="hud-unit">°C</span>
        </div>
        <div class="hud-section">
          <span class="hud-label"><span class="icon-wrap icon-happiness">${ICONS.happiness}</span> ${t('hud.mood')}</span>
          <span id="hud-happiness" class="hud-value">0</span>
          <span id="hud-trend-happiness" class="hud-trend"></span>
        </div>
        <div class="hud-controls">
          <button id="hud-save" class="hud-button" title="${t('hud.save')}"><span class="icon-wrap">${ICONS.save}</span></button>
          <button id="hud-load" class="hud-button" title="${t('hud.load')}"><span class="icon-wrap">${ICONS.load}</span></button>
          <span class="hud-divider">│</span>
          <span class="hud-volume-control" title="${t('hud.volume')}">
            <span class="volume-icon icon-wrap">${ICONS.volumeOn}</span>
            <input type="range" id="hud-volume" min="0" max="100" value="30" class="volume-slider" title="${t('hud.volume')}">
          </span>
          <span class="hud-divider">│</span>
          <button id="hud-pause" class="hud-button"><span class="icon-wrap pause-icon">${ICONS.pause}</span></button>
          <button id="hud-speed-0" class="hud-button speed-btn active">1×</button>
          <button id="hud-speed-1" class="hud-button speed-btn">2×</button>
          <button id="hud-speed-2" class="hud-button speed-btn">4×</button>
        </div>
      </div>
    `;

    this.dayElement = container.querySelector('#hud-day');
    this.seasonElement = container.querySelector('#hud-season');
    this.tempElement = container.querySelector('#hud-temp');
    this.pauseButton = container.querySelector('#hud-pause');

    ['freshWater', 'seawater', 'heat', 'electricity', 'happiness', 'population'].forEach((key) => {
      const el = container.querySelector(`#hud-${key}`);
      if (el) this.resourceElements.set(key, el as HTMLSpanElement);
      const trendEl = container.querySelector(`#hud-trend-${key}`);
      if (trendEl) this.trendElements.set(key, trendEl as HTMLSpanElement);
    });

    this.pauseButton?.addEventListener('click', () => {
      tickSystem.togglePause();
      const pauseIcon = this.pauseButton?.querySelector('.pause-icon');
      if (pauseIcon) {
        pauseIcon.innerHTML = tickSystem.isPausedState() ? ICONS.play : ICONS.pause;
      }
    });

    const saveBtn = container.querySelector('#hud-save') as HTMLButtonElement;
    const loadBtn = container.querySelector('#hud-load') as HTMLButtonElement;

    saveBtn?.addEventListener('click', () => {
      tickSystem.pause();
      const pauseIcon = this.pauseButton?.querySelector('.pause-icon');
      if (pauseIcon) pauseIcon.innerHTML = ICONS.play;
      if (gameState.save()) {
        this.showNotification(t('hud.saved'));
      } else {
        this.showNotification(t('hud.saveFailed'), true);
      }
    });

    loadBtn?.addEventListener('click', () => {
      if (!gameState.hasSave()) {
        this.showNotification(t('hud.noSave'), true);
        return;
      }
      tickSystem.pause();
      const pauseIcon = this.pauseButton?.querySelector('.pause-icon');
      if (pauseIcon) pauseIcon.innerHTML = ICONS.play;
      if (gameState.load()) {
        this.updateResources();
        this.updateDay();
        this.showNotification(t('hud.loaded'));
      } else {
        this.showNotification(t('hud.loadFailed'), true);
      }
    });

    for (let i = 0; i < 3; i++) {
      const btn = container.querySelector(`#hud-speed-${i}`) as HTMLButtonElement;
      if (btn) {
        this.speedButtons.push(btn);
        btn.addEventListener('click', () => this.setSpeed(i));
      }
    }

    const volumeSlider = container.querySelector('#hud-volume') as HTMLInputElement;
    const volumeIcon = container.querySelector('.volume-icon') as HTMLSpanElement;

    if (volumeSlider) {
      volumeSlider.value = (musicManager.getVolume() * 100).toString();
      volumeSlider.addEventListener('input', () => {
        const vol = parseInt(volumeSlider.value) / 100;
        musicManager.setVolume(vol);
        localStorage.setItem('aktau-volume', vol.toString());
      });
    }

    if (volumeIcon) {
      volumeIcon.style.cursor = 'pointer';
      volumeIcon.innerHTML = musicManager.isMuted() ? ICONS.volumeOff : ICONS.volumeOn;

      volumeIcon.addEventListener('click', () => {
        const muted = !musicManager.isMuted();
        musicManager.setMuted(muted);
        soundManager.setMuted(muted);
        localStorage.setItem('aktau-muted', muted.toString());
        volumeIcon.innerHTML = muted ? ICONS.volumeOff : ICONS.volumeOn;
      });
    }

    return container;
  }

  private showNotification(message: string, isError = false): void {
    const existing = document.querySelector('.hud-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `hud-notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
  }

  private setSpeed(index: number): void {
    tickSystem.setTickRate(this.speeds[index]);
    this.speedButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }

  private updateResources(): void {
    const resources = gameState.getResources();

    for (const [key, element] of this.resourceElements) {
      const value = resources[key as keyof Resources];
      element.textContent = Math.floor(value).toString();

      if (value < 10) {
        element.classList.add('low');
      } else {
        element.classList.remove('low');
      }
    }

    const reactor = gameState.getReactorState();
    if (this.tempElement) {
      this.tempElement.textContent = Math.floor(reactor.temperature).toString();

      if (reactor.temperature >= 80) {
        this.tempElement.classList.add('critical');
        this.tempElement.classList.remove('warning');
      } else if (reactor.temperature >= 50) {
        this.tempElement.classList.add('warning');
        this.tempElement.classList.remove('critical');
      } else {
        this.tempElement.classList.remove('warning', 'critical');
      }
    }
  }

  private updateTrends(trends: ResourceTrend): void {
    for (const [key, element] of this.trendElements) {
      const value = trends[key as keyof ResourceTrend];
      if (value > 0) {
        element.textContent = `+${value}`;
        element.className = 'hud-trend positive';
      } else if (value < 0) {
        element.textContent = `${value}`;
        element.className = 'hud-trend negative';
      } else {
        element.textContent = '';
        element.className = 'hud-trend';
      }
    }
  }

  private updateDay(): void {
    if (this.dayElement) {
      this.dayElement.textContent = gameState.getDay().toString();
    }
  }

  private updateSeason(): void {
    if (this.seasonElement) {
      const season = gameState.getSeason();
      const mult = gameState.getSeasonMultiplier();
      this.seasonElement.innerHTML = this.seasonIcons[season];
      this.seasonElement.title = td(`season.${season}`, {
        mult: mult.toString()
      });
      this.seasonElement.className = `hud-season icon-wrap ${season}`;
    }
  }

  private flashWarning(): void {
    this.container.classList.add('warning-flash');
    setTimeout(() => {
      this.container.classList.remove('warning-flash');
    }, 500);
  }

  private showGameOver(data: { reason: string; day: number }): void {
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';

    const icons: Record<string, string> = {
      meltdown: ICONS.nuclear,
      drought: ICONS.warning,
      freeze: ICONS.winter,
      extinction: ICONS.warning,
      revolt: ICONS.population
    };

    const icon = icons[data.reason] || ICONS.warning;
    const reasonText = td(`gameover.${data.reason}`);

    overlay.innerHTML = `
      <div class="game-over-content">
        <h1>${t('gameover.title')}</h1>
        <h2><span class="icon-wrap go-icon">${icon}</span> ${reasonText}</h2>
        <p>${t('gameover.survived', { days: data.day })}</p>
        <button id="restart-btn">${t('gameover.restart')}</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#restart-btn')?.addEventListener('click', () => {
      gameState.deleteSave();
      window.location.reload();
    });
  }

  public updateActiveEvents(
    events: Array<{
      event: { id: string; name: string; icon: string };
      remainingDays: number;
    }>
  ): void {
    let eventsContainer = document.getElementById('hud-events');
    if (!eventsContainer) {
      eventsContainer = document.createElement('div');
      eventsContainer.id = 'hud-events';
      eventsContainer.className = 'hud-events';
      this.container.appendChild(eventsContainer);
    }

    if (events.length === 0) {
      eventsContainer.innerHTML = '';
      eventsContainer.style.display = 'none';
      return;
    }

    eventsContainer.style.display = 'flex';
    eventsContainer.innerHTML = events
      .map(
        (e) =>
          `<div class="hud-event" title="${e.event.name} (${t('hud.daysLeft', { days: e.remainingDays })})">
        <span class="event-icon">${e.event.icon}</span>
        <span class="event-days">${e.remainingDays}d</span>
      </div>`
      )
      .join('');
  }

  public dispose(): void {
    this.container.remove();
  }
}
