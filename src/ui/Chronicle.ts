import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { gameState } from '../simulation/GameState';
import type { DistrictOrder } from '../simulation/DistrictPlan';
import { tickSystem } from '../simulation/TickSystem';
import { HISTORICAL_FACTS, getFactById, getFactByTrigger, type HistoricalFact } from '../data/historicalFacts';
import { getChronicleClue } from './chronicleClue';
import { t, td, i18n } from '../i18n';
import { keyMatches } from '../utils/keyboard';

const STORAGE_KEY = 'aktau-chronicle-discovered';
const STORAGE_KEY_READ = 'aktau-chronicle-read';
const NOTIFICATION_DURATION = 10000; // 10 seconds

export class Chronicle {
  private discoveredFacts: Set<string> = new Set();
  private readFacts: Set<string> = new Set();
  private notificationQueue: HistoricalFact[] = [];
  private currentNotification: HistoricalFact | null = null;
  private notificationTimeout: number | null = null;

  private notificationEl!: HTMLDivElement;
  private modalEl!: HTMLDialogElement;
  private archiveEl!: HTMLDialogElement;
  private archiveBtn!: HTMLButtonElement;
  private unreadBadge!: HTMLSpanElement;

  // Track building counts for milestone triggers
  private buildingCounts: Record<string, number> = {};
  private hasShownWinterFact = false;
  private hasShownReactorWarning = false;

  constructor(notices: HTMLElement) {
    this.loadDiscoveredFacts();
    this.loadReadFacts();
    this.createNotificationElement(notices);
    this.createModalElement();
    this.createArchiveElement();
    this.createArchiveButton();
    this.setupEventListeners();

    if (gameState.getDay() === 1) this.triggerFact('day', 1, false);
  }

