import { GameEngine } from './engine/Engine';
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
import { Tooltip } from './ui/Tooltip';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { Chronicle } from './ui/Chronicle';
import { feedbackManager } from './ui/FeedbackManager';
import { TutorialManager } from './ui/TutorialManager';
import { DiagnosticManager } from './ui/DiagnosticManager';
import { tickSystem } from './simulation/TickSystem';
import { gameState } from './simulation/GameState';
import { eventSystem } from './simulation/EventSystem';
import { FrostVignetteEffect } from './engine/PostProcess';
import { ParticleManager } from './effects/ParticleManager';
import { ICONS } from './ui/Icons';
import { keyMatches } from './utils/keyboard';
import { ambientManager } from './simulation/ambient';
import { STARTER_DISTRICT } from './simulation/DistrictPlan';
import { t } from './i18n';
import { getTileCenter } from './grid/GridCoords';

export async function initGame(resume: boolean): Promise<void> {
  musicManager.initialize();
  soundManager.setMuted(musicManager.isMuted());

  const gameEngine = new GameEngine('gameCanvas');
  const scene = gameEngine.getScene();
  const canvas = gameEngine.getCanvas();

  const camera = new IsometricCamera(scene, canvas);
  const frostEffect = new FrostVignetteEffect(scene, camera.getCamera());

  // Create reset view button
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-view-btn';
  resetBtn.innerHTML = `<span class="icon-wrap">${ICONS.center}</span>`;
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
  shortcutsBtn.innerHTML = `<span class="icon-wrap">${ICONS.keyboard}</span>`;
  shortcutsBtn.title = t('shortcuts.title') + ' (?)';
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

  await ambientManager.initialize(scene, gridManager);

  scene.registerBeforeRender(() => {
    const deltaTime = scene.getEngine().getDeltaTime() / 1000;
    ambientManager.update(deltaTime);
  });

  const buildingManager = new BuildingManager(scene, gridManager);
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
  buildingManager.onSelectionChange(() => {
    pipeManager.hideConnectionPreview();
    buildingManager.hideGhostPreview();
  });

  const restored = resume && gameState.load();
  if (!restored) {
    for (const { type, x, z } of STARTER_DISTRICT) {
      decorManager.removeDecorationAt(x, z);
      gameState.placeBuilding(type, x, z);
    }
  }
  const applySeason = () => {
    const season = gameState.getSeason();
    gameEngine.setSeason(season);
    gridManager.setSeason(season);
    decorManager.setSeason(season);
    CityModels.forScene(scene).setSnowy(season === 'winter');
  };
  applySeason();
  gameState.on('seasonChange', applySeason);

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
    if (!mesh) return false;
    gridManager.hideHighlight();
    buildingManager.hideGhostPreview();
    pipeManager.hideConnectionPreview();
    camera.visitSight(mesh);
    return true;
  }, () => camera.leaveSight());

  const inputManager = new InputManager(
    scene,
    gridManager,
    () => !sights.isOpen() && buildingManager.getSelectedBuildingType() !== null,
    (id) => {
      if (!buildingManager.isDemolishMode() || sights.isOpen()) sights.open(id);
    }
  );

  inputManager.setTileClickCallback((x, z, pointer) => {
    if (sights.isOpen()) return;
    // Handle demolish mode first
    if (buildingManager.isDemolishMode()) {
      buildingManager.tryDemolishBuilding(x, z);
      return;
    }
    // Handle building placement
    if (buildingManager.getSelectedBuildingType()) {
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

  const diagnosticManager = new DiagnosticManager();
  diagnosticManager.setPipeManager(pipeManager);
  diagnosticManager.setBuildingManager(buildingManager);

  inputManager.setTileHoverCallback((x, z, pointer) => {
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
      const canPlace = buildingManager.canPlaceAt(x, z);
      gridManager.showHighlight(x, z, canPlace);
      pipeManager.showConnectionPreview(selectedType, x, z);

      // Show ghost building preview: green=valid, red=invalid, gray=inefficient
      const wouldWork = pipeManager.wouldBeOperational(selectedType, x, z);
      buildingManager.showGhostPreview(selectedType, x, z, canPlace, wouldWork);
    } else {
      pipeManager.hideConnectionPreview();
      buildingManager.hideGhostPreview();
    }
  });

  inputManager.setPointerLeaveCallback(() => {
    tooltip.hide();
    pipeManager.hideConnectionPreview();
    buildingManager.hideGhostPreview();
  });

  gameState.on('reactorWarning', () => {
    soundManager.play('warning');
  });

  gameState.on('gameOver', () => {
    musicManager.stop();
    soundManager.play('meltdown');
    setTimeout(() => soundManager.play('gameover'), 300);
  });

  const hud = new HUD();
  const buildPanel = new BuildPanel(buildingManager);
  new Chronicle();
  new TutorialManager(buildPanel, scene, pipeManager, buildingManager);

  feedbackManager.initialize();
  if (resume && !restored) feedbackManager.showToast(t('menu.saveUnavailable'), 'warning');

  eventSystem.onEventsChange((events) => {
    hud.updateActiveEvents(events);

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

  gameEngine.startRenderLoop();
  await scene.whenReadyAsync();
  tickSystem.start();
  musicManager.play();
}
