import { gameState } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';

interface TutorialStep {
  id: string;
  text: string;
  target?: string;
  condition: () => boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    text: 'Welcome to Aktau! Your goal is to sustain the city by balancing water, heat, and power.',
    condition: () => true
  },
  {
    id: 'build-pump',
    text: '🌊 First, build a Water Pump on the SEA tiles (teal area) to extract seawater.',
    target: 'pump',
    condition: () => gameState.getBuildings().some(b => b.type === 'pump')
  },
  {
    id: 'build-reactor',
    text: '☢️ Build a BN-350 Reactor on ROCK tiles (gray) to generate heat and power. Watch the temperature!',
    target: 'reactor',
    condition: () => gameState.getBuildings().some(b => b.type === 'reactor')
  },
  {
    id: 'build-distiller',
    text: '💧 Build a Desalination Plant to convert seawater into freshwater. It also cools the reactor!',
    target: 'distiller',
    condition: () => gameState.getBuildings().some(b => b.type === 'distiller')
  },
  {
    id: 'build-housing',
    text: '🏠 Build Microrayon Housing on SAND tiles to house your population and generate happiness.',
    target: 'microrayon',
    condition: () => gameState.getBuildings().some(b => b.type === 'microrayon')
  },
  {
    id: 'complete',
    text: '✅ Great job! Monitor your resources, keep the reactor cool, and survive as long as you can!',
    condition: () => gameState.getDay() >= 5
  }
];

export class Tutorial {
  private overlay: HTMLDivElement;
  private stepIndex = 0;
  private completed = false;
  private skipBtn: HTMLButtonElement | null = null;

  constructor() {
    if (this.hasSeen()) {
      this.completed = true;
      this.overlay = document.createElement('div');
      return;
    }

    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);

    tickSystem.pause();
    this.showStep(0);

    gameState.on('buildingPlaced', () => this.checkProgress());
    gameState.on('dayAdvance', () => this.checkProgress());
  }

  private hasSeen(): boolean {
    return localStorage.getItem('aktau-tutorial-seen') === 'true';
  }

  private markSeen(): void {
    localStorage.setItem('aktau-tutorial-seen', 'true');
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-box">
        <div class="tutorial-text"></div>
        <div class="tutorial-actions">
          <button class="tutorial-next">Continue</button>
          <button class="tutorial-skip">Skip Tutorial</button>
        </div>
      </div>
    `;

    const nextBtn = overlay.querySelector('.tutorial-next') as HTMLButtonElement;
    this.skipBtn = overlay.querySelector('.tutorial-skip') as HTMLButtonElement;

    nextBtn.addEventListener('click', () => {
      if (this.stepIndex === 0) {
        tickSystem.resume();
      }
      this.advance();
    });

    this.skipBtn.addEventListener('click', () => {
      this.complete();
      tickSystem.resume();
    });

    return overlay;
  }

  private showStep(index: number): void {
    if (index >= TUTORIAL_STEPS.length) {
      this.complete();
      return;
    }

    const step = TUTORIAL_STEPS[index];
    const textEl = this.overlay.querySelector('.tutorial-text');
    if (textEl) {
      textEl.textContent = step.text;
    }

    const nextBtn = this.overlay.querySelector('.tutorial-next') as HTMLButtonElement;
    if (index === 0) {
      nextBtn.textContent = 'Start';
    } else if (index === TUTORIAL_STEPS.length - 1) {
      nextBtn.textContent = 'Got it!';
    } else {
      nextBtn.textContent = 'Continue';
      nextBtn.disabled = !step.condition();
    }
  }

  private advance(): void {
    const currentStep = TUTORIAL_STEPS[this.stepIndex];
    if (currentStep.condition()) {
      this.stepIndex++;
      if (this.stepIndex >= TUTORIAL_STEPS.length) {
        this.complete();
      } else {
        this.showStep(this.stepIndex);
      }
    }
  }

  private checkProgress(): void {
    if (this.completed) return;

    const step = TUTORIAL_STEPS[this.stepIndex];
    if (step && step.condition()) {
      const nextBtn = this.overlay.querySelector('.tutorial-next') as HTMLButtonElement;
      if (nextBtn) {
        nextBtn.disabled = false;
      }
    }
  }

  private complete(): void {
    this.completed = true;
    this.markSeen();
    this.overlay.remove();
  }

  public dispose(): void {
    this.overlay.remove();
  }

  public static resetTutorial(): void {
    localStorage.removeItem('aktau-tutorial-seen');
  }
}
