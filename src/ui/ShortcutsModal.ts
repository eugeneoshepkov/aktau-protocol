import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';
import { tickSystem } from '../simulation/TickSystem';
import { t, td } from '../i18n';

export class ShortcutsModal {
  private overlay: HTMLDialogElement;

  constructor() {
    this.overlay = document.createElement('dialog');
    this.overlay.id = 'shortcuts-modal';
    this.overlay.setAttribute('aria-labelledby', 'controls-title');
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

    this.overlay.addEventListener('close', () => {
      soundManager.play('click');
      tickSystem.onModalClose();
    });

    window.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

      // Open with ? or F1
      if ((e.key === '?' || e.key === 'F1') && !tickSystem.hasOpenModal()) {
        e.preventDefault();
        this.open();
      }
    });
  }

  private createContent(): string {
    const touch = matchMedia('(pointer: coarse)').matches;
    const title = touch ? t('shortcuts.touchTitle') : t('shortcuts.title');
    return `
      <div class="shortcuts-content">
        <div class="shortcuts-header">
          <h2 id="controls-title"><span class="shortcuts-icon" aria-hidden="true">${touch ? ICONS.book : ICONS.keyboard}</span> ${title}</h2>
          <button type="button" class="shortcuts-close" aria-label="${t('menu.close')}" autofocus>${ICONS.close}</button>
        </div>

        ${touch ? `
        <dl class="touch-controls">
          <dt>${t('shortcuts.camera')}</dt><dd>${t('guide.touchControls')}</dd>
          <dt>${t('shortcuts.touchExplore')}</dt><dd>${t('shortcuts.touchInspect')}</dd>
          <dt>${t('shortcuts.building')}</dt><dd>${t('shortcuts.touchBuild')}</dd>
        </dl>` : `
        <div class="shortcuts-sections">
          <div class="shortcuts-section">
            <h3>${t('shortcuts.camera')}</h3>
            <div class="shortcut-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>${t('shortcuts.pan')}</span></div>
            <div class="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>${t('shortcuts.panDrag')}</span></div>
            <div class="shortcut-row"><kbd>Q</kbd> / <kbd>E</kbd><span>${t('shortcuts.rotate')}</span></div>
            <div class="shortcut-row"><kbd>Scroll</kbd><span>${t('shortcuts.zoom')}</span></div>
            <div class="shortcut-row"><kbd>${t('shortcuts.drag')}</kbd><span>${t('shortcuts.panMouse')}</span></div>
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
        </div>`}
      </div>
    `;
  }

  public open(): void {
    if (this.overlay.open) return;
    this.overlay.showModal();
    soundManager.play('click');
    tickSystem.onModalOpen();
  }

  public close(): void {
    this.overlay.close();
  }

  public toggle(): void {
    if (this.overlay.open) {
      this.close();
    } else {
      this.open();
    }
  }
}
