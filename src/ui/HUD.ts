import { gameState, type ResourceTrend, type Season } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';
import { musicManager } from '../managers/MusicManager';
import { soundManager } from '../managers/SoundManager';
import { ICONS, icon } from './Icons';
import type { Resources } from '../types';
import { t, td } from '../i18n';

// Tooltip content for each HUD resource
type HudTooltipKey = 'day' | 'population' | 'freshWater' | 'seawater' | 'heat' | 'electricity' | 'temp' | 'happiness';

export class HUD {
  private container: HTMLDivElement;
  private resourceElements: Map<string, HTMLSpanElement> = new Map();
  private trendElements: Map<string, HTMLSpanElement> = new Map();
  private dayElement: HTMLSpanElement | null = null;
  private seasonElement: HTMLSpanElement | null = null;
  private tempElement: HTMLSpanElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private speedButtons: HTMLButtonElement[] = [];
  private tooltip: HTMLDivElement;
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

    // Create tooltip element
    this.tooltip = this.createTooltip();
    document.body.appendChild(this.tooltip);

    gameState.on('resourceChange', () => this.updateResources());
    gameState.on('resourceTrend', (data) => this.updateTrends(data as ResourceTrend));
    gameState.on('dayAdvance', () => this.updateDay());
    gameState.on('seasonChange', () => this.updateSeason());
    gameState.on('gameOver', (data) => this.showGameOver(data as { reason: string; day: number }));
    gameState.on('reactorWarning', () => this.flashWarning());

