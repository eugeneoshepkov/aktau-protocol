import { Matrix, Scene, Vector3 } from '@babylonjs/core';
import { getTileCenter } from '../grid/GridCoords';
import { getTileTypeAt } from '../grid/TileTypes';
import type { BuildingManager } from '../managers/BuildingManager';
import type { PipeManager } from '../managers/PipeManager';
import { soundManager } from '../managers/SoundManager';
import {
  DISTRICT_ORDERS,
  CIVIC_PROJECTS,
  CIVIC_POWER_COST,
  CIVIC_MATERIAL_COST,
  WATERFRONT_EXPANSION,
  CIVIC_SAVINGS,
  type DistrictOrder,
  type CivicProjectKind
} from '../simulation/DistrictPlan';
import { getCameraInstance } from '../engine/Camera';
import { gameState, RESERVE_SUPPLIES, RESERVE_POWER_COST } from '../simulation/GameState';
import { GRID_SIZE, RESOURCE_CAPS, type BuildingType } from '../types';
import type { BuildPanel } from './BuildPanel';
import { feedbackManager } from './FeedbackManager';
import { FieldSeasonPanel } from './FieldSeasonPanel';
import type { SightId } from './CitySights';
import { t, td } from '../i18n';
import './district-plan.css';

export class TutorialManager {
  private panel = document.createElement('section');
  private marker = document.createElement('button');
  private site: { type: BuildingType; x: number; z: number } | null = null;
  private readonly panelButton: HTMLButtonElement;
  private readonly locateButton: HTMLButtonElement;
  private readonly buildPanel: BuildPanel;
  private readonly pipes: PipeManager;
  private readonly positionMarker: () => void;
  private siteDirty = true;
  private readonly fieldPanel: FieldSeasonPanel;

