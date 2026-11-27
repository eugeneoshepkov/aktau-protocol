import { GameEngine } from './engine/Engine';
import { duskAtTime } from './engine/Seasons';
import { CityModels } from './models/CityModels';
import { IsometricCamera } from './engine/Camera';
import { GridManager } from './grid/GridManager';
import { InputManager } from './engine/InputManager';
import { BuildingManager } from './managers/BuildingManager';
import { PipeManager } from './managers/PipeManager';
import { soundManager } from './managers/SoundManager';
import { assetManager } from './managers/AssetManager';
import { musicManager } from './managers/MusicManager';
import { decorManager } from './managers/DecorManager';
import { HUD } from './ui/HUD';
import { CitySights } from './ui/CitySights';
import { mountNetworkInspector } from './ui/NetworkInspector';
import { BuildPanel } from './ui/BuildPanel';
import { mountTouchPlacement } from './ui/TouchPlacement';
import { isBuildableLot } from './grid/BuildingLots';
import { Tooltip } from './ui/Tooltip';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { Chronicle } from './ui/Chronicle';
import { feedbackManager } from './ui/FeedbackManager';
import { TutorialManager } from './ui/TutorialManager';
import { tickSystem } from './simulation/TickSystem';
import { gameState } from './simulation/GameState';
import { eventSystem } from './simulation/EventSystem';
import { FrostVignetteEffect } from './engine/PostProcess';
import { ParticleManager } from './effects/ParticleManager';
import { ICONS } from './ui/Icons';
import { keyMatches } from './utils/keyboard';
import { AmbientManager } from './simulation/ambient';
import { STARTER_DISTRICT } from './simulation/DistrictPlan';
import { t } from './i18n';
import { getTileCenter } from './grid/GridCoords';
import { shoreAt } from './grid/TileTypes';
import { TILE_SIZE } from './types';

