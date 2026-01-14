import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { tickSystem } from '../simulation/TickSystem';
import { t, td } from '../i18n';

export class ShortcutsModal {
  private overlay: HTMLDivElement;
  private isOpen = false;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'shortcuts-modal';
    this.overlay.innerHTML = this.createContent();
    document.body.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close button
    const closeBtn = this.overlay.querySelector('.shortcuts-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

      // Open with ? or F1
      if ((e.key === '?' || e.key === 'F1') && !this.isOpen) {
        e.preventDefault();
        this.open();
      }
      // Close with Escape
      else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private createContent(): string {
    return `
      <div class="shortcuts-content">
        <div class="shortcuts-header">
          <h2><span class="shortcuts-icon">${ICONS.keyboard}</span> ${t('shortcuts.title')}</h2>
          <button class="shortcuts-close">${ICONS.close}</button>
        </div>

        <div class="shortcuts-sections">
          <div class="shortcuts-section">
            <h3>${t('shortcuts.camera')}</h3>
            <div class="shortcut-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>${t('shortcuts.pan')}</span></div>
            <div class="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>${t('shortcuts.panDrag')}</span></div>
            <div class="shortcut-row"><kbd>Q</kbd> / <kbd>E</kbd><span>${t('shortcuts.rotate')}</span></div>
            <div class="shortcut-row"><kbd>Scroll</kbd><span>${t('shortcuts.zoom')}</span></div>
            <div class="shortcut-row"><kbd>Shift</kbd> + <kbd>Drag</kbd><span>${t('shortcuts.panMouse')}</span></div>
            <div class="shortcut-row"><kbd>C</kbd><span>${t('shortcuts.center')}</span></div>
            <div class="shortcut-row"><kbd>Home</kbd><span>${t('shortcuts.reset')}</span></div>
          </div>

          <div class="shortcuts-section">
            <h3>${t('shortcuts.building')}</h3>
            <div class="shortcut-row"><kbd>1</kbd><span>${td('building.pump.name')}</span></div>
            <div class="shortcut-row"><kbd>2</kbd><span>${td('building.distiller.name')}</span></div>
            <div class="shortcut-row"><kbd>3</kbd><span>${td('building.microrayon.name')}</span></div>
            <div class="shortcut-row"><kbd>4</kbd><span>${td('building.water_tank.name')}</span></div>
            <div class="shortcut-row"><kbd>5</kbd><span>${td('building.thermal_plant.name')}</span></div>
            <div class="shortcut-row"><kbd>Esc</kbd><span>${t('shortcuts.cancel')}</span></div>
          </div>

          <div class="shortcuts-section">
            <h3>${t('shortcuts.general')}</h3>
            <div class="shortcut-row"><kbd>?</kbd> / <kbd>F1</kbd><span>${t('shortcuts.show')}</span></div>
            <div class="shortcut-row"><kbd>J</kbd><span>${t('shortcuts.chronicle')}</span></div>
            <div class="shortcut-row"><kbd>Space</kbd><span>${t('shortcuts.pause')}</span></div>
            <div class="shortcut-row"><kbd>M</kbd><span>${t('shortcuts.mute')}</span></div>
          </div>
        </div>

        <div class="shortcuts-footer">
          ${t('shortcuts.close')}
        </div>
      </div>
    `;
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add('open');
    soundManager.play('click');
    tickSystem.onModalOpen();
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove('open');
    soundManager.play('click');
    tickSystem.onModalClose();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
