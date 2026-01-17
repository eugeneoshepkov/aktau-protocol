import { en } from './en';
import { ru } from './ru';

export type Locale = 'en' | 'ru';

type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const LOCALE_STORAGE_KEY = 'aktau-locale';

class I18n {
  private locale: Locale;
  private translations: Translations;

  constructor() {
    this.locale = this.detectLocale();
    this.translations = this.loadTranslations();
  }

  private detectLocale(): Locale {
    // Check localStorage first for user preference
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved === 'en' || saved === 'ru') {
      return saved;
    }

    // Fall back to browser locale
    const lang = navigator.language.toLowerCase();
    // Russian for RU or KZ (Kazakhstan) locales
    return lang.startsWith('ru') || lang.startsWith('kk') ? 'ru' : 'en';
  }

  private loadTranslations(): Translations {
    return this.locale === 'ru' ? ru : en;
  }

  /**
   * Switch locale and reload the page
   */
  setLocale(locale: Locale): void {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.location.reload();
  }

  /**
   * Toggle between locales
   */
  toggleLocale(): void {
    this.setLocale(this.locale === 'en' ? 'ru' : 'en');
  }

  /**
   * Get translation with optional variable interpolation
   * @param key Translation key
   * @param vars Variables to interpolate (e.g., { days: 42 } for "Survived {days} days")
   */
  t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let text = this.translations[key] || (en as Translations)[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }

  getLocale(): Locale {
    return this.locale;
  }
}

export const i18n = new I18n();

// Export for type-safe usage with known keys
export const t = (key: TranslationKey, vars?: Record<string, string | number>): string =>
  i18n.t(key, vars);

// Export for dynamic key usage (e.g., building keys from variables)
export const td = (key: string, vars?: Record<string, string | number>): string =>
  i18n.t(key as TranslationKey, vars);

export type { TranslationKey };
