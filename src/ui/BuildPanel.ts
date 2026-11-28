import { BuildingManager } from '../managers/BuildingManager';
import { getAllBuildingTypes } from '../simulation/buildings/Building';
import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { gameState } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';
import { BUILDING_SCALING_LIMITS, type BuildingType } from '../types';
import type { GridPosition } from '../grid/GridCoords';
import { t, td } from '../i18n';

export const compactCityScreen = window.matchMedia(
  '(max-width: 700px), (pointer: coarse) and (orientation: landscape) and (max-height: 540px)'
);

export interface TouchPlacementPreview {
  type: BuildingType;
  suggested: boolean;
  canBuild: boolean;
  status?: string;
  connections?: { water: boolean; heat: boolean };
}

function connectionLabels(type: BuildingType, { water, heat }: { water: boolean; heat: boolean }): string {
  const label = (resource: 'water' | 'heat', connected: boolean, text: string) =>
    `<span class="lot-utility"><span class="icon-wrap lot-${connected ? resource : 'missing'}" aria-hidden="true">${ICONS[resource]}</span>${text}</span>`;
  switch (type) {
    case 'pump':
      return label('water', water, t(water ? 'build.preview.pumpReach' : 'build.preview.pumpIsolated'));
    case 'reactor':
    case 'thermal_plant':
      return label('heat', heat, t(heat ? 'build.preview.heatReach' : 'build.preview.heatIsolated'));
    case 'water_tank':
      return label('water', water, t(water ? 'build.preview.tankLinked' : 'build.preview.tankIsolated')) +
        ' ' + label('heat', heat, t(heat ? 'build.preview.heat' : 'build.preview.noHeat'));
    case 'distiller':
    case 'microrayon': {
      const waterStatus = type === 'distiller'
        ? t(water ? 'build.preview.seawater' : 'build.preview.noSeawater')
        : t(water ? 'build.preview.freshWater' : 'build.preview.noFreshWater');
      return label('water', water, waterStatus) + ' ' + label('heat', heat, t(heat ? 'build.preview.heat' : 'build.preview.noHeat'));
    }
  }
}

// Reactor is auto-placed at game start, so not in menu
const BUILDING_HOTKEYS: Record<string, BuildingType> = {
  '1': 'pump',
  '2': 'distiller',
  '3': 'microrayon',
  '4': 'water_tank',
  '5': 'thermal_plant'
};

export class BuildPanel {
  private container: HTMLDivElement;
  private buildingManager: BuildingManager;
  private readonly launcher = document.createElement('button');
  private readonly previewTitle = document.createElement('strong');
  private readonly previewStatus = document.createElement('p');
  private readonly confirm = document.createElement('button');
  private buttons: Map<BuildingType, HTMLButtonElement> = new Map();
  private demolishButton: HTMLButtonElement | null = null;

