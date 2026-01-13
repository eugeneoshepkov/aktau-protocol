import { BuildingManager } from "../managers/BuildingManager";
import {
  BUILDING_META,
  getAllBuildingTypes,
} from "../simulation/buildings/Building";
import { ICONS } from "./Icons";
import { soundManager } from "../managers/SoundManager";
import { gameState } from "../simulation/GameState";
import type { BuildingType } from "../types";

const BUILDING_HOTKEYS: Record<string, BuildingType> = {
  "1": "pump",
  "2": "reactor",
  "3": "distiller",
  "4": "microrayon",
  "5": "water_tank",
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  pump: "#22d3d1",
  reactor: "#f97316",
  distiller: "#60a5fa",
  microrayon: "#a78bfa",
  water_tank: "#6ee7b7",
};

export class BuildPanel {
  private container: HTMLDivElement;
  private buildingManager: BuildingManager;
  private buttons: Map<BuildingType, HTMLButtonElement> = new Map();
  private geigerInterval: number | null = null;

  constructor(buildingManager: BuildingManager) {
    this.buildingManager = buildingManager;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.setupKeyboardShortcuts();

    // Update reactor button cost when first reactor is placed
    gameState.on('buildingPlaced', (data) => {
      const building = data as { type: BuildingType };
      if (building.type === 'reactor') {
        this.updateReactorButtonCost();
      }
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

    const types = getAllBuildingTypes();
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

      if (type === "reactor") {
        button.addEventListener("mouseenter", () => this.startGeigerSound());
        button.addEventListener("mouseleave", () => this.stopGeigerSound());
      }

      buttonContainer.appendChild(button);
      this.buttons.set(type, button);
    });

    container.appendChild(buttonContainer);

    return container;
  }

  private startGeigerSound(): void {
    this.stopGeigerSound();
    soundManager.playGeigerClick();
    this.geigerInterval = window.setInterval(() => {
      soundManager.playGeigerClick();
    }, 150 + Math.random() * 200);
  }

  private stopGeigerSound(): void {
    if (this.geigerInterval !== null) {
      clearInterval(this.geigerInterval);
      this.geigerInterval = null;
    }
  }

  private getBuildingIcon(type: BuildingType): string {
    const icons: Record<BuildingType, string> = {
      pump: ICONS.pump,
      reactor: ICONS.reactor,
      distiller: ICONS.distiller,
      microrayon: ICONS.microrayon,
      water_tank: ICONS.water_tank,
    };
    return icons[type];
  }

  private formatCost(costs: Partial<Record<string, number>>): string {
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

  private getDisplayCost(type: BuildingType): Partial<Record<string, number>> {
    return gameState.getEffectiveCost(type) as Partial<Record<string, number>>;
  }

  private updateReactorButtonCost(): void {
    const button = this.buttons.get('reactor');
    if (button) {
      const costEl = button.querySelector('.build-cost');
      if (costEl) {
        costEl.innerHTML = this.formatCost(this.getDisplayCost('reactor'));
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

  public dispose(): void {
    this.stopGeigerSound();
    this.container.remove();
  }
}
