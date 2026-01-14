import { BuildingManager } from "../managers/BuildingManager";
import {
  BUILDING_META,
  getAllBuildingTypes,
} from "../simulation/buildings/Building";
import { ICONS } from "./Icons";
import { soundManager } from "../managers/SoundManager";
import { gameState } from "../simulation/GameState";
import type { BuildingType } from "../types";

// Reactor is auto-placed at game start, so not in menu
const BUILDING_HOTKEYS: Record<string, BuildingType> = {
  "1": "pump",
  "2": "distiller",
  "3": "microrayon",
  "4": "water_tank",
  "5": "thermal_plant",
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  pump: "#22d3d1",
  reactor: "#f97316",
  distiller: "#60a5fa",
  microrayon: "#a78bfa",
  water_tank: "#6ee7b7",
  thermal_plant: "#d97706",
};

export class BuildPanel {
  private container: HTMLDivElement;
  private buildingManager: BuildingManager;
  private buttons: Map<BuildingType, HTMLButtonElement> = new Map();

  constructor(buildingManager: BuildingManager) {
    this.buildingManager = buildingManager;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.setupKeyboardShortcuts();

    // Update button states when buildings are placed (for max limits and cost changes)
    gameState.on('buildingPlaced', () => {
      this.updateButtonStates();
    });
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener("keydown", (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const type = BUILDING_HOTKEYS[e.key];
      if (type) {
        e.preventDefault();
        this.toggleBuilding(type);
        soundManager.play("click");
      }

      if (e.key === "Escape") {
        this.cancelSelection();
      }
    });
  }

  private createPanel(): HTMLDivElement {
    const container = document.createElement("div");
    container.id = "build-panel";

    const title = document.createElement("div");
    title.className = "panel-title";
    title.textContent = "BUILD";
    container.appendChild(title);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "build-buttons";

    // Filter out reactor since it's auto-placed at game start
    const types = getAllBuildingTypes().filter(t => t !== 'reactor');
    types.forEach((type, index) => {
      const meta = BUILDING_META[type];
      const button = document.createElement("button");
      button.className = "build-button";
      button.dataset.type = type;

      const icon = this.getBuildingIcon(type);
      const color = BUILDING_COLORS[type];
      const costText = this.formatCost(this.getDisplayCost(type));
      const hotkey = index + 1;

      button.innerHTML = `
        <span class="build-icon icon-wrap" style="color: ${color}">${icon}</span>
        <span class="build-name">${meta.name}</span>
        <span class="build-cost">${costText}</span>
        <span class="build-hotkey">${hotkey}</span>
      `;

      button.title = `${meta.description} [${hotkey}]`;

      button.addEventListener("click", () => {
        this.toggleBuilding(type);
        soundManager.play("click");
      });

      buttonContainer.appendChild(button);
      this.buttons.set(type, button);
    });

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
      thermal_plant: ICONS.thermal_plant,
    };
    return icons[type];
  }

  private formatCost(costs: Partial<Record<string, number>> | null): string {
    // null means max limit reached
    if (costs === null) {
      return '<span class="cost-maxed">BUILT</span>';
    }
    const parts: string[] = [];
    for (const [resource, amount] of Object.entries(costs)) {
      if (amount) {
        const icon = this.getResourceIcon(resource);
        parts.push(
          `<span class="cost-item"><span class="icon-wrap cost-icon">${icon}</span>${amount}</span>`,
        );
      }
    }
    return parts.join("") || "Free";
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
      electricity: { icon: ICONS.electricity, colorClass: "icon-electricity" },
      freshWater: { icon: ICONS.water, colorClass: "icon-water" },
      heat: { icon: ICONS.heat, colorClass: "icon-heat" },
      seawater: { icon: ICONS.seawater, colorClass: "icon-seawater" },
    };
    const entry = iconMap[resource];
    if (!entry) return "";
    return `<span class="${entry.colorClass}">${entry.icon}</span>`;
  }

  private toggleBuilding(type: BuildingType): void {
    const currentSelection = this.buildingManager.getSelectedBuildingType();
    
    if (currentSelection === type) {
      this.cancelSelection();
    } else {
      this.selectBuilding(type);
    }
  }

  private selectBuilding(type: BuildingType): void {
    for (const [t, btn] of this.buttons) {
      if (t === type) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    }

    this.buildingManager.selectBuildingType(type);
    this.container.classList.add("building-selected");
  }

  private cancelSelection(): void {
    for (const btn of this.buttons.values()) {
      btn.classList.remove("selected");
    }
    this.buildingManager.selectBuildingType(null);
    this.container.classList.remove("building-selected");
  }

  public getButton(type: BuildingType): HTMLButtonElement | undefined {
    return this.buttons.get(type);
  }

  public dispose(): void {
    this.container.remove();
  }
}