  constructor(
    buildPanel: BuildPanel,
    scene: Scene,
    pipes: PipeManager,
    buildings: BuildingManager,
    openSight: (id: SightId, readPress?: boolean) => void
  ) {
    this.buildPanel = buildPanel;
    this.pipes = pipes;
    this.panel.className = 'district-plan';
    this.panel.setAttribute('aria-label', t('plan.label'));
    this.panel.innerHTML = `
      <button type="button" class="plan-summary" aria-expanded="true" aria-controls="plan-details">
        <span class="plan-kicker"><span class="plan-beacon"></span>${t('plan.label')}</span>
        <span class="plan-step"></span><span class="plan-chevron" aria-hidden="true"></span>
      </button>
      <div class="plan-objective">
        <strong id="plan-title" class="plan-title" aria-live="polite"></strong>
        <button type="button" class="plan-locate" aria-describedby="plan-title" hidden>${t('plan.showLot')}</button>
      </div>
      <div id="plan-details">
        <p class="plan-description"></p>
        <div class="plan-track" aria-hidden="true"><span></span></div>
        <div class="plan-stats"><span class="plan-count"></span><span class="plan-grant"></span></div>
        <div class="field-actions" hidden></div>
        <div class="plan-projects" hidden></div>
        <div class="plan-landmark" hidden></div>
        <div class="plan-reserves" hidden>
          <div class="plan-reserve-status"></div>
          <div class="plan-reserve-actions"><button type="button" data-supply="freshWater"></button><button type="button" data-supply="heat"></button></div>
          <button type="button" class="water-history" hidden>${t('press.waterInvite')} →</button>
        </div>
      </div>`;
    this.panelButton = this.panel.querySelector('button')!;
    this.panelButton.addEventListener('click', () => {
      const expanded = this.panelButton.getAttribute('aria-expanded') === 'true';
      this.panelButton.setAttribute('aria-expanded', String(!expanded));
      this.panel.querySelector<HTMLElement>('#plan-details')!.hidden = expanded;
    });

    const focusLot = () => {
      const site = this.site;
      if (!site) return;
      if (window.matchMedia('(max-width: 700px)').matches && this.panelButton.getAttribute('aria-expanded') === 'true') {
        this.panelButton.click();
      }
      getCameraInstance()?.focusOn(getTileCenter(site.x, site.z));
    };
    this.locateButton = this.panel.querySelector('.plan-locate')!;
    this.locateButton.addEventListener('click', focusLot);
    this.fieldPanel = new FieldSeasonPanel(
      this.panel.querySelector('.field-actions')!, focusLot, openSight
    );

    const choices = this.panel.querySelector<HTMLElement>('.plan-projects')!;
    for (const kind of Object.keys(CIVIC_PROJECTS) as CivicProjectKind[]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.project = kind;
      const material = CIVIC_PROJECTS[kind].resource;
      button.innerHTML = `<img src="/pictures/construction/${kind}.webp" width="58" height="48" alt="" loading="lazy">
        <strong>${td('civic.' + kind + '.name')}</strong>
        <span>${td('civic.' + kind + '.benefit', { percent: CIVIC_SAVINGS * 100 })}</span>
        <small>${td('civic.cost.' + material, { power: CIVIC_POWER_COST, amount: CIVIC_MATERIAL_COST })}</small>`;
      button.addEventListener('click', () => {
        if (!gameState.commissionCivicProject(kind)) {
          feedbackManager.showToast(t('civic.noSite'), 'warning');
          return;
        }
        const project = gameState.getCivicProject()!;
        this.buildPanel.cancelSelection();
        const landmark = getTileCenter(project.gridX, project.gridZ);
        const nextSite = this.site && getTileCenter(this.site.x, this.site.z);
        // Make room to see the new landmark and its neighbouring construction lot on a phone.
        if (
          nextSite &&
          window.matchMedia('(max-width: 700px)').matches &&
          this.panelButton.getAttribute('aria-expanded') === 'true'
        ) {
          this.panelButton.click();
        }
        getCameraInstance()?.focusOn(nextSite ? Vector3.Lerp(landmark, nextSite, 0.65) : landmark);
        feedbackManager.showToast(
          t('civic.opened', { project: td('civic.' + kind + '.name') }),
          'success'
        );
        soundManager.play('success');
      });
      choices.append(button);
    }

    const waterHistory = this.panel.querySelector<HTMLButtonElement>('.water-history')!;
    waterHistory.addEventListener('click', () => openSight('distiller', true));
    for (const resource of ['freshWater', 'heat'] as const) {
      this.panel.querySelector(`[data-supply="${resource}"]`)!.addEventListener('click', () => {
        if (gameState.dispatchSupply(resource)) {
          soundManager.play('success');
          if (resource === 'freshWater') {
            waterHistory.hidden = !gameState.getBuildings().some((b) => b.type === 'distiller');
          }
        }
      });
    }

    this.marker.type = 'button';
    this.marker.className = 'plan-site';
    this.marker.append(document.createElement('span'));
    this.marker.addEventListener('click', () => {
      if (!this.site || gameState.isGameOver()) return;
      const { type, x, z } = this.site;
      if (buildings.getSelectedBuildingType() !== type || buildings.isDemolishMode()) {
        this.buildPanel.getButton(type)?.click();
      }
      if (buildings.tryPlaceBuilding(x, z)) {
        this.buildPanel.cancelSelection();
        soundManager.play('build');
      }
    });

    document.body.append(this.panel, this.marker);
    // The marker uses the same camera transform as the lot when the map is rotated or zoomed.
    const worldMatrix = Matrix.Identity();
    const engine = scene.getEngine();
    this.positionMarker = () => {
      const camera = scene.activeCamera;
      const canvas = engine.getRenderingCanvas();
      if (!this.site || !camera || !canvas) return;
      const position = getTileCenter(this.site.x, this.site.z);
      position.y = 0.22;
      const view = camera.viewport.toGlobal(canvas.clientWidth, canvas.clientHeight);
      const point = Vector3.Project(position, worldMatrix, scene.getTransformMatrix(), view);
      this.marker.hidden =
        gameState.isGameOver() ||
        point.z < 0 ||
        point.z > 1 ||
        point.x < 0 ||
        point.x > view.width ||
        point.y < 0 ||
        point.y > view.height;
      this.marker.style.setProperty('--lot-x', Math.round(point.x) + 'px');
      this.marker.style.top = Math.round(point.y) + 'px';
    };
    scene.onAfterRenderObservable.add(this.positionMarker);

    gameState.on('buildingPlaced', () => {
      this.siteDirty = true;
    });
    gameState.on('buildingRemoved', () => {
      this.siteDirty = true;
      if (!gameState.getBuildings().some((b) => b.type === 'distiller')) waterHistory.hidden = true;
    });
    gameState.on('resourceChange', () => this.update());
    gameState.on('gameOver', () => {
      this.site = null;
      this.marker.hidden = this.locateButton.hidden = true;
    });
    gameState.on('civicProjectChange', () => {
      this.siteDirty = true;
    });
    gameState.on('fieldSeasonChange', () => {
      this.siteDirty = true;
      this.update();
    });
    gameState.on('districtEstablished', () => {
      feedbackManager.showToast(t('plan.established.title'), 'success');
      soundManager.play('success');
    });
    gameState.on('orderComplete', (data) => {
      const order = data as DistrictOrder;
      this.siteDirty = true;
      if (order.id !== 'homes') {
        const reward = this.rewardLabel(order);
        const title = td(`plan.${order.id}.title`);
        feedbackManager.showToast(reward ? title + '  ·  ' + reward : title + ' ✓', 'success');
        soundManager.play('success');
      }
    });
    this.update();
  }

