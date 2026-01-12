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
import { feedbackManager } from './ui/FeedbackManager';
import { tickSystem } from './simulation/TickSystem';
import { gameState } from './simulation/GameState';
import { eventSystem } from './simulation/EventSystem';
import { FilmGrainEffect, HeatHazeEffect } from './engine/PostProcess';
import { ParticleManager } from './effects/ParticleManager';
import { ICONS } from './ui/Icons';
import { ambientManager } from './simulation/ambient';

let gameLoopStarted = false;

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
  resetBtn.title = 'Reset view (Home)';
  resetBtn.addEventListener('click', () => {
    camera.resetView();
    soundManager.play('click');
  });
  document.body.appendChild(resetBtn);

  // Keyboard shortcut for reset view (Home key)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Home') {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      camera.resetView();
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
  new BuildPanel(buildingManager);

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