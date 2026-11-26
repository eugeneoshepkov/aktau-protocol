import { HISTORICAL_FACTS } from '../data/historicalFacts';
import { t, td } from '../i18n';
import { gameState } from '../simulation/GameState';

export function getChronicleClue(discovered: ReadonlySet<string>): string {
  if (gameState.isGameOver()) return '';
  if (!discovered.has('first-housing') && gameState.getCompletedOrders() === 0) {
    return t('chronicle.clue.home');
  }

  const resources = gameState.getResources();
  for (const [id, building, clue] of [
    ['first-pump', 'pump', 'chronicle.clue.pump'],
    ['first-distiller', 'distiller', 'chronicle.clue.distiller'],
    ['first-tank', 'water_tank', 'chronicle.clue.tank']
  ] as const) {
    if (discovered.has(id)) continue;
    const cost = gameState.getEffectiveCost(building);
    const affordable = cost && Object.entries(cost).every(
      ([key, amount]) => resources[key as keyof typeof cost] >= amount
    );
    if (affordable) return t(clue);
  }

  for (const { id, trigger } of HISTORICAL_FACTS) {
    if (discovered.has(id) || trigger.type !== 'day' || typeof trigger.value !== 'number') continue;
    if (trigger.value > gameState.getDay()) {
      return t('chronicle.clue.day', { day: trigger.value, title: td(`fact.${id}.title`) });
    }
  }
  for (const count of [200, 500]) {
    if (!discovered.has(`population-${count}`) && resources.population < count) {
      return t('chronicle.clue.residents', { count });
    }
  }
  if (!discovered.has('survive-winter')) return t('chronicle.clue.winter');
  return '';
}
