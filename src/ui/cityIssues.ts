import { t } from '../i18n';
import type { PipeManager } from '../managers/PipeManager';
import { gameState } from '../simulation/GameState';
import type { Building } from '../types';

export interface CityIssue {
  id: string;
  message: string;
  buildings: Building[];
  critical?: boolean;
}

type ConnectionIssue = `${'distiller' | 'microrayon'}.${'water' | 'heat' | 'both'}`;

export function getCityIssues(pipes: Pick<PipeManager, 'isSuppliedWith'>): CityIssue[] {
  if (gameState.isGameOver()) return [];

  const issues: CityIssue[] = [];
  const buildings = gameState.getBuildings();
  const connections = new Map<ConnectionIssue, Building[]>();
  let workingDistillers = 0;
  for (const building of buildings) {
    const type = building.type;
    if (type !== 'distiller' && type !== 'microrayon') continue;
    const water = pipes.isSuppliedWith(building, type === 'distiller' ? 'seawater' : 'freshWater');
    const heat = pipes.isSuppliedWith(building, 'heat');
    if (water && heat) {
      if (type === 'distiller') workingDistillers++;
      continue;
    }
    const missing = water ? 'heat' : heat ? 'water' : 'both';
    const id: ConnectionIssue = `${type}.${missing}`;
    const group = connections.get(id);
    if (group) group.push(building);
    else connections.set(id, [building]);
  }

  const strain = gameState.getReactorState().temperature;
  if (strain >= 80 || (strain >= 50 && workingDistillers < 2)) {
    issues.push({
      id: 'reactor',
      message: t(workingDistillers < 2 ? 'hud.highStrain' : 'diagnostic.reactorCooling'),
      buildings: buildings.filter(b => b.type === 'reactor'),
      critical: strain >= 80
    });
  }

  const resources = gameState.getResources();
  const trends = gameState.getResourceTrend();
  for (const [resource, message] of [
    ['freshWater', 'hud.lowFreshWater'],
    ['heat', 'hud.lowHeat'],
    ['happiness', 'hud.lowMorale'],
    ['seawater', 'hud.lowSeawater'],
    ['electricity', 'hud.lowPower']
  ] as const) {
    const stock = resources[resource];
    const change = trends[resource];
    const essential = resource === 'freshWater' || resource === 'heat';
    // Reserve the warning for a shortfall within two days. The HUD arrows already show ordinary declines.
    const forecast = essential && stock >= 10 && change < 0 && stock <= -2 * change;
    if (stock >= 10 && !forecast) continue;
    issues.push({
      id: resource,
      message: t(forecast ? `diagnostic.runningLow.${resource}` : message),
      buildings: [],
      critical: essential && change <= 0 && (stock < 10 || stock <= -change)
    });
  }

  for (const [id, affected] of connections) {
    issues.push({ id, message: t(`diagnostic.${id}`), buildings: affected });
  }
  return issues.sort((a, b) => Number(!!b.critical) - Number(!!a.critical));
}
