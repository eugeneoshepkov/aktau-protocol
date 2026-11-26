import type { AbstractMesh } from '@babylonjs/core';
import { t } from '../i18n';
import { tickSystem } from '../simulation/TickSystem';
import { gameState } from '../simulation/GameState';
import { normalizeKey } from '../utils/keyboard';
import { ICONS } from './Icons';
import { NeighbourhoodAlbum, isWalkStop, walkStops, type WalkStop } from './NeighbourhoodAlbum';
import './city-sights.css';

const sights = [
  ['lighthouse', 'https://www.gov.kz/org/akimat-goroda-aktau/press/news/details/762966'],
  ['abayPalace', 'https://www.lada.kz/istoriya-v-fotografiyah/36820-v-aktau-ansamblyu-tanca-altair-ispolnilos-50-let.html'],
  ['monument', 'https://adilet.zan.kz/rus/docs/V20M0004310'],
  ['factory', 'https://www.lada.kz/aktau_news/society/51049-predpriyatiya-shevchenko.html'],
  ['reactor', 'https://www-pub.iaea.org/MTCD/Publications/PDF/TE-1769_web.pdf#page=26'],
  ['distiller', 'https://www-pub.iaea.org/MTCD/Publications/PDF/te_1642_web.pdf#page=107'],
  ['fieldTower', 'https://www.ijsred.com/volume3/issue3/IJSRED-V3I3P169.pdf#page=5'],
  ['fieldTrace', 'https://www.ijsred.com/volume3/issue3/IJSRED-V3I3P169.pdf#page=4']
] as const;

const onishchenko = 'https://www.lada.kz/columns/12499-aktau-onischenko.html';
const walkSources: Record<WalkStop, string> = {
  iceCream: onishchenko,
  swimmingPier: 'https://otpannews.kz/ru/news/konferentsiia-neravnodushnykh-zhiteli-aktau-podelilis-svoimi-vospominaniiami-o-kaspii',
  torysh: 'https://tour-mangystau.kz/ru/destinations/torysh',
  chaika: onishchenko
};
const neighbourhood = walkStops.map((id) => [id, walkSources[id]] as const);

export type SightId = (typeof sights)[number][0] | WalkStop;

