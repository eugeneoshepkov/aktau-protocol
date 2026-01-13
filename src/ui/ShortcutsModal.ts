import { ICONS } from './Icons';
import { soundManager } from '../managers/SoundManager';

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
          <h2><span class="shortcuts-icon">${ICONS.keyboard}</span> Keyboard Shortcuts</h2>
          <button class="shortcuts-close">${ICONS.close}</button>
        </div>

        <div class="shortcuts-sections">
          <div class="shortcuts-section">
            <h3>Camera</h3>
            <div class="shortcut-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Pan camera</span></div>
            <div class="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>Pan camera (drag-style)</span></div>
            <div class="shortcut-row"><kbd>Q</kbd> / <kbd>E</kbd><span>Rotate camera</span></div>
            <div class="shortcut-row"><kbd>Scroll</kbd><span>Zoom in/out</span></div>
            <div class="shortcut-row"><kbd>Shift</kbd> + <kbd>Drag</kbd><span>Pan camera (mouse)</span></div>
            <div class="shortcut-row"><kbd>C</kbd><span>Center map</span></div>
            <div class="shortcut-row"><kbd>Home</kbd><span>Reset view</span></div>
          </div>

          <div class="shortcuts-section">
            <h3>Building</h3>
            <div class="shortcut-row"><kbd>1</kbd><span>Water Pump</span></div>
            <div class="shortcut-row"><kbd>2</kbd><span>BN-350 Reactor</span></div>
            <div class="shortcut-row"><kbd>3</kbd><span>Desalination Plant</span></div>
            <div class="shortcut-row"><kbd>4</kbd><span>Microrayon Housing</span></div>
            <div class="shortcut-row"><kbd>5</kbd><span>Water Tank</span></div>
            <div class="shortcut-row"><kbd>Esc</kbd><span>Cancel placement</span></div>
          </div>

          <div class="shortcuts-section">
            <h3>General</h3>
            <div class="shortcut-row"><kbd>?</kbd> / <kbd>F1</kbd><span>Show shortcuts</span></div>
            <div class="shortcut-row"><kbd>Space</kbd><span>Pause/Resume</span></div>
          </div>
        </div>

        <div class="shortcuts-footer">
          Press <kbd>Esc</kbd> to close
        </div>
      </div>
    `;
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add('open');
    soundManager.play('click');
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove('open');
    soundManager.play('click');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
