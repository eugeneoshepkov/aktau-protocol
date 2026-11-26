import { t } from '../i18n';
import { gameState, SEASONS, SEASON_LENGTH } from '../simulation/GameState';
import './neighbourhood-album.css';

export const walkStops = ['iceCream', 'swimmingPier', 'torysh', 'chaika'] as const;
export type WalkStop = (typeof walkStops)[number];

export function isWalkStop(id: string): id is WalkStop {
  return walkStops.some((stop) => stop === id);
}

// The city calendar begins on day one. During its season a keepsake is available today.
export function nextWalkDay(id: WalkStop, day: number): number {
  if (id === 'iceCream') return day;
  const year = SEASONS.length * SEASON_LENGTH;
  const offset = (day - 1) % year;
  const season = { swimmingPier: 'summer', torysh: 'autumn', chaika: 'winter' } as const;
  const start = SEASONS.indexOf(season[id]) * SEASON_LENGTH;
  if (offset >= start && offset < start + SEASON_LENGTH) return day;
  return day - offset + start + (offset > start ? year : 0);
}

const storageKey = (id: WalkStop) => 'aktau-keepsake-' + id;

export class NeighbourhoodAlbum {
  private readonly slot: HTMLElement;
  private readonly count: HTMLElement;
  private readonly activity: HTMLButtonElement;
  private readonly wait: HTMLElement;
  private readonly item: HTMLElement;
  private readonly result: HTMLElement;
  private readonly art: HTMLElement;
  private readonly title: HTMLElement;
  private readonly flip: HTMLButtonElement;
  private readonly back: HTMLElement;
  private readonly note: HTMLTextAreaElement;
  private readonly privacy: HTMLElement;
  private readonly notes = new Map<WalkStop, string>();
  private current: WalkStop | null = null;
  private inQueue = false;
  private canSave = true;

  constructor(slot: HTMLElement) {
    this.slot = slot;
    slot.classList.add('walk-album');
    slot.innerHTML = `
      <div class="album-line"><span class="album-count" aria-live="polite"></span>
        <button class="album-take" type="button"></button>
      </div>
      <p class="album-wait"></p>
      <p class="album-result" aria-live="polite" hidden></p>
      <div class="album-item" hidden>
        <div class="album-art" role="img">
          <div class="album-wrapper"><i class="scoop"></i><i class="waffle-cup"></i><i class="cup-sleeve"></i></div>
          <div class="album-postcard"><i class="pier-deck"></i><i class="pier-ladder"></i></div>
          <div class="album-sketch"><i></i><i></i><i></i></div>
          <div class="album-strip"><div class="film-frame"><i></i><i></i><i></i></div></div>
        </div>
        <div class="album-item-label"><strong></strong><button class="album-flip" type="button" aria-expanded="false"></button></div>
        <div class="album-back" hidden>
          <label><span>${t('album.note.label')}</span><textarea rows="2" maxlength="600" aria-describedby="album-note-local"></textarea></label>
          <small id="album-note-local"></small>
        </div>
      </div>`;
    this.count = slot.querySelector('.album-count')!;
    this.activity = slot.querySelector('.album-take')!;
    this.wait = slot.querySelector('.album-wait')!;
    this.item = slot.querySelector('.album-item')!;
    this.result = slot.querySelector('.album-result')!;
    this.art = slot.querySelector('.album-art')!;
    this.title = slot.querySelector('.album-item-label strong')!;
    this.flip = slot.querySelector('.album-flip')!;
    this.back = slot.querySelector('.album-back')!;
    this.note = slot.querySelector('textarea')!;
    this.privacy = slot.querySelector('#album-note-local')!;
    try {
      for (const id of walkStops) {
        // An empty string is a collected keepsake with a blank back.
        const note = localStorage.getItem(storageKey(id));
        if (note !== null) this.notes.set(id, note);
      }
    } catch {
      this.canSave = false;
    }
    this.activity.addEventListener('click', () => {
      const id = this.current;
      if (!id || this.activity.hidden) return;
      if (id === 'iceCream' && !this.inQueue) {
        this.inQueue = true;
        this.result.hidden = false;
        this.result.textContent = t('album.iceCream.queue');
        this.activity.textContent = t('album.iceCream.serve');
        this.result.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (!this.notes.has(id)) this.saveNote(id, '');
      this.show(id);
      this.result.hidden = false;
      this.result.textContent = t(id === 'chaika' ? 'album.chaika.scene' : `album.${id}.result`);
      void this.art.offsetWidth;
      this.art.classList.add(id === 'chaika' ? 'rewinding' : 'revisiting');
      this.item.scrollIntoView({ block: 'nearest' });
    });
    this.flip.addEventListener('click', () => {
      this.setBack(this.back.hidden);
      if (!this.back.hidden) this.note.focus();
    });
    this.note.addEventListener('input', () => {
      if (this.current) this.saveNote(this.current, this.note.value);
    });
    for (const event of ['keydown', 'keyup']) {
      this.note.addEventListener(event, (e) => {
        if ((e as KeyboardEvent).key !== 'Escape') e.stopPropagation();
      });
    }
    this.hide();
  }

  availableStop(): WalkStop | undefined {
    const day = gameState.getDay();
    return (['swimmingPier', 'torysh', 'chaika', 'iceCream'] as const).find(
      (id) => !this.notes.has(id) && nextWalkDay(id, day) === day
    );
  }

  firstStop(): WalkStop {
    return this.availableStop() ?? walkStops.find((id) => !this.notes.has(id)) ?? 'iceCream';
  }

  show(id: WalkStop): void {
    this.current = id;
    this.inQueue = false;
    this.result.hidden = true;
    this.slot.hidden = false;
    this.slot.dataset.stop = id;
    const day = gameState.getDay();
    const next = nextWalkDay(id, day);
    const collected = this.notes.has(id);
    this.count.textContent = t('album.count', { count: this.notes.size });
    this.activity.hidden = next !== day && !(id === 'chaika' && collected);
    this.activity.textContent = t(
      collected && id === 'chaika' ? 'album.chaika.replay' : `album.${id}.take`
    );
    this.wait.hidden = !this.activity.hidden;
    if (!this.wait.hidden && id !== 'iceCream')
      this.wait.textContent = t(`album.${id}.wait`, { day: next });
    this.item.hidden = !collected;
    this.title.textContent = t(`album.${id}.item`);
    this.art.setAttribute(
      'aria-label',
      id === 'chaika' ? t('album.chaika.scene') : this.title.textContent
    );
    this.art.classList.remove('rewinding', 'revisiting');
    this.note.value = this.notes.get(id) ?? '';
    this.privacy.textContent = t(this.canSave ? 'album.note.local' : 'album.note.unsaved');
    this.setBack(false);
  }

  hide(): void {
    this.slot.hidden = true;
    this.current = null;
  }

  private setBack(open: boolean): void {
    this.art.hidden = open;
    this.back.hidden = !open;
    this.flip.setAttribute('aria-expanded', String(open));
    this.flip.textContent = t(open ? 'album.note.close' : 'album.note.open');
  }

  private saveNote(id: WalkStop, note: string): void {
    this.notes.set(id, note);
    try {
      localStorage.setItem(storageKey(id), note);
    } catch {
      this.canSave = false;
      this.privacy.textContent = t('album.note.unsaved');
    }
  }
}