  constructor(buildingManager: BuildingManager) {
    this.buildingManager = buildingManager;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.setupKeyboardShortcuts();
    this.updateButtonStates();

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
      this.demolishButton?.setAttribute('aria-pressed', String(enabled));
      this.setPanelTitle(enabled ? t('build.site.demolish') : t('build.title'));
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

  public mountMobileControls(): void {
    const dock = document.querySelector<HTMLElement>('.map-tools')!;
    const options = document.querySelector<HTMLDetailsElement>('.hud-options')!;
    const menu = options.querySelector<HTMLElement>('.hud-options-menu')!;
    this.launcher.type = 'button';
    this.launcher.className = 'build-launcher';
    this.launcher.setAttribute('aria-controls', this.container.id);
    this.launcher.setAttribute('aria-expanded', 'false');
    this.launcher.innerHTML = `<span class="icon-wrap">${ICONS.microrayon}</span>${t('build.open')}`;
    this.launcher.onclick = () => {
      const open = !this.container.classList.contains('palette-open');
      this.openPalette(open);
      if (open && this.launcher.matches(':focus-visible')) {
        this.container.querySelector<HTMLButtonElement>('.build-button:not([aria-disabled="true"])')?.focus();
      }
    };
    dock.prepend(this.launcher);

    // Move the existing controls so keyboard order follows the visible menu on rotation.
    const controls = [
      ['.hud-speeds', menu], ['.network-control', menu],
      ['#reset-view-btn', menu], ['#shortcuts-btn', menu], ['#chronicle-btn', dock]
    ] as const;
    const slots = controls.map(([selector, phoneParent]) => {
      const control = document.querySelector<HTMLElement>(selector)!;
      const originalSlot = document.createComment(selector);
      control.before(originalSlot);
      return { control, phoneParent, originalSlot };
    });
    const resetLayout = () => {
      this.openPalette(false);
      options.open = false;
      for (const { control, phoneParent, originalSlot } of slots) {
        if (compactCityScreen.matches) phoneParent.append(control);
        else originalSlot.after(control);
      }
      document.body.classList.toggle('compact-city', compactCityScreen.matches);
    };
    resetLayout();
    compactCityScreen.addEventListener('change', resetLayout);
    menu.addEventListener('click', (event) => {
      if ((event.target as Element).closest('#reset-view-btn, #shortcuts-btn')) options.open = false;
    });
    document.addEventListener('pointerdown', (event) => {
      if (this.launcher.getAttribute('aria-expanded') !== 'true') return;
      if (!this.container.contains(event.target as Node) && !this.launcher.contains(event.target as Node)) {
        this.openPalette(false);
      }
    });
  }

  private openPalette(open: boolean): void {
    this.container.classList.toggle('palette-open', open);
    this.launcher.setAttribute('aria-expanded', String(open));
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (tickSystem.hasOpenModal() || gameState.isGameOver()) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const type = BUILDING_HOTKEYS[e.key];
      if (type && !e.repeat) {
        e.preventDefault();
        this.toggleBuilding(type);
      }

      // X key (or Ч on Russian keyboard) toggles demolish mode
      if (e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч') {
        e.preventDefault();
        this.toggleDemolishMode();
        soundManager.play('click');
      }

      if (e.key === 'Escape') {
        if (this.container.classList.contains('palette-open')) this.launcher.focus();
        this.openPalette(false);
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

    const preview = document.createElement('div');
    preview.className = 'placement-copy';
    this.previewTitle.className = 'placement-title';
    this.previewStatus.className = 'placement-status';
    this.previewStatus.setAttribute('role', 'status');
    const hint = document.createElement('p');
    hint.className = 'placement-hint';
    hint.textContent = t('build.preview.compare');
    preview.append(this.previewTitle, this.previewStatus, hint);
    container.append(preview);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'placement-cancel';
    cancel.textContent = t('build.cancel');
    cancel.onclick = () => {
      const previousControl = this.container.querySelector<HTMLButtonElement>('.build-button.selected');
      this.cancelSelection();
      (compactCityScreen.matches ? this.launcher : previousControl)?.focus();
    };
    this.confirm.type = 'button';
    this.confirm.className = 'placement-confirm';
    this.confirm.textContent = t('build.preview.confirm');
    container.append(cancel, this.confirm);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'build-buttons';

    // Filter out reactor since it's auto-placed at game start
    const types = getAllBuildingTypes().filter((bt) => bt !== 'reactor');
    types.forEach((type, index) => {
      const button = document.createElement('button');
      button.className = 'build-button';
      button.dataset.type = type;
      button.setAttribute('aria-pressed', 'false');

      const costText = this.formatCost(type, this.getDisplayCost(type));
      const hotkey = index + 1;
      const name = td(`build.${type}`);
      const desc = td(`building.${type}.desc`);

      button.innerHTML = `
        <img class="build-model" alt="" src="/pictures/construction/${type}.webp" draggable="false">
        <span class="build-name">${name}</span>
        <span class="build-cost">${costText}</span>
        <span class="build-hotkey">${hotkey}</span>
      `;

      button.title = `${desc} [${hotkey}]`;

      button.addEventListener('click', () => {
        this.toggleBuilding(type);
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
    demolishButton.setAttribute('aria-pressed', 'false');
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

  private formatCost(type: BuildingType, costs: Partial<Record<string, number>> | null): string {
    if (costs === null) {
      const limit = BUILDING_SCALING_LIMITS[type];
      if (limit?.requiredBuilding === 'microrayon') {
        const lots = gameState.getBuildings();
        const homes = lots.filter((b) => b.type === 'microrayon').length;
        const plants = lots.filter((b) => b.type === type).length;
        const target = (plants + 1 - limit.freeCount) * limit.countPerAllowed;
        return `<span class="cost-maxed">${t('build.housingUnlock', { homes, target })}</span>`;
      }
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

      button.classList.toggle('max-reached', cost === null);
      button.setAttribute('aria-disabled', String(cost === null));
      if (costEl) costEl.innerHTML = this.formatCost(type, cost);
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
    if (this.getDisplayCost(type) === null) {
      const requirement = this.buttons.get(type)?.querySelector('.build-cost')?.textContent;
      gameState.recordBuildRejected(type, requirement || 'Construction limit reached');
      return;
    }
    soundManager.play('click');
    // Exit demolish mode when selecting a building
    if (this.buildingManager.isDemolishMode()) {
      this.buildingManager.setDemolishMode(false);
    }

    const currentSelection = this.buildingManager.getSelectedBuildingType();

    if (currentSelection === type) this.cancelSelection();
    else this.selectBuilding(type);
  }

  public selectBuilding(type: BuildingType, lot?: GridPosition): void {
    // Exit demolish mode when selecting a building
    if (this.buildingManager.isDemolishMode()) {
      this.buildingManager.setDemolishMode(false);
    }

    for (const [t, btn] of this.buttons) {
      btn.setAttribute('aria-pressed', String(t === type));
      if (t === type) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    }

    this.openPalette(false);
    this.setPanelTitle(td(`build.site.${type}`));
    this.buildingManager.selectBuildingType(type, lot);
    this.container.classList.add('building-selected');
  }

  private toggleDemolishMode(): void {
    this.openPalette(false);
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

  public cancelSelection(): void {
    for (const btn of this.buttons.values()) {
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('selected');
    }
    this.buildingManager.selectBuildingType(null);
    this.buildingManager.setDemolishMode(false);
    this.container.classList.remove('building-selected');
  }

  public setTouchPreview(preview: TouchPlacementPreview | null): void {
    this.container.classList.toggle('touch-placement', preview !== null);
    document.body.classList.toggle('previewing-lot', preview !== null);
    this.confirm.disabled = !preview?.canBuild;
    if (!preview) return;
    const building = td(`build.${preview.type}`);
    this.previewTitle.textContent = preview.suggested ? t('build.preview.suggested', { building }) : building;
    this.previewStatus.innerHTML = preview.connections ? connectionLabels(preview.type, preview.connections) : '';
    if (preview.status) this.previewStatus.append(document.createTextNode(preview.status));
  }

  public hasTouchPreview(): boolean {
    return this.container.classList.contains('touch-placement');
  }

  public onConfirmPlacement(callback: () => void): void {
    this.confirm.onclick = callback;
  }

  private setPanelTitle(text: string): void {
    this.container.querySelector('.panel-title')!.textContent = text;
  }

  public getButton(type: BuildingType): HTMLButtonElement | undefined {
    return this.buttons.get(type);
  }

  public dispose(): void {
    this.container.remove();
  }
}