    this.updateResources();
    this.updateDay();
    this.updateSeason();
    this.setupTooltipListeners();
  }

  private createTooltip(): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'hud-tooltip';
    tooltip.style.display = 'none';
    return tooltip;
  }

  private setupTooltipListeners(): void {
    const sections = this.container.querySelectorAll('.hud-section[data-tooltip]');

    sections.forEach((section) => {
      section.addEventListener('mouseenter', (e) => {
        const key = (section as HTMLElement).dataset.tooltip as HudTooltipKey;
        if (key) {
          this.showTooltip(key, e as MouseEvent);
        }
      });

      section.addEventListener('mousemove', (e) => {
        this.positionTooltip(e as MouseEvent);
      });

      section.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  private showTooltip(key: HudTooltipKey, e: MouseEvent): void {
    const content = this.getTooltipContent(key);
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.positionTooltip(e);
  }

  private positionTooltip(e: MouseEvent): void {
    const rect = this.tooltip.getBoundingClientRect();
    let x = e.clientX - rect.width / 2;
    let y = e.clientY + 20;

    // Keep tooltip on screen
    if (x < 10) x = 10;
    if (x + rect.width > window.innerWidth - 10) x = window.innerWidth - rect.width - 10;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private getTooltipContent(key: HudTooltipKey): string {
    const iconColors: Record<string, string> = {
      seawater: '#4a90a4',
      water: '#88ccff',
      heat: '#ff8844',
      electricity: '#ffcc00',
      happiness: '#88ff88',
      nuclear: '#88ff88',
      population: '#ffffff',
      calendar: '#aaaaaa'
    };

    const colorIcon = (name: string, size = 14): string => {
      const color = iconColors[name] || 'currentColor';
      return `<span style="color:${color}">${icon(name as any, size)}</span>`;
    };

    switch (key) {
      case 'day':
        return `
          <div class="tooltip-header">📅 ${t('hud.day')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.day')}</div>
        `;
      case 'population':
        return `
          <div class="tooltip-header">${colorIcon('population')} ${td('hud.pop')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.population')}</div>
        `;
      case 'freshWater':
        return `
          <div class="tooltip-header">${colorIcon('water')} ${t('hud.water')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.freshWater')}</div>
          <div class="tooltip-row">
            <div class="tooltip-produces">${colorIcon('water')} ${td('building.distiller.name')}</div>
            <div class="tooltip-consumes">${colorIcon('population')} ${td('building.microrayon.name')}</div>
          </div>
        `;
      case 'seawater':
        return `
          <div class="tooltip-header">${colorIcon('seawater')} ${t('hud.sea')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.seawater')}</div>
          <div class="tooltip-row">
            <div class="tooltip-produces">${colorIcon('seawater')} ${td('building.pump.name')}</div>
            <div class="tooltip-consumes">${colorIcon('water')} ${td('building.distiller.name')}</div>
          </div>
        `;
      case 'heat':
        return `
          <div class="tooltip-header">${colorIcon('heat')} ${t('hud.heat')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.heat')}</div>
          <div class="tooltip-row">
            <div class="tooltip-produces">${colorIcon('nuclear')} ${td('building.reactor.name')}, ${td('building.thermal_plant.name')}</div>
            <div class="tooltip-consumes">${colorIcon('water')} ${td('building.distiller.name')}, ${colorIcon('population')} ${td('building.microrayon.name')}</div>
          </div>
        `;
      case 'electricity':
        return `
          <div class="tooltip-header">${colorIcon('electricity')} ${t('hud.power')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.electricity')}</div>
          <div class="tooltip-row">
            <div class="tooltip-produces">${colorIcon('nuclear')} ${td('building.reactor.name')}, ${td('building.thermal_plant.name')}</div>
            <div class="tooltip-consumes">All buildings (maintenance)</div>
          </div>
        `;
      case 'temp':
        const reactor = gameState.getReactorState();
        const tempColor = reactor.temperature >= 80 ? '#ff4444' : reactor.temperature >= 50 ? '#ffaa00' : '#88ff88';
        return `
          <div class="tooltip-header">${colorIcon('nuclear')} ${t('hud.temp')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.temp')}</div>
          <div class="tooltip-special" style="color: ${tempColor}">
            ${colorIcon('nuclear')} Current: ${Math.floor(reactor.temperature)}°C
          </div>
        `;
      case 'happiness':
        return `
          <div class="tooltip-header">${colorIcon('happiness')} ${t('hud.mood')}</div>
          <div class="tooltip-desc">${t('hud.tooltip.happiness')}</div>
        `;
      default:
        return '';
    }
  }

  private createHUD(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'hud';
    container.innerHTML = `
      <div class="hud-top">
        <div class="hud-section" data-tooltip="day">
          <span class="hud-label">${t('hud.day')}</span>
          <span id="hud-day" class="hud-value">1</span>
          <span id="hud-season" class="hud-season icon-wrap icon-season">${ICONS.spring}</span>
        </div>
        <div class="hud-section" data-tooltip="population">
          <span class="hud-label"><span class="icon-wrap icon-population">${ICONS.population}</span> ${t('hud.pop')}</span>
          <span id="hud-population" class="hud-value">0</span>
          <span id="hud-trend-population" class="hud-trend"></span>
        </div>
        <div class="hud-section" data-tooltip="freshWater">
          <span class="hud-label"><span class="icon-wrap icon-water">${ICONS.water}</span> ${t('hud.water')}</span>
          <span id="hud-freshWater" class="hud-value">0</span>
          <span id="hud-trend-freshWater" class="hud-trend"></span>
        </div>
        <div class="hud-section" data-tooltip="seawater">
          <span class="hud-label"><span class="icon-wrap icon-seawater">${ICONS.seawater}</span> ${t('hud.sea')}</span>
          <span id="hud-seawater" class="hud-value">0</span>
          <span id="hud-trend-seawater" class="hud-trend"></span>
        </div>
        <div class="hud-section" data-tooltip="heat">
          <span class="hud-label"><span class="icon-wrap icon-heat">${ICONS.heat}</span> ${t('hud.heat')}</span>
          <span id="hud-heat" class="hud-value">0</span>
          <span id="hud-trend-heat" class="hud-trend"></span>
        </div>
        <div class="hud-section" data-tooltip="electricity">
          <span class="hud-label"><span class="icon-wrap icon-electricity">${ICONS.electricity}</span> ${t('hud.power')}</span>
          <span id="hud-electricity" class="hud-value">0</span>
          <span id="hud-trend-electricity" class="hud-trend"></span>
        </div>
        <div class="hud-section reactor-temp" data-tooltip="temp">
          <span class="hud-label"><span class="icon-wrap icon-nuclear">${ICONS.nuclear}</span> ${t('hud.temp')}</span>
          <span id="hud-temp" class="hud-value">0</span>
          <span class="hud-unit">°C</span>
        </div>
        <div class="hud-section" data-tooltip="happiness">
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
      drought: ICONS.water,
      freeze: ICONS.winter,
      extinction: ICONS.population,
      revolt: ICONS.happiness
    };

    // Map reasons to image filenames
    const images: Record<string, string> = {
      meltdown: 'meltdown.png',
      drought: 'drought.png',
      freeze: 'freeze.png',
      extinction: 'extinction.png',
      revolt: 'revolt.png'
    };

    const icon = icons[data.reason] || ICONS.warning;
    const reasonText = td(`gameover.${data.reason}`);
    const storyText = td(`gameover.story.${data.reason}`);
    const imagePath = `/pictures/game-over/${images[data.reason] || 'meltdown.png'}`;

    overlay.innerHTML = `
      <div class="game-over-content">
        <div class="game-over-image-container">
          <img src="${imagePath}" alt="${reasonText}" class="game-over-image" onerror="this.style.display='none'" />
        </div>
        <h1>${t('gameover.title')}</h1>
        <h2><span class="icon-wrap go-icon">${icon}</span> ${reasonText}</h2>
        <p class="game-over-survived">${t('gameover.survived', { days: data.day })}</p>
        <p class="game-over-story">${storyText}</p>
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
    this.tooltip.remove();
  }
}
