import { expect, test } from 'bun:test';
import { HISTORICAL_FACTS } from '../src/data/historicalFacts';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';

test('every Chronicle story has a thumbnail, reader illustration and description in both languages', async () => {
  const directory = new URL('../public/pictures/chronicle/', import.meta.url);
  for (const { id } of HISTORICAL_FACTS) {
    for (const file of [`${id}.webp`, `thumbnail/${id}.webp`]) {
      expect(await Bun.file(new URL(file, directory)).exists(), file).toBe(true);
    }
    const key = `fact.${id}.imageAlt`;
    for (const locale of [en, ru]) {
      expect((locale as Record<string, string>)[key]?.trim().length, key).toBeGreaterThan(0);
    }
  }
});
