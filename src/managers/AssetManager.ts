import { Scene, SceneLoader, AbstractMesh, AssetContainer } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { TileType } from '../types';

export interface ModelConfig {
  basePath?: string;
  file: string;
  scale: number;
  rotation: number;
  yOffset: number;
  offset?: { x: number; y: number; z: number };
}

export interface DecorationItem {
  file: string;
  scale: number;
  frequency: number;
}

export interface DecorationsConfig {
  basePath: string;
  items: DecorationItem[];
}

export interface TileAsset {
  primitive: {
    color: string;
  };
  model: ModelConfig | null;
}

export interface RoadsConfig {
  basePath: string;
  straight: string;
  bend: string;
  crossroad: string;
  intersection: string;
  end: string;
  scale: number;
}

export type MiscConfig = Record<string, string>;

export interface AssetManifest {
  version: string;
  useModels: boolean;
  basePaths: Record<string, string>;
  decorations?: DecorationsConfig;
  roads?: RoadsConfig;
  tiles: Record<string, TileAsset>;
  misc?: MiscConfig;
}

class AssetManagerClass {
  private manifest: AssetManifest | null = null;
  private scene: Scene | null = null;
  private loadedModels: Map<string, AssetContainer> = new Map();
  private loadingPromises: Map<string, Promise<AssetContainer>> = new Map();
  private initialized = false;

  public async initialize(scene: Scene): Promise<void> {
    if (this.initialized) return;

    this.scene = scene;

    try {
      const response = await fetch('/assets/manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`);
      }
      this.manifest = await response.json();
      console.log(`[AssetManager] Loaded manifest v${this.manifest?.version}`);
      this.initialized = true;
    } catch (error) {
      console.error('[AssetManager] Failed to load manifest:', error);
      this.manifest = this.getDefaultManifest();
      this.initialized = true;
    }
  }

  public shouldUseModels(): boolean {
    return this.manifest?.useModels ?? false;
  }

  public setUseModels(useModels: boolean): void {
    if (this.manifest) {
      this.manifest.useModels = useModels;
    }
  }

  public getDecorations(): DecorationsConfig | null {
    return this.manifest?.decorations ?? null;
  }

  public getRoads(): RoadsConfig | null {
    return this.manifest?.roads ?? null;
  }

  public getMiscAsset(key: string): string | null {
    return this.manifest?.misc?.[key] ?? null;
  }

  public getBasePath(key: string): string {
    return this.manifest?.basePaths?.[key] ?? '/models/';
  }

  public getModelFullPath(model: ModelConfig): string {
    const basePathKey = model.basePath ?? 'suburban';
    const basePath = this.getBasePath(basePathKey);
    return `${basePath}${model.file}`;
  }

  public async loadModel(filename: string, basePath?: string): Promise<AbstractMesh[] | null> {
    if (!this.scene) {
      console.error('[AssetManager] Scene not initialized');
      return null;
    }

    const basePathResolved = basePath ?? this.getBasePath('suburban');
    const fullPath = `${basePathResolved}${filename}`;
    const cacheKey = fullPath;

    if (this.loadedModels.has(cacheKey)) {
      const container = this.loadedModels.get(cacheKey)!;
      return container.instantiateModelsToScene().rootNodes as AbstractMesh[];
    }

    if (this.loadingPromises.has(cacheKey)) {
      const container = await this.loadingPromises.get(cacheKey)!;
      return container.instantiateModelsToScene().rootNodes as AbstractMesh[];
    }

    const loadPromise = this.loadModelAsync(fullPath, filename);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const container = await loadPromise;
      this.loadedModels.set(cacheKey, container);
      this.loadingPromises.delete(cacheKey);
      return container.instantiateModelsToScene().rootNodes as AbstractMesh[];
    } catch (error) {
      console.error(`[AssetManager] Failed to load model: ${filename}`, error);
      this.loadingPromises.delete(cacheKey);
      return null;
    }
  }

  public async loadModelFromConfig(config: ModelConfig): Promise<AbstractMesh[] | null> {
    const basePathKey = config.basePath ?? 'suburban';
    const basePath = this.getBasePath(basePathKey);
    return this.loadModel(config.file, basePath);
  }

  private async loadModelAsync(fullPath: string, filename: string): Promise<AssetContainer> {
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
    const file = fullPath.substring(fullPath.lastIndexOf('/') + 1);

    console.log(`[AssetManager] Loading model: ${filename} from ${dirPath}`);

    const container = await SceneLoader.LoadAssetContainerAsync(dirPath, file, this.scene!);

    return container;
  }

  public getTileColor(type: TileType): string {
    return this.manifest?.tiles[type]?.primitive?.color ?? this.getDefaultTileColor(type);
  }

  public getTileModel(type: TileType): ModelConfig | null {
    return this.manifest?.tiles[type]?.model ?? null;
  }

  public async preloadAllModels(): Promise<void> {
    if (!this.manifest || !this.shouldUseModels()) return;

    const loadTasks: Promise<void>[] = [];

    if (this.manifest.decorations) {
      const decorBasePath = this.getBasePath(this.manifest.decorations.basePath);
      for (const item of this.manifest.decorations.items) {
        loadTasks.push(this.preloadModel(item.file, decorBasePath));
      }
    }

    console.log(`[AssetManager] Preloading ${loadTasks.length} models...`);
    await Promise.all(loadTasks);
    console.log('[AssetManager] Preload complete');
  }

  private async preloadModel(filename: string, basePath: string): Promise<void> {
    const fullPath = `${basePath}${filename}`;
    const cacheKey = fullPath;

    if (this.loadedModels.has(cacheKey) || this.loadingPromises.has(cacheKey)) {
      return;
    }

    try {
      const loadPromise = this.loadModelAsync(fullPath, filename);
      this.loadingPromises.set(cacheKey, loadPromise);
      const container = await loadPromise;
      this.loadedModels.set(cacheKey, container);
      this.loadingPromises.delete(cacheKey);
    } catch (error) {
      console.error(`[AssetManager] Failed to preload model: ${filename}`, error);
      this.loadingPromises.delete(cacheKey);
    }
  }

  public dispose(): void {
    for (const container of this.loadedModels.values()) {
      container.dispose();
    }
    this.loadedModels.clear();
    this.loadingPromises.clear();
    this.initialized = false;
  }

  private getDefaultManifest(): AssetManifest {
    return {
      version: '1.0.0',
      useModels: false,
      basePaths: { suburban: '/models/suburban/Models/GLB format/' },
      tiles: {}
    };
  }

  private getDefaultTileColor(type: TileType): string {
    const defaults: Record<TileType, string> = {
      sand: '#E6D5AC',
      sea: '#2F8D8D',
      rock: '#555555'
    };
    return defaults[type];
  }
}

export const assetManager = new AssetManagerClass();
