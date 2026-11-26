import {
  AbstractMesh,
  Color3,
  Mesh,
  Scene,
  StandardMaterial,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { CityModels, ModelParts } from '../models/CityModels';
import {
  foliage,
  harborLight,
  harborTug,
  limestoneOutcrop,
  marketHall,
  portOffice,
  quay,
  workersBus
} from '../models/Harbor';
import { gameState, type Season } from '../simulation/GameState';
import { seasonalCoast, snowOnRoofs } from '../engine/Seasons';
import { GRID_SIZE } from '../types';
import type { Building, TileType } from '../types';

class DecorManagerClass {
  private tileItems = new Map<number, Set<AbstractMesh>>();
  private hiddenByCivicProject = new Set<AbstractMesh>();
  private meshes: Set<AbstractMesh> = new Set();
  private material: StandardMaterial | null = null;
  private waterfrontRoofs: Mesh[] = [];
  private vegetation: { mesh: Mesh; positions: Float32Array; colors: Float32Array }[] = [];
  private buildingPlaced = (data: unknown) => {
    const { gridX, gridZ } = data as Building;
    this.removeDecorationAt(gridX, gridZ);
  };

  public initialize(scene: Scene, getTileAt: (x: number, z: number) => TileType | null): void {
    this.material = new StandardMaterial('port paint and stone', scene);
    this.material.specularColor = Color3.Black();
    const shadowMap = scene.getLightByName('sunLight')?.getShadowGenerator()?.getShadowMap();
    const finish = (parts: ModelParts, name: string, castsShadow = true) => {
      const mesh = parts.finish(name, scene);
      mesh.material = this.material;
      mesh.receiveShadows = true;
      mesh.isPickable = false;
      if (castsShadow) shadowMap?.renderList?.push(mesh);
      this.meshes.add(mesh);
      return mesh;
    };
    const place = (
      mesh: AbstractMesh,
      x: number,
      y: number,
      z: number,
      rotation = 0,
      scale = 1
    ) => {
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotation;
      mesh.scaling.setAll(scale);
      mesh.freezeWorldMatrix();
      mesh.isPickable = false;
      this.meshes.add(mesh);
    };
    const register = (mesh: AbstractMesh, x: number, z: number) => {
      const key = Math.floor(x) + Math.floor(z) * GRID_SIZE;
      let items = this.tileItems.get(key);
      if (!items) this.tileItems.set(key, (items = new Set()));
      items.add(mesh);
    };

    const dock = finish(quay(), 'harbor cargo pier');
    place(dock, 32, 0, 8.8);
    const tug = finish(harborTug(), 'harbor tug');
    place(tug, 30.95, 0, 7.42, -0.07);
    const light = finish(harborLight(), 'breakwater light');
    place(light, 44.5, 0, 2.84);
    const customs = finish(portOffice(), 'port customs office');
    place(customs, 43.5, 0.15, 12.47);
    const canteen = finish(portOffice(), 'workers canteen');
    place(canteen, 46.1, 0.15, 12.28, Math.PI, 0.88);
    const market = finish(marketHall(), 'covered market');
    place(market, 44.85, 0.15, 15.12, Math.PI);
    const dockShed = finish(marketHall(), 'quayside stores');
    place(dockShed, 33.95, 0.15, 11.65, Math.PI / 2, 0.72);
    this.waterfrontRoofs = [dock, customs, canteen, market, dockShed];
    // Clearing any intersecting construction lot clears the entire landmark.
    for (const mesh of [dock, tug, light, customs, canteen, market, dockShed]) {
      const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
      for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++)
        for (let z = Math.floor(min.z); z <= Math.floor(max.z); z++) register(mesh, x, z);
    }

    // The harbor tug leaves its mooring, circles the breakwater, then returns.
    // Its two fading wake lines follow the stern without extra water simulation.
    tug.unfreezeWorldMatrix();
    const wake = new Mesh('harbor wake', scene);
    const wakeData = new VertexData();
    const wakePoints: number[] = [],
      wakeColors: number[] = [],
      wakeIndices: number[] = [];
    for (const side of [-1, 1]) {
      for (let n = 0; n <= 7; n++) {
        const t = n / 7,
          index = wakePoints.length / 3;
        const x = side * (0.39 + 0.61 * t),
          z = -0.36 - t * 2.65;
        const width = 0.085 * (1 - t) + 0.025;
        wakePoints.push(x, -0.012, z, x + side * width, -0.012, z);
        wakeColors.push(1, 1, 1, 0.66 * (1 - t), 1, 1, 1, 0.05 * (1 - t));
        if (n) wakeIndices.push(index - 2, index - 1, index, index - 1, index + 1, index);
      }
    }
    Object.assign(wakeData, { positions: wakePoints, indices: wakeIndices, colors: wakeColors });
    wakeData.applyToMesh(wake);
    const wakePaint = new StandardMaterial('wake foam', scene);
    wakePaint.disableLighting = true;
    wakePaint.emissiveColor = Color3.FromHexString('#d7eeea');
    wakePaint.backFaceCulling = false;
    wake.material = wakePaint;
    wake.hasVertexAlpha = true;
    wake.isPickable = false;
    wake.parent = tug;
    let sailing = 0;
    const sail = scene.onBeforeRenderObservable.add(() => {
      sailing += Math.min(100, scene.getEngine().getDeltaTime()) * 0.00011;
      const c = Math.cos(sailing),
        s = Math.sin(sailing);
      const x = 36.1 - 5.15 * c,
        z = 5.19 + 2.23 * c - 1.48 * s;
      tug.position.set(x, 0.009 * Math.sin(sailing * 23), z);
      tug.rotation.y = Math.atan2(5.15 * s, -2.23 * s - 1.48 * c);
      tug.setEnabled(
        !gameState
          .getBuildings()
          .some(
            (b) => b.type === 'pump' && (b.gridX + 0.5 - x) ** 2 + (b.gridZ + 0.5 - z) ** 2 < 2.1
          )
      );
    });
    tug.onDisposeObservable.addOnce(() => {
      scene.onBeforeRenderObservable.remove(sail);
      wakePaint.dispose();
    });

    const trees = finish(foliage(true), 'Caspian poplar');
    const shrubs = finish(foliage(false), 'steppe shrub');
    const rocks = finish(limestoneOutcrop(), 'limestone outcrop');
    for (const original of [trees, shrubs, rocks]) original.isVisible = false;
    this.vegetation = [trees, shrubs].map((mesh) => ({
      mesh,
      positions: Float32Array.from(mesh.getVerticesData(VertexBuffer.PositionKind)!),
      colors: Float32Array.from(mesh.getVerticesData(VertexBuffer.ColorKind)!)
    }));
    const plant = (source: Mesh, x: number, y: number, z: number, angle: number, scale: number) => {
      const mesh = source.createInstance(source.name);
      place(mesh, x, y, z, angle, scale);
      if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) register(mesh, x, z);
    };

    // Planted windbreaks follow the street plan. The inner yards remain free to build.
    for (const z of [13.53, 18.45]) {
      for (let x = 25.7; x < 49; x += 1.23) {
        if (
          getTileAt(Math.floor(x), Math.floor(z)) !== 'sand' ||
          Math.abs(x - 33) < 0.7 ||
          Math.abs(x - 41.9) < 0.8
        )
          continue;
        plant(trees, x, 0.15, z, x * 0.5, 0.72 + 0.1 * Math.sin(x));
      }
    }
    for (let z = 6; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const type = getTileAt(x, z);
        if (type === 'rock')
          plant(rocks, x + 0.5, 0.15, z + 0.5, x + z, 0.8 + 0.18 * Math.sin(x + z));
        if (type === 'sand' && (x * 23 + z * 43) % 31 === 0) {
          plant(shrubs, x + 0.3, 0.15, z + 0.7, z * 1.7, 0.68 + 0.2 * Math.cos(x));
        }
      }
    }
    // A low limestone breakwater carries the beacon at its seaward end.
    for (let n = 0; n < 18; n++) {
      const t = n / 17;
      plant(rocks, 44.5 + t * 1.65 + 0.14 * Math.sin(n * 5), -0.06, 2.84 + t * 2.62, n * 3, 1.36);
    }

    const streets = new ModelParts();
    const boulevard = (x: number, z: number, length: number, horizontal: boolean) => {
      const dimension = (along: number, across: number): [number, number] =>
        horizontal ? [along, across] : [across, along];
      streets.box(x, z, 0.145, ...dimension(length + 0.14, 0.55), 0.028, '#c4b89e');
      streets.box(x, z, 0.169, ...dimension(length, 0.36), 0.014, '#87877d');
      for (let d = -length / 2 + 0.4; d < length / 2 - 0.2; d += 0.95) {
        streets.box(
          x + (horizontal ? d : 0),
          z + (horizontal ? 0 : d),
          0.185,
          ...dimension(0.24, 0.026),
          0.004,
          '#d9ceb0'
        );
      }
    };
    boulevard(41.25, 14, 18.5, true);
    boulevard(39.5, 18, 22, true);
    boulevard(32.9, 14.58, 7.55, false);
    boulevard(42, 12.3, 11.55, false);
    // Painted crossings and slim street lanterns at the two main intersections.
    for (const x of [32.9, 42]) {
      for (const z of [14, 18]) {
        for (const dx of [-0.52, 0.52]) {
          for (let n = -2; n <= 2; n++)
            streets.box(x + dx, z + n * 0.063, 0.19, 0.17, 0.035, 0.006, '#e4d8bd');
        }
      }
    }
    const roads = finish(streets, 'city boulevards', false);
    roads.freezeWorldMatrix();

    const bus = finish(workersBus(), 'shift bus');
    // The route is one circuit of the existing streets. The bus disappears
    // behind any construction that extends into its lane.
    let travelled = 2;
    const route = [
      [32.98, 14.08],
      [41.92, 14.08],
      [41.92, 17.92],
      [32.98, 17.92],
      [32.98, 14.08]
    ];
    const lengths = route.slice(1).map(([x, z], i) => Math.hypot(x - route[i][0], z - route[i][1]));
    const circuit = lengths.reduce((total, value) => total + value, 0);
    const drive = scene.onBeforeRenderObservable.add(() => {
      travelled = (travelled + Math.min(100, scene.getEngine().getDeltaTime()) * 0.00085) % circuit;
      let distance = travelled,
        i = 0;
      while (distance > lengths[i] && i < lengths.length - 1) distance -= lengths[i++];
      const [ax, az] = route[i],
        [bx, bz] = route[i + 1];
      const dx = bx - ax,
        dz = bz - az;
      const x = ax + (dx * distance) / lengths[i],
        z = az + (dz * distance) / lengths[i];
      bus.position.set(x, 0.192, z);
      bus.rotation.y = Math.atan2(dx, dz);
      bus.isVisible = !gameState.getBuildingAt(Math.floor(x), Math.floor(z));
    });
    bus.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(drive));

    const pole = new ModelParts();
    pole.cylinder(0, 0, 0, 0.05, 0.029, 0.67, '#667674', 6);
    pole.tube([0, 0.65, 0], [-0.13, 0.73, 0], 0.029, '#667674', 5);
    pole.box(-0.17, 0, 0.705, 0.12, 0.068, 0.04, '#e9d9b5');
    const lamp = finish(pole, 'boulevard light');
    lamp.isVisible = false;
    for (let x = 34.5; x < 50; x += 3.1) {
      for (const z of [14.3, 17.7]) plant(lamp, x, 0.15, z, 0, 1);
    }

    // Beyond the build boundary, the road continues past the existing Soviet town.
    const library = CityModels.forScene(scene);
    for (const [x, z, angle] of [
      [51.5, 13.3, 0],
      [53.6, 13.3, 0],
      [56, 13.3, 0],
      [52, 17.1, Math.PI / 2],
      [54.5, 17.1, Math.PI / 2],
      [57, 17.1, Math.PI / 2]
    ]) {
      const block = library.create('microrayon', 'old town apartments', Math.round(x));
      place(
        block,
        x,
        0.15 + Math.min(1, (x - GRID_SIZE) / 18) * (1.2 + Math.sin(x * 0.22 + z * 0.1)) ** 2,
        z,
        angle,
        1.1
      );
      shadowMap?.renderList?.push(block);
    }
    gameState.on('buildingPlaced', this.buildingPlaced);
  }

  public setSeason(season: Season): void {
    const leaf = Color3.FromHexString(seasonalCoast[season].leaf);
    const winter = season === 'winter';
    for (const roof of this.waterfrontRoofs) {
      if (!roof.isDisposed()) snowOnRoofs(roof, winter);
    }
    for (const plant of this.vegetation) {
      const colors = new Float32Array(plant.colors);
      const positions = new Float32Array(plant.positions);
      for (let p = 0, c = 0; p < positions.length; p += 3, c += 4) {
        // Wood keeps its original paint through every season.
        if (colors[c + 1] <= colors[c]) continue;
        const tip = colors[c + 1] * 0.9 + 0.5;
        colors[c] = leaf.r * tip;
        colors[c + 1] = leaf.g * tip;
        colors[c + 2] = leaf.b * tip;
        if (winter) {
          positions[p] *= 0.055;
          positions[p + 2] *= 0.055;
        }
      }
      plant.mesh.setVerticesData(VertexBuffer.ColorKind, colors);
      plant.mesh.setVerticesData(VertexBuffer.PositionKind, positions);
    }
  }

  public removeDecorationAt(gridX: number, gridZ: number): void {
    const key = gridX + gridZ * GRID_SIZE;
    const items = this.tileItems.get(key);
    if (!items) return;
    for (const mesh of items) {
      if (this.meshes.delete(mesh)) mesh.dispose();
    }
    this.tileItems.delete(key);
  }

  public hasDecorationAt(gridX: number, gridZ: number): boolean {
    const items = this.tileItems.get(gridX + gridZ * GRID_SIZE);
    return items ? [...items].some((mesh) => !mesh.isDisposed()) : false;
  }

  public setCivicFootprint(site: { gridX: number; gridZ: number } | null): void {
    for (const item of this.hiddenByCivicProject) {
      if (!item.isDisposed()) item.setEnabled(true);
    }
    this.hiddenByCivicProject.clear();
    if (!site) return;

    const cx = site.gridX + 0.5,
      cz = site.gridZ + 0.5;
    const radius = 0.825;
    for (let z = site.gridZ - 1; z <= site.gridZ + 1; z++) {
      for (let x = site.gridX - 1; x <= site.gridX + 1; x++) {
        for (const item of this.tileItems.get(x + z * GRID_SIZE) ?? []) {
          if (item.isDisposed() || !item.isEnabled()) continue;
          const bounds = item.getBoundingInfo().boundingBox;
          if (
            bounds.maximumWorld.x < cx - radius ||
            bounds.minimumWorld.x > cx + radius ||
            bounds.maximumWorld.z < cz - radius ||
            bounds.minimumWorld.z > cz + radius
          )
            continue;
          item.setEnabled(false);
          this.hiddenByCivicProject.add(item);
        }
      }
    }
  }

  public dispose(): void {
    gameState.off('buildingPlaced', this.buildingPlaced);
    for (const mesh of this.meshes) mesh.dispose();
    this.tileItems.clear();
    this.hiddenByCivicProject.clear();
    this.meshes.clear();
    this.material?.dispose();
  }
}

export const decorManager = new DecorManagerClass();
