import type { IsometricCamera } from '../engine/Camera';
import { findSuitableLot, isBuildableLot } from '../grid/BuildingLots';
import { worldToGrid, type GridPosition } from '../grid/GridCoords';
import type { GridManager } from '../grid/GridManager';
import { t } from '../i18n';
import type { BuildingManager } from '../managers/BuildingManager';
import type { PipeManager } from '../managers/PipeManager';
import { gameState } from '../simulation/GameState';
import { tickSystem } from '../simulation/TickSystem';
import type { BuildPanel, TouchPlacementPreview } from './BuildPanel';
import { feedbackManager } from './FeedbackManager';
import type { TutorialManager } from './TutorialManager';

export function mountTouchPlacement(
  panel: BuildPanel,
  buildings: BuildingManager,
  grid: GridManager,
  pipes: PipeManager,
  camera: IsometricCamera,
  tutorial: TutorialManager
): (x: number, z: number) => void {
  let lot: GridPosition | null = null;
  let suggested = false;
  let validationReason: string | undefined;
  let touchInput = matchMedia('(pointer: coarse)').matches;
  document.addEventListener('pointerdown', event => {
    touchInput = event.pointerType === 'touch' || event.pointerType === 'pen';
  }, true);
  buildings.onSelectionChange((type, guidedLot) => {
    clearMeshes();
    lot = null;
    if (!type || !touchInput) {
      panel.setTouchPreview(null);
      return;
    }
    const guide = tutorial.getSuggestedLot(type);
    lot = guidedLot ?? findSuitableLot(
      type, pipes, worldToGrid(camera.getCamera().target), guide ? [[guide.x, guide.z]] : []
    );
    suggested = !!lot;
    draw(true);
  });

  panel.onConfirmPlacement(() => {
    if (!panel.hasTouchPreview() || !lot || tickSystem.hasOpenModal() || gameState.isGameOver()) return;
    if (buildings.tryPlaceBuilding(lot.x, lot.z)) {
      panel.cancelSelection();
    } else {
      draw();
    }
  });

  // The city still runs while the player compares lots. Only redraw when a change affects the preview.
  gameState.on('resourceChange', () => {
    if (lot && buildings.checkPlacement(lot.x, lot.z).reason !== validationReason) draw();
  });
  const updateNetwork = () => { if (lot) draw(); };
  gameState.on('buildingPlaced', updateNetwork);
  gameState.on('buildingRemoved', updateNetwork);
  gameState.on('civicProjectChange', updateNetwork);
  const cancel = () => { if (panel.hasTouchPreview()) panel.cancelSelection(); };
  gameState.on('gameOver', cancel);
  gameState.on('cityLoaded', cancel);

  return (x, z) => {
    lot = { x, z };
    suggested = false;
    draw();
  };

  function draw(frame = false): void {
    const type = buildings.getSelectedBuildingType();
    if (!type) return;
    const check = lot && buildings.checkPlacement(lot.x, lot.z);
    validationReason = check?.reason;
    const preview: TouchPlacementPreview = { type, suggested, canBuild: !!check?.canPlace };
    if (!lot || !grid.isInBounds(lot.x, lot.z)) {
      clearMeshes();
      preview.status = t(lot ? 'build.preview.invalid' : 'build.preview.noLot');
    } else {
      const validSite = preview.canBuild || isBuildableLot(type, lot.x, lot.z);
      grid.showHighlight(lot.x, lot.z, validSite);
      buildings.showGhostPreview(type, lot.x, lot.z, validSite, pipes.isSuitableLot(type, lot.x, lot.z));
      if (validSite) {
        const route = pipes.showConnectionPreview(type, lot.x, lot.z);
        if (frame) camera.framePlacement(route);
        preview.connections = pipes.getLotConnections(type, lot.x, lot.z);
      } else {
        pipes.hideConnectionPreview();
      }
      if (check?.reason) preview.status = feedbackManager.getFriendlyErrorMessage(check.reason, type);
    }
    panel.setTouchPreview(preview);
  }

  function clearMeshes(): void {
    grid.hideHighlight();
    buildings.hideGhostPreview();
    pipes.hideConnectionPreview();
  }
}
