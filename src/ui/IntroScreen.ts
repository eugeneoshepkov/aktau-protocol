import { ICONS } from './Icons';
import { t, i18n } from '../i18n';

const menuFacts = ['iceCream', 'lighthouse', 'cinema', 'water', 'pier', 'abay'] as const;
const factStorageKey = 'aktau-menu-next-fact';
const factDuration = 12_000;

export class IntroScreen {
  constructor(onStart: (resume: boolean, walk: boolean) => Promise<void>) {
    const screen = document.createElement('main');
    screen.id = 'intro-overlay';
    const hasSave = Boolean(localStorage.getItem('aktau-save'));
    const savedFact = localStorage.getItem(factStorageKey);
    let factIndex = Math.max(0, menuFacts.findIndex(fact => fact === savedFact));
    const audio = new Audio('/audio/title.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audio.muted = localStorage.getItem('aktau-muted') === 'true';

    screen.innerHTML = `
      <header class="title-bar">
        <div class="studio-mark"><span class="orbit-mark">${ICONS.atom}</span>CASPIAN ATOM</div>
        <nav class="title-options">
          <button class="open-guide" title="${t('menu.guide')}" aria-label="${t('menu.guide')}">${ICONS.book}<span>${t('menu.guide')}</span></button>
          <button class="intro-lang-btn" title="${t('intro.language')}">${ICONS.globe}<span>${i18n.getLocale().toUpperCase()}</span></button>
          <button class="intro-mute-btn" aria-label="${t('intro.mute')}"></button>
        </nav>
      </header>
      <section class="title-stage" aria-labelledby="game-title">
        <div class="title-copy">
          <div class="title-genre">${t('menu.genre')}</div>
          <h1 id="game-title"><span>AKTAU</span><span>PROTOCOL</span></h1>
          <p class="title-premise">${t('menu.premise')}</p>
          <div class="title-facts">
            <div class="title-fact-lines">
              ${menuFacts.map((fact, index) => `<p class="title-fact" aria-hidden="${index !== factIndex}">${t(`menu.fact.${fact}`)}</p>`).join('')}
            </div>
            <div class="title-fact-controls">
              <button type="button" class="fact-toggle"></button>
              <button type="button" class="fact-next" aria-label="${t('menu.nextFact')}" title="${t('menu.nextFact')}">${ICONS.next}</button>
            </div>
            <span class="fact-announcement" role="status"></span>
          </div>
          <div class="title-actions">
            <button class="start-city">${ICONS.play}${t(hasSave ? 'menu.continue' : 'menu.start')}</button>
            ${hasSave ? `<button class="new-city">${t('menu.new')}</button>` : ''}
            <button class="walk-city">${ICONS.pin}${t('walk.start')}</button>
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
        <p>${t(matchMedia('(pointer: coarse)').matches ? 'guide.touchControls' : 'guide.controls')}</p>
      </dialog>`;
    document.body.append(screen);

    const guide = screen.querySelector<HTMLDialogElement>('dialog')!;
    const facts = screen.querySelectorAll<HTMLElement>('.title-fact');
    const factToggle = screen.querySelector<HTMLButtonElement>('.fact-toggle')!;
    const announcement = screen.querySelector<HTMLElement>('.fact-announcement')!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches;
    let starting = false;
    let factTimer: number | undefined;
    const nextIndex = () => (factIndex + 1) % facts.length;
    const scheduleFact = () => {
      window.clearTimeout(factTimer);
      if (!paused && !starting && !guide.open && !document.hidden) {
        factTimer = window.setTimeout(() => advanceFact(), factDuration);
      }
    };
    const advanceFact = (announce = false) => {
      facts[factIndex].setAttribute('aria-hidden', 'true');
      factIndex = nextIndex();
      facts[factIndex].setAttribute('aria-hidden', 'false');
      announcement.textContent = announce ? facts[factIndex].textContent : '';
      localStorage.setItem(factStorageKey, menuFacts[nextIndex()]);
      scheduleFact();
    };
    const setPaused = (value: boolean) => {
      paused = value;
      const label = t(paused ? 'menu.resumeFacts' : 'menu.pauseFacts');
      factToggle.title = label;
      factToggle.setAttribute('aria-label', label);
      factToggle.innerHTML = paused ? ICONS.play : ICONS.pause;
      scheduleFact();
    };
    const onMotionChange = () => {
      if (motion.matches) setPaused(true);
    };
    localStorage.setItem(factStorageKey, menuFacts[nextIndex()]);
    factToggle.addEventListener('click', () => setPaused(!paused));
    screen.querySelector('.fact-next')!.addEventListener('click', () => advanceFact(true));
    document.addEventListener('visibilitychange', scheduleFact);
    motion.addEventListener('change', onMotionChange);
    setPaused(motion.matches);

    screen.querySelector('.open-guide')!.addEventListener('click', () => {
      guide.showModal();
      scheduleFact();
    });
    guide.addEventListener('close', scheduleFact);
    screen.querySelector('.close-guide')!.addEventListener('click', () => guide.close());
    guide.addEventListener('click', (event) => {
      if (event.target === guide) guide.close();
    });
    screen.querySelector('.intro-lang-btn')!.addEventListener('click', () => {
      localStorage.setItem(factStorageKey, menuFacts[factIndex]);
      i18n.toggleLocale();
    });

    const mute = screen.querySelector<HTMLButtonElement>('.intro-mute-btn')!;
    const showSound = () => {
      const playing = !audio.muted && !audio.paused;
      const label = t(audio.muted ? 'menu.soundOff' : playing ? 'menu.soundOn' : 'menu.playSound');
      mute.innerHTML = (playing ? ICONS.volumeOn : ICONS.volumeOff) + `<span>${label}</span>`;
      mute.title = label;
      mute.setAttribute('aria-label', audio.paused && !audio.muted ? label : t('intro.mute'));
      mute.setAttribute('aria-pressed', String(playing));
    };
    const playTitle = () => {
      if (starting || audio.muted || !audio.paused) return;
      void audio.play().then(showSound, showSound);
    };
    const playOnKey = (event: KeyboardEvent) => {
      // Enter and Space on a button will deliver a click with that button's own action.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
      playTitle();
    };
    showSound();
    mute.addEventListener('click', () => {
      if (starting) return;
      audio.muted = !audio.muted && !audio.paused;
      localStorage.setItem('aktau-muted', String(audio.muted));
      if (audio.muted) audio.pause();
      showSound();
    });
    screen.addEventListener('click', playTitle);
    document.addEventListener('keydown', playOnKey);
    playTitle();

    const start = async (resume: boolean, walk = false) => {
      if (starting) return;
      starting = true;
      window.clearTimeout(factTimer);
      document.removeEventListener('visibilitychange', scheduleFact);
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('keydown', playOnKey);
      audio.pause();
      const primary = screen.querySelector<HTMLButtonElement>(walk ? '.walk-city' : '.start-city')!;
      primary.disabled = true;
      primary.textContent = t('menu.loading');
      try {
        await onStart(resume, walk);
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
    screen.querySelector('.walk-city')!.addEventListener('click', () => void start(hasSave, true));
    screen.querySelector('.new-city')?.addEventListener('click', () => void start(false));
  }
}
