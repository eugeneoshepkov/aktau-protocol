import './style.css';
import './title.css';
import './city-ui.css';
import { IntroScreen } from './ui/IntroScreen';
import { i18n } from './i18n';
import { musicManager } from './managers/MusicManager';

document.documentElement.lang = i18n.getLocale();
new IntroScreen(async (resume, walk) => {
  void musicManager.prepareShore();
  const { initGame } = await import('./main');
  await initGame(resume, walk);
});
