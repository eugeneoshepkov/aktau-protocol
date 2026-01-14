import { gameState, type ResourceTrend } from '../simulation/GameState';
import type { PipeManager } from '../managers/PipeManager';
import { t } from '../i18n';

interface DiagnosticIssue {
  priority: number;
  message: string;
}

export class DiagnosticManager {
  private pipeManager: PipeManager | null = null;
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

  private createHintBar(): void {
    this.hintBar = document.createElement('div');
    this.hintBar.id = 'hint-bar';
    this.hintBar.innerHTML = `
      <span class="hint-icon">⚠️</span>
      <span class="hint-text"></span>
      <button class="hint-dismiss">×</button>
    `;
    document.body.appendChild(this.hintBar);

    const dismissBtn = this.hintBar.querySelector('.hint-dismiss');
    dismissBtn?.addEventListener('click', () => {
      if (this.currentIssue) {
        this.dismissedIssues.add(this.currentIssue.message);
        this.hideHint();
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
          })
        });
      } else if (resources.seawater < 10 * distillers.length) {
        issues.push({
          priority: 2,
          message: t('diagnostic.waterStuck')
        });
      } else if (resources.heat < 10 * distillers.length) {
        issues.push({
          priority: 2,
          message: t('diagnostic.heatStuck')
        });
      }
    }

    const disconnectedHousing = microrayons.filter(
      (m) => !this.pipeManager!.isFullyOperational(m)
    );

    if (disconnectedHousing.length > 0 && microrayons.length > 0) {
      issues.push({
        priority: 3,
        message: t('diagnostic.housingDisconnected', { count: disconnectedHousing.length })
      });
    }

    if (trends.freshWater < -5 && distillers.length > 0) {
      issues.push({
        priority: 2,
        message: t('diagnostic.freshWaterDeclining')
      });
    }

    if (trends.heat < -10 && buildings.filter((b) => b.type === 'reactor').length > 0) {
      issues.push({
        priority: 3,
        message: t('diagnostic.heatDeclining')
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
  }

  private hideHint(): void {
    if (!this.hintBar) return;

    this.hintBar.classList.remove('show');
    this.currentIssue = null;
  }

  public dispose(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }
    this.hintBar?.remove();
  }
}
