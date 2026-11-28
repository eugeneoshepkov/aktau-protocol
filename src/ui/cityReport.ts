import type { PipeManager } from '../managers/PipeManager';
import type { GameState } from '../simulation/GameState';

const lastReportKey = 'aktau-last-city-report';

export function currentCityReport(city: GameState, pipes: PipeManager): string {
  const report = city.getDiagnosticReport(building => ({
    operational: pipes.isFullyOperational(building),
    missing: pipes.getMissingConnections(building).map(input => input.resourceType)
  }));
  return JSON.stringify({
    ...report,
    network: pipes.getNetworkSnapshot(),
    build: { revision: import.meta.env.VITE_GAME_REVISION ?? 'unknown', mode: import.meta.env.MODE }
  }, null, 2);
}

export function rememberCityReport(city: GameState, pipes: PipeManager): void {
  try {
    localStorage.setItem(lastReportKey, currentCityReport(city, pipes));
  } catch {
    // Storage can be full. The live city can still be downloaded directly.
  }
}

export function lastCityReport(): string | null {
  try {
    return localStorage.getItem(lastReportKey);
  } catch {
    return null;
  }
}

export function downloadCityReport(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aktau-city-report.json';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
