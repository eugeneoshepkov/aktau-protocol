import { ICONS } from './Icons';
import { t, i18n } from '../i18n';

export class IntroScreen {
  constructor(onStart: (resume: boolean) => Promise<void>) {
    const screen = document.createElement('main');
    screen.id = 'intro-overlay';
    const hasSave = Boolean(localStorage.getItem('aktau-save'));
    const audio = new Audio('/audio/title.mp3');
    audio.volume = 0.4;
    audio.muted = localStorage.getItem('aktau-muted') === 'true';

    screen.innerHTML = `
      <header class="title-bar">
        <div class="studio-mark"><span class="orbit-mark">${ICONS.atom}</span>CASPIAN ATOM</div>
        <nav class="title-options">
          <button class="intro-lang-btn" title="${t('intro.language')}">${ICONS.globe}<span>${i18n.getLocale().toUpperCase()}</span></button>
          <button class="intro-mute-btn" aria-label="${t('intro.mute')}"></button>
        </nav>
      </header>
      <section class="title-stage" aria-labelledby="game-title">
        <div class="title-copy">
          <div class="title-genre">${t('menu.genre')}</div>
          <h1 id="game-title"><span>AKTAU</span><span>PROTOCOL</span></h1>
          <p class="title-premise">${t('menu.premise')}</p>
          <div class="title-actions">
            <button class="start-city">${ICONS.play}${t(hasSave ? 'menu.continue' : 'menu.start')}</button>
            ${hasSave ? `<button class="new-city">${t('menu.new')}</button>` : ''}
            <button class="open-guide">${ICONS.book}${t('menu.guide')}</button>
          </div>
          <p class="launch-status" role="status"></p>
        </div>
      </section>
      <footer class="title-footer">
        <div>${ICONS.pin}<span>${t('menu.place')}</span></div>
        <span class="title-coordinate">43°39′ N &nbsp; 51°09′ E</span>
        <span class="title-year">${t('menu.era')}</span>
      </footer>
      <dialog class="field-guide">
        <header><h2>${t('menu.guide')}</h2><button class="close-guide" aria-label="${t('menu.close')}">${ICONS.close}</button></header>
        <dl>
          <dt>${t('guide.water')}</dt><dd>${t('guide.water.info')}</dd>
          <dt>${t('guide.housing')}</dt><dd>${t('guide.housing.info')}</dd>
          <dt>${t('guide.winter')}</dt><dd>${t('guide.winter.info')}</dd>
        </dl>
        <p>${t('guide.controls')}</p>
      </dialog>`;
    document.body.append(screen);

    const guide = screen.querySelector<HTMLDialogElement>('dialog')!;
    screen.querySelector('.open-guide')!.addEventListener('click', () => guide.showModal());
    screen.querySelector('.close-guide')!.addEventListener('click', () => guide.close());
    guide.addEventListener('click', (event) => {
      if (event.target === guide) guide.close();
    });
    screen.querySelector('.intro-lang-btn')!.addEventListener('click', () => i18n.toggleLocale());

    const mute = screen.querySelector<HTMLButtonElement>('.intro-mute-btn')!;
    const showSound = () => {
      mute.innerHTML =
        (audio.muted ? ICONS.volumeOff : ICONS.volumeOn) +
        `<span>${t(audio.muted ? 'menu.soundOff' : 'menu.soundOn')}</span>`;
      mute.setAttribute('aria-pressed', String(audio.muted));
    };
    showSound();
    mute.addEventListener('click', () => {
      audio.muted = !audio.muted;
      localStorage.setItem('aktau-muted', String(audio.muted));
      if (!audio.muted) void audio.play().catch(() => {});
      showSound();
    });
    if (!audio.muted) void audio.play().catch(() => {});

    let starting = false;
    const start = async (resume: boolean) => {
      if (starting) return;
      starting = true;
      audio.pause();
      const primary = screen.querySelector<HTMLButtonElement>('.start-city')!;
      primary.disabled = true;
      primary.textContent = t('menu.loading');
      try {
        await onStart(resume);
        screen.remove();
      } catch (error) {
        console.error('Could not start Aktau Protocol', error);
        primary.textContent = t('menu.retry');
        primary.disabled = false;
        primary.onclick = () => location.reload();
        screen.querySelector('.launch-status')!.textContent = t('menu.loadFailed');
      }
    };
    screen.querySelector('.start-city')!.addEventListener('click', () => void start(hasSave));
    screen.querySelector('.new-city')?.addEventListener('click', () => void start(false));
  }
}
