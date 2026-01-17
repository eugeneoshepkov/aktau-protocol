import { gameState, type ResourceTrend } from '../simulation/GameState';
import type { PipeManager } from '../managers/PipeManager';
import type { BuildingManager } from '../managers/BuildingManager';
import type { Building } from '../types';
import { getTileCenter } from '../grid/GridCoords';
import { getCameraInstance } from '../engine/Camera';
import { Vector3 } from '@babylonjs/core';
import { td } from '../i18n';
import { ICONS, icon } from './Icons';

interface DiagnosticIssue {
  priority: number;
  message: string;
  buildings: Building[];
}

type MissingResourceType = 'water' | 'heat' | 'both';

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

    // Always check for disconnected distillers - they should always be highlighted
    if (distillers.length > 0) {
      const disconnectedDistillers = distillers.filter(
        (d) => !this.pipeManager!.isFullyOperational(d)
      );

      if (disconnectedDistillers.length > 0) {
        // Analyze what distillers are missing
        const missingType = this.analyzeMissingConnections(disconnectedDistillers);
        issues.push({
          priority: 1,
          message: this.buildConnectionMessage(
            'distiller',
            disconnectedDistillers.length,
            missingType
          ),
          buildings: disconnectedDistillers
        });
      } else if (trends.freshWater <= 0 && resources.freshWater < 100) {
        // Only show resource-related warnings if no disconnection issues
        if (resources.seawater < 10 * distillers.length) {
          issues.push({
            priority: 2,
            message: `${icon('water', 14)} ${td('diagnostic.waterStuck.text')}`,
            buildings: []
          });
        } else if (resources.heat < 8 * distillers.length) {
          issues.push({
            priority: 2,
            message: `${icon('heat', 14)} ${td('diagnostic.heatStuck.text')}`,
            buildings: []
          });
        }
      }
    }

    const disconnectedHousing = microrayons.filter((m) => !this.pipeManager!.isFullyOperational(m));

    if (disconnectedHousing.length > 0 && microrayons.length > 0) {
      // Analyze what housing is missing (water, heat, or both)
      const missingType = this.analyzeMissingConnections(disconnectedHousing);
      issues.push({
        priority: 3,
        message: this.buildConnectionMessage('housing', disconnectedHousing.length, missingType),
        buildings: disconnectedHousing
      });
    }

    if (trends.freshWater < -5 && distillers.length > 0) {
      issues.push({
        priority: 2,
        message: `${icon('water', 14)} ${td('diagnostic.freshWaterDeclining.text')}`,
        buildings: []
      });
    }

    if (trends.heat < -10 && buildings.filter((b) => b.type === 'reactor').length > 0) {
      issues.push({
        priority: 3,
        message: `${icon('heat', 14)} ${td('diagnostic.heatDeclining.text')}`,
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

  /**
   * Analyze disconnected buildings to determine what resource type(s) they're missing
   */
  private analyzeMissingConnections(buildings: Building[]): MissingResourceType {
    if (!this.pipeManager) return 'both';

    let needsWater = false;
    let needsHeat = false;

    for (const building of buildings) {
      const missing = this.pipeManager.getMissingConnections(building);
      for (const m of missing) {
        if (m.resourceType === 'water') needsWater = true;
        if (m.resourceType === 'heat') needsHeat = true;
      }
    }

    if (needsWater && needsHeat) return 'both';
    if (needsWater) return 'water';
    if (needsHeat) return 'heat';
    return 'both'; // fallback
  }

  /**
   * Build a diagnostic message with appropriate icon based on missing resource type
   */
  private buildConnectionMessage(
    buildingType: 'distiller' | 'housing',
    count: number,
    missingType: MissingResourceType
  ): string {
    const buildingIcon = buildingType === 'distiller' ? icon('distiller', 14) : icon('microrayon', 14);

    let resourceIcon: string;
    let messageKey: string;

    if (missingType === 'water') {
      resourceIcon = icon('water', 14);
      messageKey =
        buildingType === 'distiller'
          ? 'diagnostic.distillerNeedsWater'
          : 'diagnostic.housingNeedsWater';
    } else if (missingType === 'heat') {
      resourceIcon = icon('heat', 14);
      messageKey =
        buildingType === 'distiller'
          ? 'diagnostic.distillerNeedsHeat'
          : 'diagnostic.housingNeedsHeat';
    } else {
      // Both
      resourceIcon = `${icon('water', 14)}${icon('heat', 14)}`;
      messageKey =
        buildingType === 'distiller'
          ? 'diagnostic.distillerNeedsBoth'
          : 'diagnostic.housingNeedsBoth';
    }

    return `${buildingIcon} ${td(messageKey, { count })} ${resourceIcon}`;
  }

  private showHint(issue: DiagnosticIssue): void {
    if (!this.hintBar) return;

    this.currentIssue = issue;
    const textEl = this.hintBar.querySelector('.hint-text');
    if (textEl) {
      textEl.innerHTML = issue.message;
    }

    this.hintBar.classList.add('show');

    // Always clear previous highlights first, then highlight new buildings if any
    if (this.buildingManager) {
      if (issue.buildings.length > 0) {
        this.buildingManager.highlightProblematic(issue.buildings);
      } else {
        this.buildingManager.clearHighlights();
      }
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