  private loadDiscoveredFacts(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.discoveredFacts = new Set(JSON.parse(stored));
      }
    } catch {
      this.discoveredFacts = new Set();
    }
  }

  private saveDiscoveredFacts(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.discoveredFacts]));
  }

  private loadReadFacts(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ);
      if (stored) {
        this.readFacts = new Set(JSON.parse(stored));
      }
    } catch {
      this.readFacts = new Set();
    }
  }

  private saveReadFacts(): void {
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify([...this.readFacts]));
  }

  private getUnreadCount(): number {
    let count = 0;
    for (const factId of this.discoveredFacts) {
      if (!this.readFacts.has(factId)) {
        count++;
      }
    }
    return count;
  }

  private updateUnreadBadge(): void {
    const count = this.getUnreadCount();
    if (count > 0) {
      this.unreadBadge.textContent = String(count);
      this.unreadBadge.classList.add('visible');
      this.archiveBtn.classList.add('has-unread');
    } else {
      this.unreadBadge.classList.remove('visible');
      this.archiveBtn.classList.remove('has-unread');
    }
  }

  private markAsRead(factId: string): void {
    if (!this.readFacts.has(factId)) {
      this.readFacts.add(factId);
      this.saveReadFacts();
      this.updateUnreadBadge();
    }
  }

  private createNotificationElement(notices: HTMLElement): void {
    this.notificationEl = document.createElement('div');
    this.notificationEl.id = 'chronicle-notification';
    this.notificationEl.innerHTML = `
      <div class="chronicle-notif-icon">${ICONS.chronicle}</div>
      <div class="chronicle-notif-content">
        <div class="chronicle-notif-text"></div>
        <button class="chronicle-notif-more">${t('chronicle.learnMore')}</button>
      </div>
      <button class="chronicle-notif-close">${ICONS.close}</button>
    `;
    notices.append(this.notificationEl);

    // Event listeners
    const moreBtn = this.notificationEl.querySelector('.chronicle-notif-more');
    moreBtn?.addEventListener('click', () => {
      if (this.currentNotification) {
        this.showModal(this.currentNotification);
        this.hideNotification();
      }
    });

    const closeBtn = this.notificationEl.querySelector('.chronicle-notif-close');
    closeBtn?.addEventListener('click', () => this.hideNotification());
  }

  private createModalElement(): void {
    this.modalEl = document.createElement('dialog');
    this.modalEl.id = 'chronicle-modal';
    this.modalEl.setAttribute('aria-labelledby', 'chronicle-story-title');
    this.modalEl.innerHTML = `
      <div class="chronicle-modal-content">
        <div class="chronicle-modal-header">
          <span class="chronicle-modal-category"></span>
          <button class="chronicle-modal-close" autofocus aria-label="${t('menu.close')}">${ICONS.close}</button>
        </div>
        <h2 id="chronicle-story-title" class="chronicle-modal-title"></h2>
        <figure class="chronicle-modal-image-container">
          <img class="chronicle-modal-image" alt="" />
          <figcaption class="chronicle-illustration-credit">${t('chronicle.illustration')}</figcaption>
        </figure>
        <div class="chronicle-modal-body">
          <figure class="chronicle-field-report" hidden>
            <figcaption>${t('chronicle.slip')}</figcaption>
            <dl><dt>${t('chronicle.material')}</dt><dd>${t('chronicle.metal')}</dd></dl>
          </figure>
          <div class="chronicle-modal-text"></div>
        </div>
        <div class="chronicle-modal-footer">
          <button class="chronicle-modal-back">
            ← ${t('chronicle.backToArchive')}
          </button>
          <a class="chronicle-modal-wiki" href="#" target="_blank" rel="noopener noreferrer">
            ${ICONS.externalLink} <span></span>
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    // Close handlers
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hideModal();
    });
    this.modalEl.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.hideModal();
    });

    const closeBtn = this.modalEl.querySelector('.chronicle-modal-close');
    closeBtn?.addEventListener('click', () => this.hideModal());

    // Back to archive button
    const backBtn = this.modalEl.querySelector('.chronicle-modal-back');
    backBtn?.addEventListener('click', () => {
      this.hideModal();
      this.showArchive(this.modalEl.dataset.factId);
    });

    window.addEventListener('keydown', (e) => {
      // J for Journal/Chronicle archive
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (
        keyMatches(e.key, 'j') &&
        !this.modalEl.open &&
        !this.archiveEl.open
      ) {
        this.showArchive();
        soundManager.play('click');
      }
    });
  }

  private createArchiveElement(): void {
    this.archiveEl = document.createElement('dialog');
    this.archiveEl.id = 'chronicle-archive';
    this.archiveEl.setAttribute('aria-labelledby', 'chronicle-archive-title');
    this.archiveEl.innerHTML = `
      <div class="chronicle-archive-content">
        <div class="chronicle-archive-header">
          <div class="chronicle-archive-heading">
            <h2 id="chronicle-archive-title">${t('chronicle.archiveTitle')}</h2>
            <div class="chronicle-archive-stats"></div>
          </div>
          <button class="chronicle-archive-close" autofocus aria-label="${t('menu.close')}">${ICONS.close}</button>
        </div>
        <div class="chronicle-archive-list">
          <div class="chronicle-archive-entries"></div>
          <div class="chronicle-archive-footer">
            <details><summary>${t('chronicle.options')}</summary>
              <button class="chronicle-reset-btn">${t('chronicle.reset')}</button>
            </details>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.archiveEl);

    // Close handlers
    this.archiveEl.addEventListener('click', (e) => {
      if (e.target === this.archiveEl) this.hideArchive();
    });
    this.archiveEl.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.hideArchive();
    });

    this.archiveEl.querySelector('.chronicle-archive-entries')!.addEventListener('click', (e) => {
      const card = e.target instanceof Element && e.target.closest<HTMLButtonElement>('[data-fact-id]');
      const fact = card && getFactById(card.dataset.factId!);
      if (!fact) return;
      this.hideArchive();
      this.showModal(fact);
    });

    const closeBtn = this.archiveEl.querySelector('.chronicle-archive-close');
    closeBtn?.addEventListener('click', () => this.hideArchive());

    // Reset button handler
    const resetBtn = this.archiveEl.querySelector('.chronicle-reset-btn');
    resetBtn?.addEventListener('click', () => {
      if (!window.confirm(t('chronicle.confirmReset'))) return;
      this.reset();
      this.updateArchiveContent();
      this.archiveEl.querySelector<HTMLDetailsElement>('details')!.open = false;
      this.archiveEl.querySelector<HTMLElement>('summary')!.focus();
      soundManager.play('click');
    });
  }

  private createArchiveButton(): void {
    this.archiveBtn = document.createElement('button');
    this.archiveBtn.id = 'chronicle-btn';
    this.archiveBtn.setAttribute('aria-label', t('shortcuts.chronicle'));
    this.archiveBtn.innerHTML = `<span class="icon-wrap">${ICONS.chronicle}</span><span class="mobile-menu-label">${t('chronicle.short')}</span>`;
    this.archiveBtn.title = t('chronicle.button');
    this.archiveBtn.addEventListener('click', () => {
      soundManager.play('click');
      this.showArchive();
    });

    // Add unread badge
    this.unreadBadge = document.createElement('span');
    this.unreadBadge.className = 'chronicle-unread-badge';
    this.archiveBtn.appendChild(this.unreadBadge);

    document.body.appendChild(this.archiveBtn);

    // Update badge after creation
    this.updateUnreadBadge();
  }

  private setupEventListeners(): void {
    // Day advance - check for day-based facts
    gameState.on('dayAdvance', (day) => {
      this.triggerFact('day', day as number);
      this.checkSeasonMilestone();
    });

    // Building placed - check for building-based facts
    gameState.on('buildingPlaced', (building) => {
      const b = building as { type: string };
      this.checkBuildingTrigger(b.type);
    });

    gameState.on('orderComplete', (order) => {
      if ((order as DistrictOrder).id === 'homes') this.triggerFact('milestone', 'first_move_in');
    });

    // A save can be restored either before the Chronicle starts or later from the HUD.
    const restoreMoveIn = () => {
      if (gameState.getCompletedOrders() > 0) this.triggerFact('milestone', 'first_move_in', false);
    };
    restoreMoveIn();
    gameState.on('cityLoaded', restoreMoveIn);
    gameState.on('resourceChange', () => {
      this.checkPopulationMilestones();
    });

    // Reactor warning
    gameState.on('reactorWarning', () => {
      if (!this.hasShownReactorWarning) {
        this.hasShownReactorWarning = true;
        this.triggerFact('milestone', 'reactor_warning');
      }
    });
  }

  private checkBuildingTrigger(buildingType: string): void {
    // Track building counts
    this.buildingCounts[buildingType] = (this.buildingCounts[buildingType] || 0) + 1;

    // First building of type
    if (this.buildingCounts[buildingType] === 1) {
      this.triggerFact('building', buildingType);
    }

    // Total building milestones
    const totalBuildings = Object.values(this.buildingCounts).reduce((a, b) => a + b, 0);
    if (totalBuildings === 5) {
      this.triggerFact('building', 5);
    } else if (totalBuildings === 10) {
      this.triggerFact('building', 10);
    }
  }

  private checkPopulationMilestones(): void {
    const population = gameState.getResources().population;

    if (population >= 200) {
      this.triggerFact('milestone', 'population_200');
    }
    if (population >= 500) {
      this.triggerFact('milestone', 'population_500');
    }
  }

  private checkSeasonMilestone(): void {
    const season = gameState.getSeason();
    if (season === 'winter' && !this.hasShownWinterFact) {
      // Show winter fact after surviving a few days of winter
      const day = gameState.getDay();
      const seasonDay = day % 30;
      if (seasonDay >= 5) {
        this.hasShownWinterFact = true;
        this.triggerFact('milestone', 'survive_winter');
      }
    }
  }

  private triggerFact(
    type: HistoricalFact['trigger']['type'],
    value: string | number,
    notify = gameState.getCompletedOrders() > 0
  ): void {
    const fact = getFactByTrigger(type, value);
    if (fact && !this.discoveredFacts.has(fact.id)) {
      this.discover(fact, notify);
    }
  }

  private discover(fact: HistoricalFact, notify: boolean): void {
    // Mark as discovered
    this.discoveredFacts.add(fact.id);
    this.saveDiscoveredFacts();

    // Update unread badge
    this.updateUnreadBadge();
    if (!notify) return;

    // Add to queue
    this.notificationQueue.push(fact);

    // If no current notification, show this one
    if (!this.currentNotification) {
      this.showNextNotification();
    }
  }

  private showNextNotification(): void {
    if (this.notificationQueue.length === 0) {
      this.currentNotification = null;
      return;
    }

    const fact = this.notificationQueue.shift()!;
    this.currentNotification = fact;

    // Update content - use translated text
    const textEl = this.notificationEl.querySelector('.chronicle-notif-text');
    if (textEl) textEl.textContent = td(`fact.${fact.id}.short`);

    // Show notification
    this.notificationEl.classList.add('visible');
    soundManager.play('discover');

    // Auto-hide after duration
    this.notificationTimeout = window.setTimeout(() => {
      this.hideNotification();
    }, NOTIFICATION_DURATION);
  }

  private hideNotification(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }

    this.notificationEl.classList.remove('visible');
    this.currentNotification = null;

    if (this.notificationQueue.length) {
      setTimeout(() => {
        if (!this.currentNotification) this.showNextNotification();
      }, 500);
    }
  }

  private showModal(fact: HistoricalFact): void {
    const categoryEl = this.modalEl.querySelector('.chronicle-modal-category');
    const titleEl = this.modalEl.querySelector('.chronicle-modal-title');
    const bodyEl = this.modalEl.querySelector('.chronicle-modal-text');
    const source = this.modalEl.querySelector<HTMLAnchorElement>('.chronicle-modal-wiki')!;

    const imageContainer = this.modalEl.querySelector('.chronicle-modal-image-container');
    const imageEl = this.modalEl.querySelector('.chronicle-modal-image') as HTMLImageElement;

    if (categoryEl) {
      categoryEl.textContent = td(`chronicle.category.${fact.category}`);
    }

    if (titleEl) titleEl.textContent = td(`fact.${fact.id}.title`);

    const report = this.modalEl.querySelector<HTMLElement>('.chronicle-field-report')!;
    report.hidden = fact.id !== 'closed-city';
    if (imageContainer && imageEl) {
      imageContainer.classList.remove('hidden');
      imageEl.onerror = () => imageContainer.classList.add('hidden');
      imageEl.alt = td(`fact.${fact.id}.imageAlt`);
      imageEl.src = `/pictures/chronicle/${fact.id}.webp`;
    }

    if (bodyEl) {
      // Convert paragraphs - use translated text
      const fullText = td(`fact.${fact.id}.full`);
      bodyEl.innerHTML = fullText
        .split('\n\n')
        .map((p) => `<p>${p}</p>`)
        .join('');
    }

    const url = fact.articleUrl ?? fact.wikiUrls?.[i18n.getLocale()] ?? fact.wikiUrls?.en;
    source.hidden = !url;
    if (url) {
      source.href = url;
      const label = fact.articleUrl ? 'sight.source' : 'chronicle.wikiLink';
      source.querySelector('span')!.textContent = t(fact.id === 'closed-city' ? 'chronicle.paper' : label);
    }

    // Mark as read when modal is opened
    this.markAsRead(fact.id);

    this.modalEl.dataset.factId = fact.id;
    this.modalEl.classList.add('open');
    this.modalEl.showModal();
    this.modalEl.querySelector('.chronicle-modal-content')!.scrollTop = 0;
    tickSystem.onModalOpen();
  }

  private hideModal(): void {
    this.modalEl.close();
    this.modalEl.classList.remove('open');
    tickSystem.onModalClose();
  }

  private showArchive(focusFactId?: string): void {
    this.updateArchiveContent();
    this.archiveEl.querySelector<HTMLDetailsElement>('details')!.open = false;
    this.archiveEl.classList.add('open');
    this.archiveEl.showModal();
    if (focusFactId) {
      this.archiveEl.querySelector<HTMLButtonElement>(`[data-fact-id="${focusFactId}"]`)?.focus();
    } else {
      this.archiveEl.querySelector('.chronicle-archive-list')!.scrollTop = 0;
    }
    tickSystem.onModalOpen();
  }

  private hideArchive(): void {
    this.archiveEl.close();
    this.archiveEl.classList.remove('open');
    tickSystem.onModalClose();
  }

  private updateArchiveContent(): void {
    // The saved discovery order puts the player's latest clipping on the cover.
    const stories = Array.from(this.discoveredFacts, getFactById)
      .filter((fact): fact is HistoricalFact => fact !== undefined)
      .reverse();
    const total = HISTORICAL_FACTS.length;
    this.archiveEl.querySelector('.chronicle-archive-stats')!.innerHTML = `
      <span class="archive-progress-text">${t('chronicle.discovered', { count: stories.length, total })}</span>
      <div class="archive-progress" aria-hidden="true"><div class="archive-progress-bar" style="width:${100 * stories.length / total}%"></div></div>`;

    const sections: string[] = [];
    for (const category of new Set(stories.map((fact) => fact.category))) {
      const entries = stories.filter((fact) => fact.category === category);
      const cards = entries.map(({ id }) => {
        const unread = !this.readFacts.has(id);
        const thumbnail = `/pictures/chronicle/thumbnail/${id}.webp`;
        const cover = id === stories[0].id
          ? `srcset="${thumbnail} 320w, /pictures/chronicle/${id}.webp 960w" sizes="(max-width: 660px) calc(100vw - 60px), 370px"`
          : '';
        return `<button type="button" class="archive-fact discovered${unread ? ' unread' : ''}" data-fact-id="${id}">
          <img class="archive-fact-image" src="${thumbnail}" ${cover} alt="" loading="lazy" decoding="async">
          <span class="archive-fact-copy">
            ${unread ? `<span class="archive-fact-new">${t('chronicle.new')}</span>` : ''}
            <span class="archive-fact-title">${td(`fact.${id}.title`)}</span>
            <span class="archive-fact-preview">${td(`fact.${id}.short`)}</span>
          </span>
        </button>`;
      });
      sections.push(`<section class="archive-category">
        <h3>${td(`chronicle.category.${category}`)}</h3>
        <div class="archive-facts">${cards.join('')}</div>
      </section>`);
    }

    const clue = getChronicleClue(this.discoveredFacts);
    this.archiveEl.querySelector('.chronicle-archive-entries')!.innerHTML =
      (clue ? `<p class="archive-clue"><span aria-hidden="true">${ICONS.pin}</span>${clue}</p>` : '') +
      sections.join('');
  }

  // Public method to manually trigger a fact (for testing)
  public showFact(factId: string): void {
    const fact = HISTORICAL_FACTS.find((f) => f.id === factId);
    if (fact) {
      this.discover(fact, true);
    }
  }

  // Reset discovered facts (for testing)
  public reset(): void {
    this.notificationQueue = [];
    this.hideNotification();
    this.discoveredFacts.clear();
    this.saveDiscoveredFacts();
    this.readFacts.clear();
    this.saveReadFacts();
    this.updateUnreadBadge();
    this.buildingCounts = {};
    this.hasShownWinterFact = false;
    this.hasShownReactorWarning = false;
  }
}