export class CitySights {
  private readonly launcher = document.createElement('button');
  private readonly card = document.createElement('section');
  private readonly closeButton: HTMLButtonElement;
  private readonly locate: (id: SightId) => AbstractMesh | null;
  private readonly focus: (mesh: AbstractMesh) => void;
  private stops: ReadonlyArray<readonly [SightId, string]> = [];
  private readonly album: NeighbourhoodAlbum;
  private readonly invitation = document.createElement('button');
  private returnFocus: HTMLElement | null = null;
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
        <div class="sight-routes" role="group" aria-label="${t('walk.routes')}">
          <button type="button" data-route="sights">${t('sight.open')}</button>
          <button type="button" data-route="walk">${t('walk.label')}</button>
        </div>
        <button type="button" class="sight-close" aria-label="${t('sight.close')}" title="${t('sight.close')}">${ICONS.close}</button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <h2 id="sight-name"></h2><p class="sight-description"></p>
      </div>
      <div class="neighbourhood-album" hidden></div>
      <details class="reactor-record" hidden>
        <summary>${t('press.reactorSummary')}</summary>
        <p>${t('press.reactor')} <a href="https://www-pub.iaea.org/MTCD/Publications/PDF/te_876_web.pdf#page=179" target="_blank" rel="noopener noreferrer">${t('press.reactorLink')} ↗</a></p>
      </details>
      <details class="maek-clipping" hidden>
        <summary>${t('press.summary')}</summary>
        <p>${t('press.early')} <a href="https://mangyshlak.kz/gazeta-pravda-%E2%84%9612-1967-god/" target="_blank" rel="noopener noreferrer">${t('press.earlyLink')} ↗</a></p>
        <p>${t('press.water')} <a href="https://www.lada.kz/aktau_news/society/91530-zhiteli-aktau-do-nochi-stoyali-v-ocheredi-k-vodovozu.html" target="_blank" rel="noopener noreferrer">${t('press.waterLink')} ↗</a></p>
        <p>${t('press.power')} <a href="https://www.kegoc.kz/ru/press-center/press-releases/161747/" target="_blank" rel="noopener noreferrer">${t('press.powerLink')} ↗</a></p>
      </details>
      <div class="sight-footer">
        <a class="sight-source" target="_blank" rel="noopener noreferrer">${t('sight.source')} ↗</a>
        <div class="sight-pages">
          <button type="button" class="sight-prev" aria-label="${t('sight.prev')}" title="${t('sight.prev')}">‹</button>
          <span class="sight-count"></span>
          <button type="button" class="sight-next" aria-label="${t('sight.next')}" title="${t('sight.next')}">›</button>
        </div>
      </div>`;
    this.album = new NeighbourhoodAlbum(this.card.querySelector('.neighbourhood-album')!);
    this.card.querySelector('[data-route="sights"]')!.addEventListener('click', () => this.open());
    this.card.querySelector('[data-route="walk"]')!.addEventListener('click', () => this.openWalk());
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
        } else if (event.target instanceof HTMLTextAreaElement) {
          return;
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

  public openWalk(): void {
    this.open(this.album.firstStop());
  }

  public mountInvitation(slot: HTMLElement): void {
    this.invitation.type = 'button';
    this.invitation.className = 'walk-invitation';
    this.invitation.addEventListener('click', () => this.openWalk());
    slot.append(this.invitation);
    gameState.on('orderComplete', () => this.refreshInvitation());
    gameState.on('seasonChange', () => this.refreshInvitation());
    this.refreshInvitation();
  }

  private refreshInvitation(): void {
    const stop = this.album.availableStop();
    this.invitation.hidden = !stop || gameState.getCompletedOrders() < 1;
    if (stop) this.invitation.textContent = t(`walk.${stop}.invite`) + ' →';
  }

  public open(id?: SightId, readPress = false): void {
    const walking = id !== undefined && isWalkStop(id);
    const route = walking ? neighbourhood : sights;
    const stops = route.filter(([key]) => this.locate(key));
    const index = id ? stops.findIndex(([key]) => key === id) : 0;
    if (index < 0 || !stops.length) return;
    this.stops = stops;
    this.card.classList.toggle('neighbourhood-walk', walking);
    this.card.querySelector('[data-route="sights"]')!.setAttribute('aria-pressed', String(!walking));
    this.card.querySelector('[data-route="walk"]')!.setAttribute('aria-pressed', String(walking));
    if (!this.isOpen()) {
      this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const network = document.querySelector<HTMLDetailsElement>('.network-control');
      if (network) network.open = false;
      tickSystem.onModalOpen();
      this.card.hidden = false;
      this.launcher.setAttribute('aria-expanded', 'true');
      document.body.classList.add('sightseeing');
      this.closeButton.focus({ preventScroll: true });
    }
    this.show(index);
    if (readPress && id === 'distiller') {
      this.card.querySelector<HTMLDetailsElement>('.maek-clipping')!.open = true;
    }
  }

  private show(index: number): void {
    this.index = (index + this.stops.length) % this.stops.length;
    const [id, source] = this.stops[this.index];
    const mesh = this.locate(id);
    if (!mesh) return this.close();
    this.focus(mesh);
    this.card.querySelector('#sight-name')!.textContent = t(`sight.${id}.name`);
    this.card.querySelector('.sight-description')!.textContent = t(`sight.${id}.description`);
    const link = this.card.querySelector<HTMLAnchorElement>('.sight-source')!;
    link.href = source;
    link.textContent = t(id === 'torysh' ? 'walk.landscapeSource' : isWalkStop(id) ? 'walk.source' : 'sight.source') + ' ↗';
    if (isWalkStop(id)) this.album.show(id);
    else this.album.hide();
    const clipping = this.card.querySelector<HTMLDetailsElement>('.maek-clipping')!;
    clipping.open = false;
    clipping.hidden = id !== 'distiller';
    const record = this.card.querySelector<HTMLDetailsElement>('.reactor-record')!;
    record.open = false;
    record.hidden = id !== 'reactor';
    this.card.scrollTop = 0;
    this.card.querySelector('.sight-count')!.textContent = `${this.index + 1} / ${this.stops.length}`;
  }

  public close(): void {
    if (!this.isOpen()) return;
    this.card.hidden = true;
    this.launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sightseeing');
    this.leave();
    tickSystem.onModalClose();
    this.refreshInvitation();
    const target = this.returnFocus;
    (target?.isConnected && target.offsetParent !== null && target !== document.body
      ? target
      : this.launcher).focus({ preventScroll: true });
  }
}
