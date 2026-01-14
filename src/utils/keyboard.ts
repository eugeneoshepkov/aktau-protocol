/**
 * Maps Russian keyboard layout keys to their English equivalents.
 * This allows shortcuts to work regardless of keyboard layout.
 */
const RU_TO_EN_MAP: Record<string, string> = {
  // WASD movement
  'ц': 'w',
  'ф': 'a',
  'ы': 's',
  'в': 'd',
  // QE rotation
  'й': 'q',
  'у': 'e',
  // Other shortcuts
  'о': 'j',  // J for journal
  'с': 'c',  // C for center
  'ь': 'm',  // M for mute
};

/**
 * Normalizes a key to its English equivalent if it's a Russian character.
 * Returns the original key (lowercased) if no mapping exists.
 */
export function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  return RU_TO_EN_MAP[lower] || lower;
}

/**
 * Checks if a key (or its Russian equivalent) matches the target key.
 */
export function keyMatches(pressedKey: string, targetKey: string): boolean {
  const normalized = normalizeKey(pressedKey);
  return normalized === targetKey.toLowerCase();
}
