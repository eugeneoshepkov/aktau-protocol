import { gameState } from '../simulation/GameState';
import { soundManager } from '../managers/SoundManager';
import type { BuildingType } from '../types';
import type { BuildPanel } from './BuildPanel';
import { t, td } from '../i18n';

type TutorialStep = 'WELCOME' | 'BUILD_PUMP' | 'BUILD_DESAL' | 'BUILD_HOUSING' | 'COMPLETED';

interface StepConfig {
  translationKey: string;
  target: BuildingType | null;
  targetCount: number;
}

const STEP_CONFIGS: Record<TutorialStep, StepConfig> = {
  WELCOME: {
    translationKey: 'tutorial.welcome',
    target: null,
    targetCount: 0
  },
  BUILD_PUMP: {
    translationKey: 'tutorial.pump',
    target: 'pump',
    targetCount: 1
  },
  BUILD_DESAL: {
    translationKey: 'tutorial.desal',
    target: 'distiller',
    targetCount: 1
  },
  BUILD_HOUSING: {
    translationKey: 'tutorial.housing',
    target: 'microrayon',
    targetCount: 2
  },
  COMPLETED: {
    translationKey: 'tutorial.complete',
    target: null,
    targetCount: 0
  }
};

const STEP_ORDER: TutorialStep[] = ['WELCOME', 'BUILD_PUMP', 'BUILD_DESAL', 'BUILD_HOUSING', 'COMPLETED'];

export class TutorialManager {
  private currentStep: TutorialStep = 'WELCOME';
  private panel: HTMLDivElement;
  private welcomeOverlay: HTMLDivElement;
  private buildPanel: BuildPanel | null = null;
  private completedTimeout: number | null = null;

  constructor() {
    // Create welcome overlay (shown first, centered)
    this.welcomeOverlay = this.createWelcomeOverlay();
    document.body.appendChild(this.welcomeOverlay);

    // Create mission panel (hidden until welcome is dismissed)
    this.panel = this.createPanel();
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    this.setupListeners();
  }

  public setBuildPanel(bp: BuildPanel): void {
    this.buildPanel = bp;
  }

  private createWelcomeOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-box">
        <div class="welcome-header">THE AKTAU PROTOCOL</div>
        <div class="welcome-title">${t('welcome.title')}</div>
        <div class="welcome-desc">${t('welcome.desc')}</div>
        <div class="welcome-note">${t('welcome.note')}</div>
        <button class="welcome-btn">${t('welcome.button')}</button>
      </div>
    `;

    const btn = overlay.querySelector('.welcome-btn');
    btn?.addEventListener('click', () => {
      soundManager.play('click');
      this.dismissWelcome();
    });

    return overlay;
  }

  private dismissWelcome(): void {
    // Fade out welcome overlay
    this.welcomeOverlay.classList.add('fade-out');
    setTimeout(() => {
      this.welcomeOverlay.remove();
    }, 500);

    // Show mission panel with WELCOME step content first
    this.panel.style.display = 'block';
    this.updateUI();

    // Auto-advance to first real step after a delay
    setTimeout(() => {
      this.advanceStep();
    }, 4000);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'mission-panel';
    panel.innerHTML = `
      <div class="mission-header"></div>
      <div class="mission-title"></div>
      <div class="mission-desc"></div>
      <div class="mission-progress"></div>
      <div class="mission-note"></div>
    `;
    return panel;
  }

  private setupListeners(): void {
    gameState.on('buildingPlaced', (data) => {
      const building = data as { type: BuildingType };
      this.onBuildingPlaced(building.type);
    });
  }

  private onBuildingPlaced(type: BuildingType): void {
    const config = STEP_CONFIGS[this.currentStep];

    // Check if this building type matches the current objective
    if (config.target && type === config.target) {
      const progress = this.getProgress();
      this.updateProgressDisplay(progress);

      // Check if objective is complete
      if (progress.current >= progress.target) {
        this.completeStep();
      }
    }
  }

  private getProgress(): { current: number; target: number } {
    const config = STEP_CONFIGS[this.currentStep];
    if (!config.target) {
      return { current: 0, target: 0 };
    }

    const buildings = gameState.getBuildings();
    const count = buildings.filter(b => b.type === config.target).length;
    return { current: count, target: config.targetCount };
  }

  private completeStep(): void {
    // Play success sound
    soundManager.play('success');

    // Flash the panel green
    this.panel.classList.add('step-complete');
    setTimeout(() => {
      this.panel.classList.remove('step-complete');
    }, 500);

    // Advance after a short delay
    setTimeout(() => {
      this.advanceStep();
    }, 800);
  }

  private advanceStep(): void {
    const currentIndex = STEP_ORDER.indexOf(this.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      this.currentStep = STEP_ORDER[currentIndex + 1];
      this.updateUI();

      // If completed, hide panel after a delay
      if (this.currentStep === 'COMPLETED') {
        this.completedTimeout = window.setTimeout(() => {
          this.hidePanel();
        }, 5000);
      }
    }
  }

  private updateUI(): void {
    const config = STEP_CONFIGS[this.currentStep];
    const key = config.translationKey;

    const headerEl = this.panel.querySelector('.mission-header');
    const titleEl = this.panel.querySelector('.mission-title');
    const descEl = this.panel.querySelector('.mission-desc');
    const noteEl = this.panel.querySelector('.mission-note');

    if (headerEl) headerEl.textContent = td(`${key}.header`);
    if (titleEl) titleEl.textContent = td(`${key}.title`);
    if (descEl) descEl.textContent = td(`${key}.desc`);
    if (noteEl) noteEl.textContent = td(`${key}.note`);

    // Update progress display
    const progress = this.getProgress();
    this.updateProgressDisplay(progress);

    // Update button highlighting
    this.updateHighlight();
  }

  private updateProgressDisplay(progress: { current: number; target: number }): void {
    const progressEl = this.panel.querySelector('.mission-progress');
    if (progressEl) {
      if (progress.target > 0) {
        progressEl.textContent = t('tutorial.progress', { current: progress.current, target: progress.target });
        (progressEl as HTMLElement).style.display = 'block';
      } else {
        (progressEl as HTMLElement).style.display = 'none';
      }
    }
  }

  private updateHighlight(): void {
    if (!this.buildPanel) return;

    // Remove highlight from all buttons (reactor excluded since it's auto-placed)
    const allTypes: BuildingType[] = ['pump', 'distiller', 'microrayon', 'water_tank', 'thermal_plant'];
    for (const type of allTypes) {
      const button = this.buildPanel.getButton(type);
      if (button) {
        button.classList.remove('tutorial-highlight');
      }
    }

    // Add highlight to current target
    const config = STEP_CONFIGS[this.currentStep];
    if (config.target) {
      const button = this.buildPanel.getButton(config.target);
      if (button) {
        button.classList.add('tutorial-highlight');
      }
    }
  }

  private hidePanel(): void {
    this.panel.style.transition = 'opacity 0.5s ease-out';
    this.panel.style.opacity = '0';
    setTimeout(() => {
      this.panel.style.display = 'none';
    }, 500);

    // Remove any remaining highlights
    this.updateHighlight();
  }

  public dispose(): void {
    if (this.completedTimeout) {
      clearTimeout(this.completedTimeout);
    }
    this.welcomeOverlay?.remove();
    this.panel.remove();
  }
}
