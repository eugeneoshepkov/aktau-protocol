import './style.css';
import './title.css';
import './city-ui.css';
import { IntroScreen } from './ui/IntroScreen';
import { i18n } from './i18n';

document.documentElement.lang = i18n.getLocale();
new IntroScreen(async (resume, walk) => {
  const { initGame } = await import('./main');
  await initGame(resume, walk);
});
