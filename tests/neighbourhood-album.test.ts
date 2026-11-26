import { expect, test } from 'bun:test';

test('neighbourhood outings follow the local calendar across multiple years', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (id: string) => (id === 'aktau-locale' ? 'en' : null) }
  });
  try {
    const { nextWalkDay } = await import('../src/ui/NeighbourhoodAlbum');
    for (const offset of [0, 120, 240]) {
      expect(nextWalkDay('iceCream', offset + 90)).toBe(offset + 90);
      expect(nextWalkDay('swimmingPier', offset + 30)).toBe(offset + 31);
      expect(nextWalkDay('swimmingPier', offset + 31)).toBe(offset + 31);
      expect(nextWalkDay('swimmingPier', offset + 60)).toBe(offset + 60);
      expect(nextWalkDay('swimmingPier', offset + 61)).toBe(offset + 151);
      expect(nextWalkDay('torysh', offset + 60)).toBe(offset + 61);
      expect(nextWalkDay('torysh', offset + 90)).toBe(offset + 90);
      expect(nextWalkDay('torysh', offset + 91)).toBe(offset + 181);
      expect(nextWalkDay('chaika', offset + 90)).toBe(offset + 91);
      expect(nextWalkDay('chaika', offset + 120)).toBe(offset + 120);
      expect(nextWalkDay('chaika', offset + 121)).toBe(offset + 211);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
