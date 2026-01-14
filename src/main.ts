import './style.css';
import { GameEngine } from './engine/Engine';
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
import { BuildPanel } from './ui/BuildPanel';
import { Tooltip } from './ui/Tooltip';
import { IntroScreen } from './ui/IntroScreen';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { Chronicle } from './ui/Chronicle';
import { feedbackManager } from './ui/FeedbackManager';
import { TutorialManager } from './ui/TutorialManager';
import { tickSystem } from './simulation/TickSystem';
import { gameState } from './simulation/GameState';
import { eventSystem } from './simulation/EventSystem';
import { FilmGrainEffect, HeatHazeEffect } from './engine/PostProcess';
import { ParticleManager } from './effects/ParticleManager';
import { ICONS } from './ui/Icons';
import { keyMatches } from './utils/keyboard';
import { ambientManager } from './simulation/ambient';
import { getTileTypeAt, getCoastlineZ } from './grid/TileTypes';
import { getTileCenter } from './grid/GridCoords';
import { GRID_SIZE } from './types';

let gameLoopStarted = false;

/**
 * Find a rock tile near the coast for the reactor placement.
 * The reactor needs to be within pipe connection range (5 tiles) of the sea
 * for water pump connections.
 */
function findReactorLocation(): { x: number; z: number } | null {
  // Search for rock tiles near the coast (within pump connection range)
  // Start from just inland of the coast and work further inland
  for (let z = 12; z < 25; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tileType = getTileTypeAt(x, z);
      if (tileType === 'rock') {
        // Check if within 5 tiles of sea (pump connection range)
        const coastZ = getCoastlineZ(x);
        if (z - coastZ <= 5 && z - coastZ > 0) {
          return { x, z };
        }
      }
    }
  }
  return null;
}

async function initGame(): Promise<void> {
  console.log('Initializing Caspian Atom - The Aktau Protocol');

  const gameEngine = new GameEngine('gameCanvas');
  const scene = gameEngine.getScene();
  const canvas = gameEngine.getCanvas();

  const camera = new IsometricCamera(scene, canvas);
  new FilmGrainEffect(scene, camera.getCamera());
  new HeatHazeEffect(scene, camera.getCamera());

  // Create reset view button
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-view-btn';
  resetBtn.innerHTML = `<span class="icon-wrap">${ICONS.center}</span>`;
  resetBtn.title = 'Reset view (C)';
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
  shortcutsBtn.title = 'Keyboard shortcuts (?)';
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
    if (e.key === ' ') {
      e.preventDefault();
      tickSystem.togglePause();
      soundManager.play('click');
    }

    // Mute/Unmute music (M)
    if (keyMatches(e.key, 'm')) {
      const muted = !musicManager.isMuted();
      musicManager.setMuted(muted);
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

  if (assetManager.shouldUseModels()) {
    assetManager.preloadAllModels().catch(err => {
      console.warn('Failed to preload some models:', err);
    });
  }

  await decorManager.initialize(scene, (x, z) => gridManager.getTileAt(x, z));

  await ambientManager.initialize(scene, gridManager);

  scene.registerBeforeRender(() => {
    const deltaTime = scene.getEngine().getDeltaTime() / 1000;
    ambientManager.update(deltaTime);
  });

  const buildingManager = new BuildingManager(scene, gridManager);
  const pipeManager = new PipeManager(scene);
  const particleManager = new ParticleManager(scene);

  // Wire up connection checker for reactor cooling logic
  gameState.setConnectionChecker((building) => ({
    isFullyOperational: pipeManager.isFullyOperational(building)
  }));

  buildingManager.setParticleManager(particleManager);
  buildingManager.onSelectionChange(() => {
    pipeManager.hideConnectionPreview();
  });

  // Auto-place the BN-350 reactor near the coast at game start
  const reactorLocation = findReactorLocation();
  if (reactorLocation) {
    // Remove any decoration at the reactor location first
    decorManager.removeDecorationAt(reactorLocation.x, reactorLocation.z);
    gameState.placeBuilding('reactor', reactorLocation.x, reactorLocation.z);
    console.log(`BN-350 reactor auto-placed at (${reactorLocation.x}, ${reactorLocation.z})`);

    // Center camera on the reactor to draw attention to it
    const reactorWorldPos = getTileCenter(reactorLocation.x, reactorLocation.z);
    camera.setTarget(reactorWorldPos);
  } else {
    console.warn('Could not find suitable rock tile for reactor near coast');
  }

  gameState.on('resourceChange', () => {
    particleManager.updateReactorIntensity();
    pipeManager.update();
  });

  const inputManager = new InputManager(scene, gridManager);

  inputManager.setTileClickCallback((x, z) => {
    if (buildingManager.getSelectedBuildingType()) {
      const placed = buildingManager.tryPlaceBuilding(x, z);
      if (placed) {
        soundManager.play('build');
      }
    }
  });

  const tooltip = new Tooltip();
  tooltip.setPipeManager(pipeManager);

  inputManager.setTileHoverCallback((x, z) => {
    tooltip.show(x, z);

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
    } else {
      pipeManager.hideConnectionPreview();
    }
  });

  inputManager.setPointerLeaveCallback(() => {
    tooltip.hide();
    pipeManager.hideConnectionPreview();
  });

  gameState.on('reactorWarning', () => {
    soundManager.play('warning');
  });

  gameState.on('gameOver', () => {
    musicManager.stop();
    soundManager.play('meltdown');
    setTimeout(() => soundManager.play('gameover'), 300);
  });

  gameState.on('dayAdvance', (day) => {
    gameEngine.updateDayNightCycle(day as number);
  });

  gameState.on('buildingPlaced', () => {
    if (!gameLoopStarted) {
      gameLoopStarted = true;
      tickSystem.start();
      console.log('Game loop started after first building');
    }
  });

  const hud = new HUD();
  const buildPanel = new BuildPanel(buildingManager);
  new Chronicle();

  // Initialize tutorial system
  const tutorialManager = new TutorialManager();
  tutorialManager.setBuildPanel(buildPanel);

  feedbackManager.initialize();

  gameState.on('resourceChange', () => {
    if (gameState.getDay() === 1) {
      eventSystem.reset();
    }
  });

  eventSystem.onEventsChange((events) => {
    hud.updateActiveEvents(events);
  });

  musicManager.initialize();

  gameEngine.startRenderLoop();
  console.log('Game initialized. Waiting for intro to complete...');

  new IntroScreen(() => {
    console.log('Intro dismissed. Game ready!');
    musicManager.play();
  });
}

// Prevent buttons from stealing keyboard focus - blur after click
document.addEventListener('mouseup', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    (target.closest('button') || target).blur();
  }
});

document.addEventListener("DOMContentLoaded", initGame);