  private rewardLabel(order: DistrictOrder): string {
    return order.reward
      ? td(`plan.reward.${order.reward.resource}`, { amount: order.reward.amount })
      : '';
  }

  private update(): void {
    const completed = gameState.getCompletedOrders();
    const project = gameState.getCivicProject();
    const established = gameState.isDistrictEstablished();
    const chartered = completed === DISTRICT_ORDERS.length;
    const expanding = project && !established;
    const expansion =
      expanding && gameState.getOperationalCount('microrayon') < WATERFRONT_EXPANSION.homes.target
        ? WATERFRONT_EXPANSION.homes
        : WATERFRONT_EXPANSION.residents;
    const field = this.fieldPanel.update(established);
    const order = DISTRICT_ORDERS[completed] ?? (expanding ? expansion : field?.order);
    const count = order ? Math.min(order.target, gameState.getOrderProgress(order)) : 0;
    this.panel.querySelector('.plan-step')!.textContent = chartered
      ? t(established ? 'field.stage' : 'civic.stage')
      : String(completed + 1).padStart(2, '0') +
        ' / ' +
        String(DISTRICT_ORDERS.length).padStart(2, '0');

    const key = order?.id ?? (established ? 'established' : 'complete');
    const title = this.panel.querySelector('.plan-title')!;
    const text = field?.title ?? td(`plan.${key}.title`);
    if (title.textContent !== text) title.textContent = text;
    this.panel.querySelector('.plan-description')!.textContent = field?.description ?? td(`plan.${key}.desc`);
    this.panel.querySelector<HTMLElement>('.plan-track')!.hidden = !order;
    this.panel.querySelector<HTMLElement>('.plan-stats')!.hidden = !order;
    if (order) {
      this.panel.querySelector<HTMLElement>('.plan-track span')!.style.width =
        (count / order.target) * 100 + '%';
      this.panel.querySelector('.plan-count')!.textContent = td(`plan.count.${order.measure}`, {
        count,
        target: order.target
      });
      this.panel.querySelector('.plan-grant')!.textContent = this.rewardLabel(order);
    }
    const choices = this.panel.querySelector<HTMLElement>('.plan-projects')!;
    choices.hidden = !chartered || !!project;
    if (!choices.hidden) {
      const resources = gameState.getResources();
      for (const button of choices.querySelectorAll('button')) {
        const kind = button.dataset.project as CivicProjectKind;
        button.disabled =
          resources.electricity < CIVIC_POWER_COST ||
          resources[CIVIC_PROJECTS[kind].resource] < CIVIC_MATERIAL_COST;
      }
    }
    const landmark = this.panel.querySelector<HTMLElement>('.plan-landmark')!;
    landmark.hidden = !project || !!gameState.getFieldSeason();
    if (project)
      landmark.textContent =
        td('civic.' + project.kind + '.name') +
        ' · ' +
        td('civic.' + project.kind + '.benefit', { percent: CIVIC_SAVINGS * 100 });

    const reserves = this.panel.querySelector<HTMLElement>('.plan-reserves')!;
    reserves.hidden = completed < 4;
    if (!reserves.hidden) {
      const resources = gameState.getResources();
      const nextDay = gameState.getNextDispatchDay();
      const ready = nextDay <= gameState.getDay();
      reserves.querySelector('.plan-reserve-status')!.textContent = ready
        ? t('plan.dispatch', { cost: RESERVE_POWER_COST })
        : t('plan.nextDispatch', { day: nextDay });
      for (const resource of ['freshWater', 'heat'] as const) {
        const button = reserves.querySelector<HTMLButtonElement>(`[data-supply="${resource}"]`)!;
        const amount = Math.max(
          0,
          Math.min(RESERVE_SUPPLIES[resource], RESOURCE_CAPS[resource]! - resources[resource])
        );
        button.textContent =
          t(resource === 'heat' ? 'hud.heat' : 'hud.water') + ' +' + Math.floor(amount);
        button.disabled = !ready || resources.electricity < RESERVE_POWER_COST || amount <= 0;
        button.title = t('plan.dispatchHelp');
      }
    }

    const target =
      order && order.measure !== 'day' && order.measure !== 'population' ? order.measure : null;
    const cost = target && gameState.getEffectiveCost(target);
    const resources = gameState.getResources();
    const affordable = cost && Object.entries(cost).every(
      ([resource, amount]) => resources[resource as keyof typeof cost] >= amount
    );
    if (!affordable || this.siteDirty || !this.site || this.site.type !== target) {
      this.site =
        affordable && target && !gameState.isGameOver() ? this.findSite(target, order?.sites ?? []) : null;
      this.siteDirty = false;
      this.marker.hidden = this.locateButton.hidden = !this.site;
      if (this.site) {
        this.marker.firstElementChild!.textContent = td(`plan.build.${this.site.type}`);
        this.positionMarker();
      }
      for (const type of ['pump', 'distiller', 'microrayon'] as const) {
        this.buildPanel.getButton(type)?.classList.toggle('plan-target', type === target);
      }
    }
  }

  private findSite(type: BuildingType, preferred: [number, number][]) {
    const viable = (x: number, z: number) =>
      x >= 0 &&
      z >= 0 &&
      x < GRID_SIZE &&
      z < GRID_SIZE &&
      gameState.canPlaceBuilding(type, x, z, getTileTypeAt(x, z)).canPlace &&
      this.pipes.wouldBeOperational(type, x, z);

    for (const [x, z] of preferred) {
      if (viable(x, z)) return { type, x, z };
    }
    // Allow a custom layout or a previously occupied suggestion to move the recommended lot.
    const reactor = gameState.getBuildings().find((building) => building.type === 'reactor');
    if (!reactor) return null;
    for (let distance = 2; distance <= 12; distance++) {
      for (let dx = -distance; dx <= distance; dx++) {
        for (const dz of new Set([distance - Math.abs(dx), Math.abs(dx) - distance])) {
          const x = reactor.gridX + dx;
          const z = reactor.gridZ + dz;
          if (viable(x, z)) return { type, x, z };
        }
      }
    }
    return null;
  }
}
