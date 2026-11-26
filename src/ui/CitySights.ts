import type { AbstractMesh } from '@babylonjs/core';
import { t } from '../i18n';
import { tickSystem } from '../simulation/TickSystem';
import { normalizeKey } from '../utils/keyboard';
import { ICONS } from './Icons';
import './city-sights.css';

const sights = [
  ['lighthouse', 'https://www.gov.kz/org/akimat-goroda-aktau/press/news/details/762966'],
  ['monument', 'https://adilet.zan.kz/rus/docs/V20M0004310'],
  ['factory', 'https://www.lada.kz/aktau_news/society/51049-predpriyatiya-shevchenko.html'],
  ['reactor', 'https://www-pub.iaea.org/MTCD/Publications/PDF/TE-1769_web.pdf#page=26'],
  ['distiller', 'https://www-pub.iaea.org/MTCD/Publications/PDF/te_1642_web.pdf#page=107'],
  ['fieldTower', 'https://www.ijsred.com/volume3/issue3/IJSRED-V3I3P169.pdf#page=5'],
  ['fieldTrace', 'https://www.ijsred.com/volume3/issue3/IJSRED-V3I3P169.pdf#page=4']
] as const;

export type SightId = (typeof sights)[number][0];

export class CitySights {
  private readonly launcher = document.createElement('button');
  private readonly card = document.createElement('section');
  private readonly closeButton: HTMLButtonElement;
  private readonly locate: (id: SightId) => AbstractMesh | null;
  private readonly focus: (mesh: AbstractMesh) => void;
  private stops: (typeof sights)[number][] = [];
  private readonly leave: () => void;
  private index = 0;

  constructor(locate: (id: SightId) => AbstractMesh | null, focus: (mesh: AbstractMesh) => void, leave: () => void) {
    this.locate = locate;
    this.focus = focus;
    this.leave = leave;
    const controls = document.createElement('div');
    controls.className = 'map-tools';
    this.launcher.type = 'button';
    this.launcher.className = 'sights-launcher network-toggle';
    this.launcher.title = t('sight.open');
    this.launcher.setAttribute('aria-label', t('sight.open'));
    this.launcher.setAttribute('aria-expanded', 'false');
    this.launcher.setAttribute('aria-controls', 'city-sights');
    this.launcher.innerHTML = `${ICONS.pin}<span>${t('sight.open')}</span>`;
    this.launcher.addEventListener('click', () => this.open());
    controls.append(this.launcher);
    const network = document.querySelector<HTMLDetailsElement>('.network-control');
    if (network) controls.append(network);

    this.card.id = 'city-sights';
    this.card.hidden = true;
    this.card.setAttribute('aria-labelledby', 'sight-name');
    this.card.innerHTML = `
      <div class="sight-header">
        <span>${ICONS.pin}${t('sight.open')}</span>
        <button type="button" class="sight-close" aria-label="${t('sight.close')}" title="${t('sight.close')}">${ICONS.close}</button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <h2 id="sight-name"></h2><p class="sight-description"></p>
      </div>
      <div class="sight-footer">
        <a class="sight-source" target="_blank" rel="noopener noreferrer">${t('sight.source')} ↗</a>
        <div class="sight-pages">
          <button type="button" class="sight-prev" aria-label="${t('sight.prev')}" title="${t('sight.prev')}">‹</button>
          <span class="sight-count"></span>
          <button type="button" class="sight-next" aria-label="${t('sight.next')}" title="${t('sight.next')}">›</button>
        </div>
      </div>`;
    this.closeButton = this.card.querySelector('.sight-close')!;
    this.closeButton.addEventListener('click', () => this.close());
    this.card
      .querySelector('.sight-prev')!
      .addEventListener('click', () => this.show(this.index - 1));
    this.card
      .querySelector('.sight-next')!
      .addEventListener('click', () => this.show(this.index + 1));
    document.body.append(controls, this.card);
    window.addEventListener(
      'keydown',
      (event) => {
        if (!this.isOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'Escape') {
          event.stopImmediatePropagation();
          event.preventDefault();
          this.close();
        } else if (/^(?:[1-6xcчj ]|home|\?|f1)$/.test(normalizeKey(event.key))) {
          event.stopImmediatePropagation();
          if (event.key === 'F1') event.preventDefault();
        }
      },
      true
    );
  }

  public isOpen(): boolean {
    return !this.card.hidden;
  }

  public open(id?: SightId): void {
    this.stops = sights.filter(([key]) => this.locate(key));
    const index = id ? this.stops.findIndex(([key]) => key === id) : 0;
    if (index < 0 || !this.stops.length) return;
    if (!this.isOpen()) {
      const network = document.querySelector<HTMLDetailsElement>('.network-control');
      if (network) network.open = false;
      tickSystem.onModalOpen();
      this.card.hidden = false;
      this.launcher.setAttribute('aria-expanded', 'true');
      document.body.classList.add('sightseeing');
      this.closeButton.focus({ preventScroll: true });
    }
    this.show(index);
  }

  private show(index: number): void {
    this.index = (index + this.stops.length) % this.stops.length;
    const [id, source] = this.stops[this.index];
    const mesh = this.locate(id);
    if (!mesh) return this.close();
    this.focus(mesh);
    this.card.querySelector('#sight-name')!.textContent = t(`sight.${id}.name`);
    this.card.querySelector('.sight-description')!.textContent = t(`sight.${id}.description`);
    this.card.querySelector<HTMLAnchorElement>('.sight-source')!.href = source;
    this.card.querySelector('.sight-count')!.textContent = `${this.index + 1} / ${this.stops.length}`;
  }

  public close(): void {
    if (!this.isOpen()) return;
    this.card.hidden = true;
    this.launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sightseeing');
    this.leave();
    tickSystem.onModalClose();
    this.launcher.focus({ preventScroll: true });
  }
}
