import { gameState, type ResourceTrend } from '../simulation/GameState';
import type { PipeManager } from '../managers/PipeManager';
import type { BuildingManager } from '../managers/BuildingManager';
import type { Building } from '../types';
import { getTileCenter } from '../grid/GridCoords';
import { getCameraInstance } from '../engine/Camera';
import { Vector3 } from '@babylonjs/core';
import { t } from '../i18n';
import { ICONS } from './Icons';

interface DiagnosticIssue {
  priority: number;
  message: string;
  buildings: Building[];
}

export class DiagnosticManager {
  private pipeManager: PipeManager | null = null;
  private buildingManager: BuildingManager | null = null;
  private hintBar: HTMLDivElement | null = null;
  private currentIssue: DiagnosticIssue | null = null;
  private checkInterval: number | null = null;
  private dismissedIssues: Set<string> = new Set();

  constructor() {
    this.createHintBar();
  }

  public setPipeManager(pipeManager: PipeManager): void {
    this.pipeManager = pipeManager;
    this.startMonitoring();
  }

  public setBuildingManager(buildingManager: BuildingManager): void {
    this.buildingManager = buildingManager;
  }

  private createHintBar(): void {
    this.hintBar = document.createElement('div');
    this.hintBar.id = 'hint-bar';
    this.hintBar.innerHTML = `
      <span class="hint-icon">${ICONS.warning}</span>
      <span class="hint-text"></span>
      <button class="hint-dismiss">${ICONS.close}</button>
    `;
    document.body.appendChild(this.hintBar);

    const dismissBtn = this.hintBar.querySelector('.hint-dismiss');
    dismissBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentIssue) {
        this.dismissedIssues.add(this.currentIssue.message);
        this.hideHint();
      }
    });

    // Click on hint bar to focus camera on first problematic building
    this.hintBar.addEventListener('click', () => {
      if (this.currentIssue?.buildings.length) {
        const building = this.currentIssue.buildings[0];
        const worldPos = getTileCenter(building.gridX, building.gridZ);
        const camera = getCameraInstance();
        camera?.focusOn(new Vector3(worldPos.x, 0, worldPos.z));
      }
    });
  }

  private startMonitoring(): void {
    gameState.on('resourceTrend', (data) => {
      this.checkIssues(data as ResourceTrend);
    });

    gameState.on('buildingPlaced', () => {
      this.checkIssues(gameState.getResourceTrend());
    });

    gameState.on('buildingRemoved', () => {
      this.checkIssues(gameState.getResourceTrend());
    });

    this.checkInterval = window.setInterval(() => {
      this.checkIssues(gameState.getResourceTrend());
    }, 3000);
  }

  private checkIssues(trends: ResourceTrend): void {
    if (!this.pipeManager) return;

    const resources = gameState.getResources();
    const buildings = gameState.getBuildings();
    const issues: DiagnosticIssue[] = [];

    const distillers = buildings.filter((b) => b.type === 'distiller');
    const microrayons = buildings.filter((b) => b.type === 'microrayon');

    if (distillers.length > 0 && trends.freshWater <= 0 && resources.freshWater < 100) {
      const disconnectedDistillers = distillers.filter(
        (d) => !this.pipeManager!.isFullyOperational(d)
      );

      if (disconnectedDistillers.length > 0) {
        issues.push({
          priority: 1,
          message: t('diagnostic.distillerDisconnected', {
            count: disconnectedDistillers.length
          }),
          buildings: disconnectedDistillers
        });
      } else if (resources.seawater < 10 * distillers.length) {
        issues.push({
          priority: 2,
          message: t('diagnostic.waterStuck'),
          buildings: []
        });
      } else if (resources.heat < 10 * distillers.length) {
        issues.push({
          priority: 2,
          message: t('diagnostic.heatStuck'),
          buildings: []
        });
      }
    }

    const disconnectedHousing = microrayons.filter((m) => !this.pipeManager!.isFullyOperational(m));

    if (disconnectedHousing.length > 0 && microrayons.length > 0) {
      issues.push({
        priority: 3,
        message: t('diagnostic.housingDisconnected', { count: disconnectedHousing.length }),
        buildings: disconnectedHousing
      });
    }

    if (trends.freshWater < -5 && distillers.length > 0) {
      issues.push({
        priority: 2,
        message: t('diagnostic.freshWaterDeclining'),
        buildings: []
      });
    }

    if (trends.heat < -10 && buildings.filter((b) => b.type === 'reactor').length > 0) {
      issues.push({
        priority: 3,
        message: t('diagnostic.heatDeclining'),
        buildings: []
      });
    }

    if (issues.length > 0) {
      issues.sort((a, b) => a.priority - b.priority);
      const topIssue = issues[0];

      if (!this.dismissedIssues.has(topIssue.message)) {
        this.showHint(topIssue);
      }
    } else {
      this.hideHint();
      this.dismissedIssues.clear();
    }
  }

  private showHint(issue: DiagnosticIssue): void {
    if (!this.hintBar) return;

    this.currentIssue = issue;
    const textEl = this.hintBar.querySelector('.hint-text');
    if (textEl) {
      textEl.textContent = issue.message;
    }

    this.hintBar.classList.add('show');

    // Highlight problematic buildings
    if (this.buildingManager && issue.buildings.length > 0) {
      this.buildingManager.highlightProblematic(issue.buildings);
    }
  }

  private hideHint(): void {
    if (!this.hintBar) return;

    this.hintBar.classList.remove('show');
    this.currentIssue = null;

    // Clear highlights
    if (this.buildingManager) {
      this.buildingManager.clearHighlights();
    }
  }

  public dispose(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }
    if (this.buildingManager) {
      this.buildingManager.clearHighlights();
    }
    this.hintBar?.remove();
  }
}
