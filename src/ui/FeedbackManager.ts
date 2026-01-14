import { gameState } from '../simulation/GameState';
import { getCameraInstance } from '../engine/Camera';
import type { BuildingType } from '../types';

interface Hint {
  id: string;
  text: string;
  priority: number;
}

class FeedbackManagerClass {
  private toastContainer: HTMLDivElement | null = null;
  private hintBar: HTMLDivElement | null = null;
  private currentHint: Hint | null = null;
  private previousBuildingState = {
    hasPump: false,
    hasReactor: false,
    hasDistiller: false,
    hasHousing: false
  };

  public initialize(): void {
    this.createToastContainer();
    this.createHintBar();

    gameState.on('resourceChange', () => this.checkGameState());
    gameState.on('buildingPlaced', () => this.onBuildingPlaced());
    gameState.on('dayAdvance', () => this.checkGameState());

    setTimeout(() => this.checkGameState(), 1000);
  }

  private createToastContainer(): void {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    document.body.appendChild(this.toastContainer);
  }

  private createHintBar(): void {
    this.hintBar = document.createElement('div');
    this.hintBar.id = 'hint-bar';
    this.hintBar.innerHTML = `
      <span class="hint-icon">💡</span>
      <span class="hint-text"></span>
      <button class="hint-dismiss">✕</button>
    `;
    this.hintBar.style.display = 'none';
    document.body.appendChild(this.hintBar);

    const dismissBtn = this.hintBar.querySelector('.hint-dismiss');
    dismissBtn?.addEventListener('click', () => this.hideHint());
  }

  private onBuildingPlaced(): void {
    const buildings = gameState.getBuildings();
    const newState = {
      hasPump: buildings.some(b => b.type === 'pump'),
      hasReactor: buildings.some(b => b.type === 'reactor'),
      hasDistiller: buildings.some(b => b.type === 'distiller'),
      hasHousing: buildings.some(b => b.type === 'microrayon')
    };

    if (this.currentHint) {
      const shouldClose =
        (this.currentHint.id === 'start' && newState.hasPump && !this.previousBuildingState.hasPump) ||
        (this.currentHint.id === 'need-reactor' && newState.hasReactor && !this.previousBuildingState.hasReactor) ||
        (this.currentHint.id === 'need-distiller' && newState.hasDistiller && !this.previousBuildingState.hasDistiller) ||
        (this.currentHint.id === 'need-housing' && newState.hasHousing && !this.previousBuildingState.hasHousing) ||
        (this.currentHint.id === 'low-power' && newState.hasReactor && !this.previousBuildingState.hasReactor) ||
        (this.currentHint.id === 'high-temp' && newState.hasDistiller && !this.previousBuildingState.hasDistiller);

      if (shouldClose) {
        this.hideHint();
        this.showToast('✓ Good job!', 'success');
      }
    }

    this.previousBuildingState = newState;

    setTimeout(() => this.checkGameState(), 500);
  }

  public showPlacementError(reason: string, buildingType?: BuildingType): void {
    const friendlyMessage = this.getFriendlyErrorMessage(reason, buildingType);
    this.showToast(friendlyMessage, 'error');

    const camera = getCameraInstance();
    if (camera) {
      camera.shake(0.25, 0.15);
    }

    if (reason.includes('Not enough')) {
      const resource = reason.replace('Not enough ', '');
      this.highlightResource(resource);
      this.flashHUD();
    }
  }

  private flashHUD(): void {
    const hud = document.getElementById('hud');
    if (!hud) return;

    hud.classList.add('error-flash');
    setTimeout(() => {
      hud.classList.remove('error-flash');
    }, 400);
  }

