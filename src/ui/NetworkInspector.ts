import { t } from '../i18n';
import type { PipeManager } from '../managers/PipeManager';
import { gameState } from '../simulation/GameState';
import { ICONS } from './Icons';

export function mountNetworkInspector(pipes: PipeManager): void {
  const panel = document.createElement('details');
  panel.className = 'network-control';
  panel.innerHTML = `
    <summary class="network-toggle">${ICONS.network}${t('map.network')}</summary>
    <fieldset class="network-layers">
      <legend>${t('map.served')}</legend>
      <label><input type="checkbox" checked data-layer="water">${t('hud.water')}<output></output></label>
      <label><input type="checkbox" checked data-layer="heat">${t('hud.heat')}<output></output></label>
    </fieldset>`;
  const water = panel.querySelector<HTMLInputElement>('[data-layer="water"]')!;
  const heat = panel.querySelector<HTMLInputElement>('[data-layer="heat"]')!;
  const [waterCount, heatCount] = panel.querySelectorAll('output');

  function updateCoverage(): void {
    const blocks = gameState.getBuildings().filter(({ type }) => type === 'microrayon');
    waterCount.value = `${blocks.filter((block) => pipes.isSuppliedWith(block, 'freshWater')).length}/${blocks.length}`;
    heatCount.value = `${blocks.filter((block) => pipes.isSuppliedWith(block, 'heat')).length}/${blocks.length}`;
  }

  function updateLayers(): void {
    pipes.setVisibleLayers(panel.open && water.checked, panel.open && heat.checked);
    if (panel.open) updateCoverage();
  }

  panel.addEventListener('toggle', updateLayers);
  panel.addEventListener('change', updateLayers);
  gameState.on('buildingPlaced', updateCoverage);
  gameState.on('buildingRemoved', updateCoverage);
  document.body.appendChild(panel);
}