export async function initGame(resume: boolean, walk = false): Promise<void> {
  musicManager.initialize();
  soundManager.setMuted(musicManager.isMuted());

  const gameEngine = new GameEngine('gameCanvas');
  const scene = gameEngine.getScene();
  const canvas = gameEngine.getCanvas();

  const camera = new IsometricCamera(scene, canvas);
  const frostEffect = new FrostVignetteEffect(scene, camera.getCamera());
  const view = camera.getCamera();
  const mixShoreAtTarget = () => {
    const distance = Math.abs(view.target.z / TILE_SIZE - shoreAt(view.target.x / TILE_SIZE));
    musicManager.setShoreLevel(Math.max(0, 1 - distance / 15));
  };
  view.onViewMatrixChangedObservable.add(mixShoreAtTarget);
  mixShoreAtTarget();
  scene.onDisposeObservable.addOnce(() => musicManager.disposeShore());

  // Create reset view button
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-view-btn';
  resetBtn.innerHTML = `<span class="icon-wrap">${ICONS.center}</span><span class="mobile-menu-label">${t('shortcuts.center')}</span>`;
  resetBtn.title = t('shortcuts.center') + ' (C)';
  resetBtn.addEventListener('click', () => {
    camera.resetView();
    soundManager.play('click');
  });
  document.body.appendChild(resetBtn);

  // Create shortcuts modal
  const shortcutsModal = new ShortcutsModal();

  // Create shortcuts button
  const shortcutsBtn = document.createElement('button');
  shortcutsBtn.id = 'shortcuts-btn';
  const touch = matchMedia('(pointer: coarse)').matches;
  const controlsLabel = t(touch ? 'shortcuts.touchTitle' : 'shortcuts.title');
  shortcutsBtn.innerHTML = `<span class="icon-wrap">${touch ? ICONS.book : ICONS.keyboard}</span><span class="mobile-menu-label">${controlsLabel}</span>`;
  shortcutsBtn.title = touch ? controlsLabel : controlsLabel + ' (?)';
  shortcutsBtn.addEventListener('click', () => {
    shortcutsModal.toggle();
  });
  document.body.appendChild(shortcutsBtn);

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

    // Center map (C or Home)
    if (keyMatches(e.key, 'c') || e.key === 'Home') {
      camera.resetView();
      soundManager.play('click');
    }

    // Pause/Resume (Space)
    if (e.key === ' ' && !active?.closest('button, summary, a, select')) {
      e.preventDefault();
      hud.togglePause();
      soundManager.play('click');
    }

    // Mute/Unmute music and sound effects (M)
    if (keyMatches(e.key, 'm')) {
      const muted = !musicManager.isMuted();
      musicManager.setMuted(muted);
      soundManager.setMuted(muted);
      localStorage.setItem('aktau-muted', muted.toString());
      // Update HUD volume icon
      const volumeIcon = document.querySelector('.volume-icon');
      if (volumeIcon) {
        volumeIcon.innerHTML = muted ? ICONS.volumeOff : ICONS.volumeOn;
      }
      soundManager.play('click');
    }
  });

  await assetManager.initialize(scene);
  console.log('Asset manager initialized');

  const gridManager = new GridManager(scene);
  gridManager.generateGrid();
  console.log('Grid generated: 50x50 tiles');

  await decorManager.initialize(scene, (x, z) => gridManager.getTileAt(x, z));

  const buildingManager = new BuildingManager(scene, gridManager);
  const isPlacing = () =>
    buildingManager.getSelectedBuildingType() !== null &&
    !tickSystem.hasOpenModal() &&
    !gameState.isGameOver();

  const pipeManager = new PipeManager(scene);
  const particleManager = new ParticleManager(scene);

  mountNetworkInspector(pipeManager);

  // Wire up connection checker for reactor cooling logic
  gameState.setConnectionChecker((building) => ({
    isFullyOperational: pipeManager.isFullyOperational(building)
  }));

  // Wire up event system modifiers for weather effects
  gameState.setEventModifiersGetter(() => eventSystem.getModifiers());

  buildingManager.setParticleManager(particleManager);

  const restored = resume && gameState.load();
  if (!restored) {
    for (const { type, x, z } of STARTER_DISTRICT) {
      gameState.placeBuilding(type, x, z);
    }
  }
  const ambientManager = new AmbientManager(scene);
  await ambientManager.initialize();
  const models = CityModels.forScene(scene);
  let elapsedSeconds = 0;
  let dusk = 0;
  let sandstormActive = false;
  let dust = 0;
  const applyAtmosphere = () => {
    gameEngine.setDaylight(gameState.getSeason(), dusk, dust);
    gridManager.setDusk(dusk, dust);
    decorManager.setDusk(dusk, dust);
    models.setDusk(dusk);
    particleManager.setSandstorm(dust);
  };
  const applySeason = () => {
    const season = gameState.getSeason();
    gridManager.setSeason(season);
    decorManager.setSeason(season);
    models.setSnowy(season === 'winter');
    applyAtmosphere();
  };
  applySeason();
  gameState.on('seasonChange', applySeason);
  scene.registerBeforeRender(() => {
    gridManager.setSurveyVisible(isPlacing());
    const delta = scene.getEngine().getDeltaTime() / 1000;
    if (document.hidden) return;
    const step = Math.min(delta, 0.25);
    ambientManager.update(step);
    elapsedSeconds += step;
    const nextDusk = duskAtTime(elapsedSeconds);
    // Even at 4× a front has time to arrive. The dust settles after the pumps recover.
    const nextDust = sandstormActive ? Math.min(1, dust + step) : Math.max(0, dust - step / 5);
    if (dusk !== nextDusk || dust !== nextDust) {
      dusk = nextDusk;
      dust = nextDust;
      applyAtmosphere();
    }
  });

  const reactor = gameState.getBuildings().find((building) => building.type === 'reactor');
  if (reactor) {
    const waterfront = getTileCenter(reactor.gridX, reactor.gridZ);
    waterfront.x += 1.45;
    waterfront.z -= 0.35;
    camera.setHome(waterfront);
  }

  gameState.on('resourceChange', () => {
    particleManager.updateReactorIntensity();
  });

  const sights = new CitySights((id) => {
    let mesh;
    if (id === 'reactor' || id === 'distiller') {
      const building = gameState.getBuildings().find((b) => b.type === id);
      mesh = building && scene.getMeshByName('building_' + building.id);
    } else {
      mesh = scene.getMeshByName(id);
    }
    return mesh?.isEnabled() && mesh.isVisible ? mesh : null;
  }, (mesh, card) => {
    if (buildPanel.hasTouchPreview()) buildPanel.cancelSelection();
    gridManager.hideHighlight();
    buildingManager.hideGhostPreview();
    pipeManager.hideConnectionPreview();
    camera.visitSight(mesh, card);
  }, () => camera.leaveSight());

  const inputManager = new InputManager(
    scene,
    isPlacing,
    (id) => {
      if (!buildingManager.isDemolishMode() || sights.isOpen()) sights.open(id);
    }
  );

  inputManager.setTileClickCallback((x, z, pointer) => {
    if (sights.isOpen() || tickSystem.hasOpenModal() || gameState.isGameOver()) return;
    // Handle demolish mode first
    if (buildingManager.isDemolishMode()) {
      buildingManager.tryDemolishBuilding(x, z);
      return;
    }
    // Handle building placement
    if (buildingManager.getSelectedBuildingType()) {
      if (buildPanel.hasTouchPreview() || pointer.pointerType === 'touch' || pointer.pointerType === 'pen') {
        previewTouchLot(x, z);
        return;
      }
      if (!gridManager.isInBounds(x, z)) return;
      const placed = buildingManager.tryPlaceBuilding(x, z);
      if (placed) {
        soundManager.play('build');
      }
    } else {
      tooltip.show(x, z, pointer);
    }
  });

  const tooltip = new Tooltip();
  tooltip.setPipeManager(pipeManager);

  const notices = document.createElement('div');
  notices.className = 'city-notices';
  document.body.append(notices);

  inputManager.setTileHoverCallback((x, z, pointer) => {
    if (buildPanel.hasTouchPreview()) return;
    if (sights.isOpen()) {
      gridManager.hideHighlight();
      return;
    }
    if (buildingManager.getSelectedBuildingType()) tooltip.hide();
    else tooltip.show(x, z, pointer);

    const building = gameState.getBuildingAt(x, z);
    if (building?.type === 'reactor') {
      if (Math.random() < 0.3) {
        soundManager.playGeigerClick();
      }
    }

    const selectedType = buildingManager.getSelectedBuildingType();
    if (selectedType) {
      const canPlace = buildingManager.checkPlacement(x, z).canPlace;
      gridManager.showHighlight(x, z, canPlace);
      if (canPlace || isBuildableLot(selectedType, x, z)) pipeManager.showConnectionPreview(selectedType, x, z);
      else pipeManager.hideConnectionPreview();

      // Show ghost building preview: green=valid, red=invalid, gray=inefficient
      const wouldWork = pipeManager.wouldBeOperational(selectedType, x, z);
      buildingManager.showGhostPreview(selectedType, x, z, canPlace, wouldWork);
    } else {
      gridManager.showHighlight(x, z);
      pipeManager.hideConnectionPreview();
      buildingManager.hideGhostPreview();
    }
  });

  inputManager.setPointerLeaveCallback(() => {
    tooltip.hide();
    if (buildPanel.hasTouchPreview()) return;
    gridManager.hideHighlight();
    pipeManager.hideConnectionPreview();
    buildingManager.hideGhostPreview();
  });

  gameState.on('gameOver', () => {
    musicManager.stop();
    musicManager.disposeShore();
    soundManager.play('meltdown');
    setTimeout(() => soundManager.play('gameover'), 300);
  });

  const hud = new HUD(pipeManager, buildings => {
    if (sights.isOpen()) sights.close();
    const first = buildings[0];
    camera.focusOn(getTileCenter(first.gridX, first.gridZ));
    buildingManager.highlightBuildings(buildings);
  });
  const buildPanel = new BuildPanel(buildingManager);
  new Chronicle(notices);
  buildPanel.mountMobileControls();
  const tutorial = new TutorialManager(buildPanel, scene, pipeManager, buildingManager, (id, readPress) => sights.open(id, readPress));
  const previewTouchLot = mountTouchPlacement(buildPanel, buildingManager, gridManager, pipeManager, camera, tutorial);
  sights.mountInvitation(document.querySelector('#plan-details')!);

  feedbackManager.initialize();
  if (resume && !restored) feedbackManager.showToast(t('menu.saveUnavailable'), 'warning');

  const stopWeather = eventSystem.onEventsChange((events, reason) => {
    hud.updateActiveEvents(events);

    const hasSandstorm = events.some(({ event }) => event.visualEffect === 'sandstorm');
    if (reason === 'sync') {
      dust = hasSandstorm ? 1 : 0;
      applyAtmosphere();
    } else if (hasSandstorm && !sandstormActive) {
      const kiosk = scene.getMeshByName('iceCream');
      const distance = kiosk
        ? Math.hypot(view.target.x - kiosk.position.x, view.target.z - kiosk.position.z)
        : Infinity;
      musicManager.playSandstorm(distance);
    }
    sandstormActive = hasSandstorm;

    // Check for visual effects based on active events
    const hasSnow = events.some((e) => e.event.visualEffect === 'snow');
    const hasFrost = events.some((e) => e.event.visualEffect === 'frost');

    // Control snow particles
    if (hasSnow) {
      particleManager.startSnow();
    } else {
      particleManager.stopSnow();
    }

    // Control frost vignette
    frostEffect.setIntensity(hasFrost ? 0.6 : 0);

    // Control blizzard wind sounds
    if (hasSnow) {
      soundManager.playLoop('blizzard');
    } else {
      soundManager.stopLoop('blizzard');
    }
  });
  scene.onDisposeObservable.addOnce(stopWeather);

  gameEngine.startRenderLoop();
  await scene.whenReadyAsync();
  if (walk) sights.openWalk();
  tickSystem.start();
  musicManager.play();
}
