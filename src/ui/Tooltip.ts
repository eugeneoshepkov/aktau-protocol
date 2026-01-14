import { gameState } from '../simulation/GameState';
import { BUILDING_META } from '../simulation/buildings/Building';
import type { Building } from '../types';
import type { PipeManager } from '../managers/PipeManager';
import { icon } from './Icons';
import { t, td } from '../i18n';

// Icon colors for tooltip
const ICON_COLORS: Record<string, string> = {
  seawater: '#4a90a4',
  water: '#88ccff',
  heat: '#ff8844',
  electricity: '#ffcc00',
  happiness: '#88ff88',
  nuclear: '#88ff88',
  warning: '#ff8844'
};

function coloredIcon(name: keyof typeof ICON_COLORS, size = 14): string {
  const color = ICON_COLORS[name] || 'currentColor';
  return `<span style="color:${color}">${icon(name as any, size)}</span>`;
}

export class Tooltip {
  private element: HTMLDivElement;
  private visible = false;
  private currentBuilding: Building | null = null;
  private updateInterval: number | null = null;
  private pipeManager: PipeManager | null = null;

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

  public setPipeManager(pipeManager: PipeManager): void {
    this.pipeManager = pipeManager;
  }

  public show(gridX: number, gridZ: number): void {
    const building = gameState.getBuildingAt(gridX, gridZ);

    if (!building) {
      this.hide();
      return;
    }

    this.currentBuilding = building;
    this.renderBuilding(building);
    this.element.style.display = 'block';
    this.visible = true;

    if (this.updateInterval === null) {
      this.updateInterval = window.setInterval(() => {
        if (this.currentBuilding && this.visible) {
          this.renderBuilding(this.currentBuilding);
        }
      }, 500);
    }
  }

  private renderBuilding(building: Building): void {
    const meta = BUILDING_META[building.type];
    const prod = meta.production;
    const buildingName = td(`building.${building.type}.name`);
    const buildingDesc = td(`building.${building.type}.desc`);

    let consumesHtml = '';
    let producesHtml = '';

    const icons: Record<string, string> = {
      seawater: coloredIcon('seawater'),
      freshWater: coloredIcon('water'),
      heat: coloredIcon('heat'),
      electricity: coloredIcon('electricity'),
      happiness: coloredIcon('happiness')
    };

    for (const [key, val] of Object.entries(prod.consumes)) {
      if (val) consumesHtml += `<span>${icons[key] || ''} -${val}</span>`;
    }

    for (const [key, val] of Object.entries(prod.produces)) {
      // Skip happiness for microrayon - handled specially below
      if (building.type === 'microrayon' && key === 'happiness') continue;
      if (val) producesHtml += `<span>${icons[key] || ''} +${val}</span>`;
    }

    // Show actual happiness effect for microrayon based on connection
    if (building.type === 'microrayon') {
      const isConnected = this.pipeManager?.isFullyOperational(building);
      if (isConnected) {
        producesHtml += `<span>${icons.happiness} +1</span>`;
      } else {
        producesHtml += `<span style="color:#ff6666">${icons.happiness} -2</span>`;
      }
    }

    let specialHtml = '';
    if (building.type === 'reactor') {
      const reactor = gameState.getReactorState();
      const tempColor = reactor.temperature >= 80 ? '#ff4444' : reactor.temperature >= 50 ? '#ffaa00' : '#88ff88';
      specialHtml = `<div class="tooltip-special" style="color: ${tempColor}">${icon('nuclear', 14)} ${t('tooltip.temp', { temp: Math.floor(reactor.temperature) })}</div>`;
    }

    if (building.type === 'distiller') {
      if (this.pipeManager?.isFullyOperational(building)) {
        specialHtml = `<div class="tooltip-special" style="color: #88ccff">${icon('water', 14)} ${t('tooltip.cooling')}</div>`;
      } else {
        const missing = this.pipeManager?.getMissingConnections(building) || [];
        const missingNames = missing.map(m => {
          const name = td(`building.${m.type}.name`);
          const resourceIcon = m.resourceType === 'water' ? coloredIcon('water') : coloredIcon('heat');
          return `${resourceIcon} ${name}`;
        }).join(', ');
        if (missingNames) {
          specialHtml = `<div class="tooltip-special">${coloredIcon('warning')} ${t('tooltip.needs', { missing: missingNames })}</div>`;
        }
      }
    }

    if (building.type === 'microrayon') {
      if (!this.pipeManager?.isFullyOperational(building)) {
        specialHtml = `<div class="tooltip-special">${coloredIcon('warning')} ${t('tooltip.noWater')}</div>`;
      }
    }

    const connectionsHtml = this.renderConnections(building);

    this.element.innerHTML = `
      <div class="tooltip-header">${buildingName}</div>
      <div class="tooltip-desc">${buildingDesc}</div>
      <div class="tooltip-row">
        ${consumesHtml ? `<div class="tooltip-consumes">${t('tooltip.uses')} ${consumesHtml}</div>` : ''}
        ${producesHtml ? `<div class="tooltip-produces">${t('tooltip.makes')} ${producesHtml}</div>` : ''}
      </div>
      ${specialHtml}
      ${connectionsHtml}
    `;
  }

  private renderConnections(building: Building): string {
    if (!this.pipeManager) return '';

    const connections = this.pipeManager.getConnectionsForBuilding(building);
    const missing = this.pipeManager.getMissingConnections(building);
    const isOperational = this.pipeManager.isFullyOperational(building);

    if (connections.length === 0 && missing.length === 0) {
      const canOutput = ['pump', 'reactor', 'water_tank'].includes(building.type);
      if (canOutput) {
        return `<div class="tooltip-connections tooltip-disconnected">${coloredIcon('warning')} ${t('tooltip.disconnected')}</div>`;
      }
      return '';
    }

    let html = '<div class="tooltip-connections">';

    const incoming = connections.filter(c => c.direction === 'incoming');
    const outgoing = connections.filter(c => c.direction === 'outgoing');

    if (incoming.length > 0) {
      const sources = incoming.map(c => {
        const name = td(`building.${c.building.type}.name`);
        const resourceIcon = c.type === 'water' ? coloredIcon('water') : coloredIcon('heat');
        return `${resourceIcon} ${name}`;
      }).join(', ');
      html += `<div class="tooltip-conn-in">${t('tooltip.receiving', { sources })}</div>`;
    }

    if (outgoing.length > 0) {
      const targets = outgoing.map(c => {
        const name = td(`building.${c.building.type}.name`);
        const resourceIcon = c.type === 'water' ? coloredIcon('water') : coloredIcon('heat');
        return `${resourceIcon} ${name}`;
      }).join(', ');
      html += `<div class="tooltip-conn-out">${t('tooltip.sending', { targets })}</div>`;
    }

    if (!isOperational && missing.length > 0 && building.type !== 'distiller') {
      const missingNames = missing.map(m => {
        const name = td(`building.${m.type}.name`);
        const resourceIcon = m.resourceType === 'water' ? coloredIcon('water') : coloredIcon('heat');
        return `${resourceIcon} ${name}`;
      }).join(', ');
      html += `<div class="tooltip-disconnected">${coloredIcon('warning')} ${t('tooltip.needs', { missing: missingNames })}</div>`;
    }

    html += '</div>';
    return html;
  }

  public hide(): void {
    this.element.style.display = 'none';
    this.visible = false;
    this.currentBuilding = null;
    
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public dispose(): void {
    this.hide();
    this.element.remove();
  }
}
