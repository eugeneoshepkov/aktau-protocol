import { BuildingManager } from '../managers/BuildingManager';
import { getAllBuildingTypes } from '../simulation/buildings/Building';
import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { gameState } from '../simulation/GameState';
import type { BuildingType } from '../types';
import { t, td } from '../i18n';

// Reactor is auto-placed at game start, so not in menu
const BUILDING_HOTKEYS: Record<string, BuildingType> = {
  '1': 'pump',
  '2': 'distiller',
  '3': 'microrayon',
  '4': 'water_tank',
  '5': 'thermal_plant'
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  pump: '#22d3d1',
  reactor: '#f97316',
  distiller: '#60a5fa',
  microrayon: '#a78bfa',
  water_tank: '#6ee7b7',
  thermal_plant: '#d97706'
};

export class BuildPanel {
  private container: HTMLDivElement;
  private buildingManager: BuildingManager;
  private buttons: Map<BuildingType, HTMLButtonElement> = new Map();
  private demolishButton: HTMLButtonElement | null = null;

  constructor(buildingManager: BuildingManager) {
    this.buildingManager = buildingManager;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.setupKeyboardShortcuts();

    // Update button states when buildings are placed (for max limits and cost changes)
    gameState.on('buildingPlaced', () => {
      this.updateButtonStates();
    });

    // Update demolish button state when buildings are removed
    gameState.on('buildingRemoved', () => {
      this.updateButtonStates();
    });

    // Update demolish button visual state when mode changes
    const demolishCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23dc2626' stroke='%23fff' stroke-width='1.5'/%3E%3Cpath d='M8 8l8 8M16 8l-8 8' stroke='%23fff' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair`;
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;

    this.buildingManager.onDemolishModeChange((enabled) => {
      if (this.demolishButton) {
        if (enabled) {
          this.demolishButton.classList.add('selected', 'demolish-active');
          this.container.classList.add('demolish-mode');
          document.body.classList.add('demolish-cursor');
          if (canvas) canvas.style.cursor = demolishCursor;
        } else {
          this.demolishButton.classList.remove('selected', 'demolish-active');
          this.container.classList.remove('demolish-mode');
          document.body.classList.remove('demolish-cursor');
          if (canvas) canvas.style.cursor = '';
        }
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const type = BUILDING_HOTKEYS[e.key];
      if (type) {
        e.preventDefault();
        this.toggleBuilding(type);
        soundManager.play('click');
      }

      // X key (or Ч on Russian keyboard) toggles demolish mode
      if (e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч') {
        e.preventDefault();
        this.toggleDemolishMode();
        soundManager.play('click');
      }

      if (e.key === 'Escape') {
        this.cancelSelection();
      }
    });
  }

  private createPanel(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'build-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = t('build.title');
    container.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'build-buttons';

    // Filter out reactor since it's auto-placed at game start
    const types = getAllBuildingTypes().filter((bt) => bt !== 'reactor');
    types.forEach((type, index) => {
      const button = document.createElement('button');
      button.className = 'build-button';
      button.dataset.type = type;

      const icon = this.getBuildingIcon(type);
      const color = BUILDING_COLORS[type];
      const costText = this.formatCost(this.getDisplayCost(type));
      const hotkey = index + 1;
      const name = td(`building.${type}.name`);
      const desc = td(`building.${type}.desc`);

      button.innerHTML = `
        <span class="build-icon icon-wrap" style="color: ${color}">${icon}</span>
        <span class="build-name">${name}</span>
        <span class="build-cost">${costText}</span>
        <span class="build-hotkey">${hotkey}</span>
      `;

      button.title = `${desc} [${hotkey}]`;

      button.addEventListener('click', () => {
        this.toggleBuilding(type);
        soundManager.play('click');
      });

      buttonContainer.appendChild(button);
      this.buttons.set(type, button);
    });

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'build-separator';
    buttonContainer.appendChild(separator);

    // Add demolish button
    const demolishButton = document.createElement('button');
    demolishButton.className = 'build-button demolish-button';
    demolishButton.innerHTML = `
      <span class="build-icon icon-wrap" style="color: #ef4444">${ICONS.demolish}</span>
      <span class="build-name">${t('build.demolish')}</span>
      <span class="build-cost"><span class="cost-item">50%</span></span>
      <span class="build-hotkey">X</span>
    `;
    demolishButton.title = t('build.demolish.desc') + ' [X]';
    demolishButton.addEventListener('click', () => {
      this.toggleDemolishMode();
      soundManager.play('click');
    });
    buttonContainer.appendChild(demolishButton);
    this.demolishButton = demolishButton;

    container.appendChild(buttonContainer);

    return container;
  }

  private getBuildingIcon(type: BuildingType): string {
    const icons: Record<BuildingType, string> = {
      pump: ICONS.pump,
      reactor: ICONS.reactor,
      distiller: ICONS.distiller,
      microrayon: ICONS.microrayon,
      water_tank: ICONS.water_tank,
      thermal_plant: ICONS.thermal_plant
    };
    return icons[type];
  }

  private formatCost(costs: Partial<Record<string, number>> | null): string {
    // null means max limit reached
    if (costs === null) {
      return `<span class="cost-maxed">${t('build.maxed')}</span>`;
    }
    const parts: string[] = [];
    for (const [resource, amount] of Object.entries(costs)) {
      if (amount) {
        const icon = this.getResourceIcon(resource);
        parts.push(
          `<span class="cost-item"><span class="icon-wrap cost-icon">${icon}</span>${amount}</span>`
        );
      }
    }
    return parts.join('') || t('build.free');
  }

  private getDisplayCost(type: BuildingType): Partial<Record<string, number>> | null {
    return gameState.getEffectiveCost(type) as Partial<Record<string, number>> | null;
  }

  private updateButtonStates(): void {
    for (const [type, button] of this.buttons) {
      const cost = this.getDisplayCost(type);
      const costEl = button.querySelector('.build-cost');

      if (cost === null) {
        // Max limit reached - disable button
        button.classList.add('max-reached');
        if (costEl) costEl.innerHTML = this.formatCost(null);
      } else {
        button.classList.remove('max-reached');
        if (costEl) costEl.innerHTML = this.formatCost(cost);
      }
    }
  }

  private getResourceIcon(resource: string): string {
    const iconMap: Record<string, { icon: string; colorClass: string }> = {
      electricity: { icon: ICONS.electricity, colorClass: 'icon-electricity' },
      freshWater: { icon: ICONS.water, colorClass: 'icon-water' },
      heat: { icon: ICONS.heat, colorClass: 'icon-heat' },
      seawater: { icon: ICONS.seawater, colorClass: 'icon-seawater' }
    };
    const entry = iconMap[resource];
    if (!entry) return '';
    return `<span class="${entry.colorClass}">${entry.icon}</span>`;
  }

  private toggleBuilding(type: BuildingType): void {
    // Exit demolish mode when selecting a building
    if (this.buildingManager.isDemolishMode()) {
      this.buildingManager.setDemolishMode(false);
    }

    const currentSelection = this.buildingManager.getSelectedBuildingType();

    // Only change selection if a different building type is clicked
    if (currentSelection !== type) {
      this.selectBuilding(type);
    }
  }

  private selectBuilding(type: BuildingType): void {
    // Exit demolish mode when selecting a building
    if (this.buildingManager.isDemolishMode()) {
      this.buildingManager.setDemolishMode(false);
    }

    for (const [t, btn] of this.buttons) {
      if (t === type) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    }

    this.buildingManager.selectBuildingType(type);
    this.container.classList.add('building-selected');
  }

  private toggleDemolishMode(): void {
    const isCurrentlyDemolish = this.buildingManager.isDemolishMode();

    if (isCurrentlyDemolish) {
      // Exit demolish mode
      this.buildingManager.setDemolishMode(false);
    } else {
      // Enter demolish mode, clear any building selection
      this.cancelSelection();
      this.buildingManager.setDemolishMode(true);
    }
  }

  private cancelSelection(): void {
    for (const btn of this.buttons.values()) {
      btn.classList.remove('selected');
    }
    this.buildingManager.selectBuildingType(null);
    this.buildingManager.setDemolishMode(false);
    this.container.classList.remove('building-selected');
  }

  public getButton(type: BuildingType): HTMLButtonElement | undefined {
    return this.buttons.get(type);
  }

  public dispose(): void {
    this.container.remove();
  }
}
