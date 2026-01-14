import { getCameraInstance } from '../engine/Camera';
import type { BuildingType } from '../types';
import { t, td } from '../i18n';

class FeedbackManagerClass {
  private toastContainer: HTMLDivElement | null = null;

  public initialize(): void {
    this.createToastContainer();
  }

  private createToastContainer(): void {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    document.body.appendChild(this.toastContainer);
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
      return buildingType ? td(`feedback.${buildingType}.tile`) : reason;
    }

    if (reason.includes('Not enough electricity')) {
      return t('feedback.needElectricity');
    }
    if (reason.includes('Not enough freshWater')) {
      return t('feedback.needWater');
    }
    if (reason.includes('Not enough heat')) {
      return t('feedback.needHeat');
    }
    if (reason.includes('occupied')) {
      return t('feedback.occupied');
    }
    if (reason.includes('Game is over')) {
      return t('feedback.gameOver');
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

  public dispose(): void {
    this.toastContainer?.remove();
  }
}

export const feedbackManager = new FeedbackManagerClass();
