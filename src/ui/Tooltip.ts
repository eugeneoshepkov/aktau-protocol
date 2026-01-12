import { gameState } from '../simulation/GameState';
import { BUILDING_META } from '../simulation/buildings/Building';
import type { Building } from '../types';

export class Tooltip {
  private element: HTMLDivElement;
  private visible = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'building-tooltip';
    this.element.style.display = 'none';
    document.body.appendChild(this.element);

    document.addEventListener('mousemove', (e) => {
      if (this.visible) {
        this.element.style.left = `${e.clientX + 12}px`;
        this.element.style.top = `${e.clientY + 12}px`;
      }
    });
  }

  public show(gridX: number, gridZ: number): void {
    const building = gameState.getBuildingAt(gridX, gridZ);

    if (!building) {
      this.hide();
      return;
    }

    this.renderBuilding(building);
    this.element.style.display = 'block';
    this.visible = true;
  }

  private renderBuilding(building: Building): void {
    const meta = BUILDING_META[building.type];
    const prod = meta.production;

    let consumesHtml = '';
    let producesHtml = '';

    const icons: Record<string, string> = {
      seawater: '🌊',
      freshWater: '💧',
      heat: '🔥',
      electricity: '⚡',
      happiness: '😊'
    };

    for (const [key, val] of Object.entries(prod.consumes)) {
      if (val) consumesHtml += `<span>${icons[key] || ''} -${val}</span>`;
    }

    for (const [key, val] of Object.entries(prod.produces)) {
      if (val) producesHtml += `<span>${icons[key] || ''} +${val}</span>`;
    }

    let specialHtml = '';
    if (building.type === 'reactor') {
      const reactor = gameState.getReactorState();
      specialHtml = `<div class="tooltip-special">☢️ Temp: ${Math.floor(reactor.temperature)}°C (+1/tick)</div>`;
    }

    this.element.innerHTML = `
      <div class="tooltip-header">${meta.name}</div>
      <div class="tooltip-desc">${meta.description}</div>
      <div class="tooltip-row">
        ${consumesHtml ? `<div class="tooltip-consumes">Uses: ${consumesHtml}</div>` : ''}
        ${producesHtml ? `<div class="tooltip-produces">Makes: ${producesHtml}</div>` : ''}
      </div>
      ${specialHtml}
    `;
  }

  public hide(): void {
    this.element.style.display = 'none';
    this.visible = false;
  }

  public dispose(): void {
    this.element.remove();
  }
}
