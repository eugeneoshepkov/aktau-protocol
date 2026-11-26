import { gameState, SEASONS, SEASON_LENGTH, type ResourceTrend, type Season } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';
import { musicManager } from '../managers/MusicManager';
import { soundManager } from '../managers/SoundManager';
import { ICONS, icon } from './Icons';
import type { Resources } from '../types';
import { t, td } from '../i18n';

// Tooltip content for each HUD resource
type HudTooltipKey = 'population' | 'freshWater';

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
  private popoverLayout?: ResizeObserver;
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
        if (key && window.matchMedia('(hover: hover)').matches) {
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
    const colorIcon = (name: 'water' | 'population'): string =>
      `<span class="icon-${name}">${icon(name, 14)}</span>`;

    switch (key) {
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
      default:
        return '';
    }
  }

  private createHUD(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'hud';
    const readings = [
      ['seawater', 'seawater', 'hud.sea'],
      ['heat', 'heat', 'hud.heat'],
      ['electricity', 'electricity', 'hud.power'],
      ['temp', 'nuclear', 'hud.temp'],
      ['happiness', 'happiness', 'hud.mood']
    ] as const;
    container.innerHTML = `
      <div class="hud-top">
        <div class="district-name"><span>${ICONS.atom}</span>AKTAU</div>
        <div class="hud-resources">
        <button class="hud-section hud-calendar" popovertarget="season-calendar">
          <span class="hud-label">${t('hud.day')} <span class="hud-season-name">· <span id="season-name"></span></span></span>
          <span id="hud-day" class="hud-value">1</span>
          <span id="hud-season" class="hud-season icon-wrap icon-season">${ICONS.spring}</span>
        </button>
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
        <button type="button" id="hud-status-toggle" popovertarget="city-status" aria-controls="city-status" aria-label="${t('hud.status')}">
          <span class="status-full">${t('hud.status')}</span><span class="status-short">${t('hud.statusShort')}</span><span class="status-chevron" aria-hidden="true"></span>
        </button>
        </div>
        <div class="hud-controls">
          <button id="hud-pause" class="hud-button" title="${t('hud.pause')}"><span class="icon-wrap pause-icon">${ICONS.pause}</span></button>
          <div class="hud-speeds" role="group" aria-label="${t('hud.speed')}">
            <span class="mobile-menu-label">${t('hud.speed')}</span>
            <button id="hud-speed-0" class="hud-button speed-btn active" aria-pressed="true">1×</button>
            <button id="hud-speed-1" class="hud-button speed-btn" aria-pressed="false">2×</button>
            <button id="hud-speed-2" class="hud-button speed-btn" aria-pressed="false">4×</button>
          </div>
          <details class="hud-options"><summary title="${t('hud.options')}" aria-label="${t('hud.options')}">•••</summary><div class="hud-options-menu">
          <button id="hud-save" class="hud-button" title="${t('hud.save')}"><span class="icon-wrap">${ICONS.save}</span>${t('hud.save')}</button>
          <button id="hud-load" class="hud-button" title="${t('hud.load')}"><span class="icon-wrap">${ICONS.load}</span>${t('hud.load')}</button>
          <span class="hud-volume-control" title="${t('hud.volume')}">
            <button class="volume-icon icon-wrap" title="${t('intro.mute')}">${ICONS.volumeOn}</button>
            <input type="range" id="hud-volume" min="0" max="100" value="30" class="volume-slider" title="${t('hud.volume')}">
          </span>
          </div></details>
        </div>
      </div>
      <section id="city-status" popover="auto" aria-labelledby="city-status-heading">
        <header><h2 id="city-status-heading">${t('hud.status')}</h2>
          <button type="button" class="hud-button" aria-label="${t('menu.close')}" popovertarget="city-status" popovertargetaction="hide" autofocus>${icon('close')}</button>
        </header>
        ${readings.map(([key, symbol, label]) => `
          <div class="hud-reading">
            <span class="reading-label"><span class="icon-wrap icon-${symbol}">${ICONS[symbol]}</span> ${t(label)}</span>
            <span class="reading-measure"><strong class="hud-value" id="hud-${key}">0</strong>${key === 'temp' ? '%' : ` <span id="hud-trend-${key}" class="hud-trend"></span>`}</span>
            <p>${t(`hud.tooltip.${key}`)}</p>
          </div>`).join('')}
      </section>
    `;

    const calendar = document.createElement('div');
    calendar.id = 'season-calendar';
    calendar.setAttribute('popover', 'auto');
    calendar.innerHTML = '<strong id="calendar-demand"></strong><span id="calendar-next"></span>';
    container.appendChild(calendar);
    const status = container.querySelector<HTMLElement>('#city-status')!;
    const statusButton = container.querySelector<HTMLButtonElement>('#hud-status-toggle')!;
    const calendarButton = container.querySelector<HTMLButtonElement>('.hud-calendar')!;
    const positionPopovers = () => {
      for (const [button, panel, width] of [[calendarButton, calendar, 244], [statusButton, status, 310]] as const) {
        const bounds = button.getBoundingClientRect();
        panel.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))}px`;
        panel.style.top = `${bounds.bottom + 7}px`;
      }
    };
    this.popoverLayout = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--hud-height', `${entry.contentRect.height}px`);
      positionPopovers();
    });
    this.popoverLayout.observe(container);
    calendar.addEventListener('beforetoggle', positionPopovers);
    status.addEventListener('beforetoggle', positionPopovers);
    status.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.stopPropagation();
    });
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

    this.pauseButton?.addEventListener('click', () => this.togglePause());
    const options = container.querySelector<HTMLDetailsElement>('.hud-options')!;
    document.addEventListener('pointerdown', (event) => {
      if (!options.contains(event.target as Node)) options.open = false;
    });
    container.querySelectorAll('#hud-save, #hud-load').forEach((button) => {
      button.addEventListener('click', () => { options.open = false; });
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
        this.updateSeason();
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

  public togglePause(): void {
    tickSystem.togglePause();
    const icon = this.pauseButton?.querySelector('.pause-icon');
    if (icon) icon.innerHTML = tickSystem.isPausedState() ? ICONS.play : ICONS.pause;
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
      btn.setAttribute('aria-pressed', String(i === index));
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
      const day = gameState.getDay();
      this.dayElement.textContent = String(day);
      const season = gameState.getSeason();
      const next = SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length];
      this.container.querySelector('#calendar-next')!.textContent = t('calendar.next', {
        season: t(`calendar.${next}`), day: day + SEASON_LENGTH - ((day - 1) % SEASON_LENGTH)
      });
    }
  }

  private updateSeason(): void {
    if (this.seasonElement) {
      const season = gameState.getSeason();
      const mult = gameState.getSeasonMultiplier();
      this.seasonElement.innerHTML = this.seasonIcons[season];
      this.container.querySelector('#season-name')!.textContent = t(`calendar.${season}`);
      this.container.querySelector('#calendar-demand')!.textContent = t(`season.${season}`, { mult });
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

    const expanded = new Set(
      [...eventsContainer.querySelectorAll<HTMLDetailsElement>('details[open]')].map((event) => event.dataset.id)
    );
    eventsContainer.style.display = 'flex';
    eventsContainer.innerHTML = events.map(({ event, remainingDays }) => `
      <details class="hud-event" data-id="${event.id}" ${expanded.has(event.id) ? 'open' : ''}>
        <summary><span aria-hidden="true">${event.icon}</span>
          <strong>${td(`event.${event.id}.name`)}</strong>
          <small>${t('hud.daysLeft', { days: remainingDays })}</small></summary>
        <p>${td(`event.${event.id}.desc`)}</p>
      </details>`).join('');

  }

  public dispose(): void {
    this.popoverLayout?.disconnect();
    this.container.remove();
    this.tooltip.remove();
  }
}