  private getFriendlyErrorMessage(reason: string, buildingType?: BuildingType): string {
    if (reason.includes('cannot be placed on')) {
      const tileHints: Record<BuildingType, string> = {
        pump: '🌊 Pumps → sea tiles (teal)',
        reactor: '☢️ Reactors → rock tiles (gray)',
        distiller: '💧 Distillers → sand or rock',
        microrayon: '🏠 Housing → sand tiles (beige)',
        water_tank: '🛢️ Tanks → sand or rock',
        thermal_plant: '🏭 Thermal Plant → sand or rock'
      };
      return buildingType ? tileHints[buildingType] : reason;
    }

    if (reason.includes('Not enough electricity')) {
      return '⚡ Need more electricity!';
    }
    if (reason.includes('Not enough freshWater')) {
      return '💧 Need more fresh water!';
    }
    if (reason.includes('Not enough heat')) {
      return '🔥 Need more heat!';
    }
    if (reason.includes('occupied')) {
      return '🚫 Tile occupied';
    }
    if (reason.includes('Game is over')) {
      return '☠️ Game over!';
    }

    return reason;
  }

  public showToast(message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info'): void {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  public highlightResource(resource: string): void {
    const resourceMap: Record<string, string> = {
      electricity: 'hud-electricity',
      freshWater: 'hud-freshWater',
      heat: 'hud-heat',
      seawater: 'hud-seawater',
      population: 'hud-population',
      happiness: 'hud-happiness'
    };

    const elementId = resourceMap[resource];
    if (!elementId) return;

    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add('resource-pulse');
    setTimeout(() => {
      element.classList.remove('resource-pulse');
    }, 2000);
  }

  public showHint(text: string, id: string = 'generic', priority: number = 0): void {
    if (!this.hintBar) return;
    if (this.currentHint && this.currentHint.priority > priority) return;

    this.currentHint = { id, text, priority };

    const textEl = this.hintBar.querySelector('.hint-text');
    if (textEl) {
      textEl.textContent = text;
    }

    this.hintBar.style.display = 'flex';
    this.hintBar.classList.add('show');
  }

  public hideHint(): void {
    if (!this.hintBar) return;

    this.hintBar.classList.remove('show');
    setTimeout(() => {
      if (this.hintBar) {
        this.hintBar.style.display = 'none';
      }
    }, 300);
    this.currentHint = null;
  }

  public checkGameState(): void {
    if (gameState.isGameOver()) {
      this.hideHint();
      return;
    }

    const buildings = gameState.getBuildings();
    const resources = gameState.getResources();
    const reactor = gameState.getReactorState();

    const hints: Hint[] = [];

    if (reactor.temperature >= 70) {
      hints.push({
        id: 'high-temp',
        text: '⚠️ Reactor overheating! Build Desalination Plants to cool.',
        priority: 100
      });
    }

    if (resources.freshWater < 10 && buildings.some(b => b.type === 'microrayon')) {
      hints.push({
        id: 'low-water',
        text: '💧 Water low! Build more Desalination Plants.',
        priority: 90
      });
    }

    if (resources.electricity < 30) {
      hints.push({
        id: 'low-power',
        text: '⚡ Low power! Build a Reactor on rock.',
        priority: 85
      });
    }

    const hasPump = buildings.some(b => b.type === 'pump');
    const hasReactor = buildings.some(b => b.type === 'reactor');
    const hasDistiller = buildings.some(b => b.type === 'distiller');
    const hasHousing = buildings.some(b => b.type === 'microrayon');

    if (!hasPump && !hasReactor && !hasDistiller && !hasHousing) {
      hints.push({
        id: 'start',
        text: '🌊 Build a Water Pump on sea tiles (teal area).',
        priority: 50
      });
    } else if (hasPump && !hasReactor) {
      hints.push({
        id: 'need-reactor',
        text: '☢️ Build a Reactor on rock tiles (gray) for power.',
        priority: 45
      });
    } else if (hasPump && hasReactor && !hasDistiller) {
      hints.push({
        id: 'need-distiller',
        text: '💧 Build a Desalination Plant to make fresh water.',
        priority: 40
      });
    } else if (hasDistiller && !hasHousing && resources.freshWater >= 20) {
      hints.push({
        id: 'need-housing',
        text: '🏠 Build Housing on sand to grow population.',
        priority: 35
      });
    }

    if (hints.length > 0) {
      hints.sort((a, b) => b.priority - a.priority);
      const bestHint = hints[0];
      this.showHint(bestHint.text, bestHint.id, bestHint.priority);
    } else {
      this.hideHint();
    }
  }

  public dispose(): void {
    this.toastContainer?.remove();
    this.hintBar?.remove();
  }
}

export const feedbackManager = new FeedbackManagerClass();
