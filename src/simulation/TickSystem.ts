import { gameState } from './GameState';

export class TickSystem {
  private intervalId: number | null = null;
  private tickRate: number; // milliseconds per tick (1 tick = 1 day)
  private isPaused: boolean = false;
  private onTickCallbacks: Array<() => void> = [];
  private openModalCount: number = 0;
  private wasPausedBeforeModal: boolean = false;

  constructor(tickRate: number = 3000) {
    this.tickRate = tickRate;
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.intervalId !== null) {
      console.warn('TickSystem is already running');
      return;
    }

    console.log(`Starting game loop (${this.tickRate}ms per tick)`);
    this.intervalId = window.setInterval(() => {
      if (!this.isPaused) {
        this.processTick();
      }
    }, this.tickRate);
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Game loop stopped');
    }
  }

  /**
   * Pause/resume the game
   */
  public pause(): void {
    this.isPaused = true;
    console.log('Game paused');
  }

  public resume(): void {
    this.isPaused = false;
    console.log('Game resumed');
  }

  public togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Called when a modal opens. Pauses the game if not already paused by modal.
   */
  public onModalOpen(): void {
    if (this.openModalCount === 0) {
      this.wasPausedBeforeModal = this.isPaused;
      if (!this.isPaused) {
        this.pause();
      }
    }
    this.openModalCount++;
  }

  /**
   * Called when a modal closes. Resumes only if game wasn't paused before modals opened.
   */
  public onModalClose(): void {
    this.openModalCount = Math.max(0, this.openModalCount - 1);
    if (this.openModalCount === 0 && !this.wasPausedBeforeModal) {
      this.resume();
    }
  }

  /**
   * Process a single tick
   */
  private processTick(): void {
    if (gameState.isGameOver()) {
      this.stop();
      return;
    }

    // Process game state tick
    gameState.tick();

    // Call registered callbacks
    for (const callback of this.onTickCallbacks) {
      callback();
    }
  }

  /**
   * Register a callback to be called on each tick
   */
  public onTick(callback: () => void): void {
    this.onTickCallbacks.push(callback);
  }

  /**
   * Remove a tick callback
   */
  public offTick(callback: () => void): void {
    const index = this.onTickCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onTickCallbacks.splice(index, 1);
    }
  }

  /**
   * Change tick rate (speed)
   */
  public setTickRate(ms: number): void {
    this.tickRate = ms;
    if (this.intervalId !== null) {
      this.stop();
      this.start();
    }
  }

  public getTickRate(): number {
    return this.tickRate;
  }

  /**
   * Manually trigger a single tick (useful for testing)
   */
  public manualTick(): void {
    this.processTick();
  }
}

// Singleton instance
export const tickSystem = new TickSystem();
