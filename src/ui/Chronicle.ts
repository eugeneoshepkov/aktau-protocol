import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { gameState } from '../simulation/GameState';
import {
  HISTORICAL_FACTS,
  getFactByTrigger,
  type HistoricalFact
} from '../data/historicalFacts';

const STORAGE_KEY = 'aktau-chronicle-discovered';
const NOTIFICATION_DURATION = 10000; // 10 seconds

export class Chronicle {
  private discoveredFacts: Set<string> = new Set();
  private notificationQueue: HistoricalFact[] = [];
  private currentNotification: HistoricalFact | null = null;
  private notificationTimeout: number | null = null;

  private notificationEl!: HTMLDivElement;
  private modalEl!: HTMLDivElement;
  private archiveEl!: HTMLDivElement;
  private archiveBtn!: HTMLButtonElement;

  // Track building counts for milestone triggers
  private buildingCounts: Record<string, number> = {};
  private hasShownWinterFact = false;
  private hasShownReactorWarning = false;

  constructor() {
    this.loadDiscoveredFacts();
    this.createNotificationElement();
    this.createModalElement();
    this.createArchiveElement();
    this.createArchiveButton();
    this.setupEventListeners();
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

  private createNotificationElement(): void {
    this.notificationEl = document.createElement('div');
    this.notificationEl.id = 'chronicle-notification';
    this.notificationEl.innerHTML = `
      <div class="chronicle-notif-icon">${ICONS.chronicle}</div>
      <div class="chronicle-notif-content">
        <div class="chronicle-notif-text"></div>
        <button class="chronicle-notif-more">Learn more...</button>
      </div>
      <button class="chronicle-notif-close">${ICONS.close}</button>
    `;
    document.body.appendChild(this.notificationEl);

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
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'chronicle-modal';
    this.modalEl.innerHTML = `
      <div class="chronicle-modal-content">
        <div class="chronicle-modal-header">
          <span class="chronicle-modal-category"></span>
          <button class="chronicle-modal-close">${ICONS.close}</button>
        </div>
        <h2 class="chronicle-modal-title"></h2>
        <div class="chronicle-modal-body"></div>
        <div class="chronicle-modal-footer">
          <a class="chronicle-modal-wiki" href="#" target="_blank" rel="noopener noreferrer">
            ${ICONS.externalLink} Read more on Wikipedia
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    // Close handlers
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hideModal();
    });

    const closeBtn = this.modalEl.querySelector('.chronicle-modal-close');
    closeBtn?.addEventListener('click', () => this.hideModal());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('open')) {
        this.hideModal();
      }
      if (e.key === 'Escape' && this.archiveEl.classList.contains('open')) {
        this.hideArchive();
      }
      // J for Journal/Chronicle archive
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if ((e.key === 'j' || e.key === 'J') && !this.modalEl.classList.contains('open') && !this.archiveEl.classList.contains('open')) {
        this.showArchive();
        soundManager.play('click');
      }
    });
  }

  private createArchiveElement(): void {
    this.archiveEl = document.createElement('div');
    this.archiveEl.id = 'chronicle-archive';
    this.archiveEl.innerHTML = `
      <div class="chronicle-archive-content">
        <div class="chronicle-archive-header">
          <h2><span class="chronicle-archive-icon">${ICONS.chronicle}</span> Historical Chronicle</h2>
          <button class="chronicle-archive-close">${ICONS.close}</button>
        </div>
        <div class="chronicle-archive-stats"></div>
        <div class="chronicle-archive-list"></div>
      </div>
    `;
    document.body.appendChild(this.archiveEl);

    // Close handlers
    this.archiveEl.addEventListener('click', (e) => {
      if (e.target === this.archiveEl) this.hideArchive();
    });

    const closeBtn = this.archiveEl.querySelector('.chronicle-archive-close');
    closeBtn?.addEventListener('click', () => this.hideArchive());
  }

  private createArchiveButton(): void {
    this.archiveBtn = document.createElement('button');
    this.archiveBtn.id = 'chronicle-btn';
    this.archiveBtn.innerHTML = `<span class="icon-wrap">${ICONS.chronicle}</span>`;
    this.archiveBtn.title = 'Historical Chronicle (J)';
    this.archiveBtn.addEventListener('click', () => {
      soundManager.play('click');
      this.showArchive();
    });
    document.body.appendChild(this.archiveBtn);
  }

  private setupEventListeners(): void {
    // Day advance - check for day-based facts
    gameState.on('dayAdvance', (day) => {
      this.checkDayTrigger(day as number);
      this.checkSeasonMilestone();
    });

    // Building placed - check for building-based facts
    gameState.on('buildingPlaced', (building) => {
      const b = building as { type: string };
      this.checkBuildingTrigger(b.type);
    });

    // Resource changes - check for population milestones
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

  private checkDayTrigger(day: number): void {
    const fact = getFactByTrigger('day', day);
    if (fact && !this.discoveredFacts.has(fact.id)) {
      this.queueNotification(fact);
    }
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

  private triggerFact(type: string, value: string | number): void {
    const fact = getFactByTrigger(type, value);
    if (fact && !this.discoveredFacts.has(fact.id)) {
      this.queueNotification(fact);
    }
  }

  private queueNotification(fact: HistoricalFact): void {
    // Mark as discovered
    this.discoveredFacts.add(fact.id);
    this.saveDiscoveredFacts();

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

    // Update content
    const textEl = this.notificationEl.querySelector('.chronicle-notif-text');
    if (textEl) textEl.textContent = fact.shortText;

    // Show notification
    this.notificationEl.classList.add('visible');
    soundManager.play('click');

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

    // Show next in queue after a short delay
    setTimeout(() => this.showNextNotification(), 500);
  }

  private showModal(fact: HistoricalFact): void {
    const categoryEl = this.modalEl.querySelector('.chronicle-modal-category');
    const titleEl = this.modalEl.querySelector('.chronicle-modal-title');
    const bodyEl = this.modalEl.querySelector('.chronicle-modal-body');
    const wikiEl = this.modalEl.querySelector('.chronicle-modal-wiki') as HTMLAnchorElement;
    const footerEl = this.modalEl.querySelector('.chronicle-modal-footer');

    if (categoryEl) {
      const categoryLabels: Record<string, string> = {
        city: 'City History',
        reactor: 'Nuclear Technology',
        water: 'Desalination',
        life: 'Daily Life',
        geography: 'Geography'
      };
      categoryEl.textContent = categoryLabels[fact.category] || fact.category;
    }

    if (titleEl) titleEl.textContent = fact.title;

    if (bodyEl) {
      // Convert paragraphs
      bodyEl.innerHTML = fact.fullText
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');
    }

    if (wikiEl && footerEl) {
      if (fact.wikiUrl) {
        wikiEl.href = fact.wikiUrl;
        footerEl.classList.remove('hidden');
      } else {
        footerEl.classList.add('hidden');
      }
    }

    this.modalEl.classList.add('open');
  }

  private hideModal(): void {
    this.modalEl.classList.remove('open');
  }

  private showArchive(): void {
    this.updateArchiveContent();
    this.archiveEl.classList.add('open');
  }

  private hideArchive(): void {
    this.archiveEl.classList.remove('open');
  }

  private updateArchiveContent(): void {
    const statsEl = this.archiveEl.querySelector('.chronicle-archive-stats');
    const listEl = this.archiveEl.querySelector('.chronicle-archive-list');

    const discovered = this.discoveredFacts.size;
    const total = HISTORICAL_FACTS.length;

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="archive-progress">
          <div class="archive-progress-bar" style="width: ${(discovered / total) * 100}%"></div>
        </div>
        <div class="archive-progress-text">${discovered} / ${total} facts discovered</div>
      `;
    }

    if (listEl) {
      const categories: Record<string, HistoricalFact[]> = {
        city: [],
        reactor: [],
        water: [],
        life: [],
        geography: []
      };

      // Group facts by category
      for (const fact of HISTORICAL_FACTS) {
        categories[fact.category].push(fact);
      }

      const categoryLabels: Record<string, string> = {
        city: 'City History',
        reactor: 'Nuclear Technology',
        water: 'Desalination',
        life: 'Daily Life',
        geography: 'Geography'
      };

      listEl.innerHTML = Object.entries(categories)
        .filter(([, facts]) => facts.length > 0)
        .map(([category, facts]) => `
          <div class="archive-category">
            <h3>${categoryLabels[category]}</h3>
            <div class="archive-facts">
              ${facts.map(fact => {
                const isDiscovered = this.discoveredFacts.has(fact.id);
                return `
                  <div class="archive-fact ${isDiscovered ? 'discovered' : 'locked'}"
                       ${isDiscovered ? `data-fact-id="${fact.id}"` : ''}>
                    <span class="archive-fact-title">${isDiscovered ? fact.title : '???'}</span>
                    ${isDiscovered ? `<span class="archive-fact-preview">${fact.shortText.slice(0, 60)}...</span>` : '<span class="archive-fact-locked">Not yet discovered</span>'}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('');

      // Add click handlers for discovered facts
      listEl.querySelectorAll('.archive-fact.discovered').forEach(el => {
        el.addEventListener('click', () => {
          const factId = el.getAttribute('data-fact-id');
          if (factId) {
            const fact = HISTORICAL_FACTS.find(f => f.id === factId);
            if (fact) {
              this.hideArchive();
              setTimeout(() => this.showModal(fact), 200);
            }
          }
        });
      });
    }
  }

  // Public method to manually trigger a fact (for testing)
  public showFact(factId: string): void {
    const fact = HISTORICAL_FACTS.find(f => f.id === factId);
    if (fact) {
      this.queueNotification(fact);
    }
  }

  // Reset discovered facts (for testing)
  public reset(): void {
    this.discoveredFacts.clear();
    this.saveDiscoveredFacts();
    this.buildingCounts = {};
    this.hasShownWinterFact = false;
    this.hasShownReactorWarning = false;
  }
}
