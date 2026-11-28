import { BoundingBox, Vector3, type Mesh } from '@babylonjs/core';
import { gameState } from '../simulation/GameState';
import type {
  PassengerDestination,
  PassengerRoute,
  PassengerStop
} from '../simulation/PassengerRoute';
import { ISOMETRIC_ALPHA } from '../types';
import { CityModels, ModelParts } from './CityModels';
import { neighbour } from './NeighbourhoodScenes';

interface Point {
  x: number;
  z: number;
}
type Station = Point & { yaw: number; viewAlpha: number };

// A stop can move along its boulevard when an old city has a building across the curb.
function clearCurb(models: CityModels, x: number, z: number, fallback: number): number {
  const sites = [...gameState.getBuildings(), gameState.getCivicProject()];
  for (const dx of [0, 1.5, -1.5, 3, -3]) {
    const curb = x + dx;
    // Full extent of the stopped bus, the queue and the shelter 0.88 units down the kerb.
    const bounds = new BoundingBox(
      new Vector3(curb - 1.65, 0, z - 0.83),
      new Vector3(curb + 0.54, 1, z + 0.18)
    );
    if (
      !sites.some(
        (site) =>
          site &&
          models.overlapsLot(bounds, 'kind' in site ? site.kind : site.type, site.gridX, site.gridZ)
      )
    )
      return curb;
  }
  return fallback;
}

let flatsX = 37.9,
  maekX = 36.8;

export function passengerStopPosition(stop: PassengerStop): Station {
  return stop === 'flats'
    ? { x: flatsX, z: 18, yaw: Math.PI, viewAlpha: ISOMETRIC_ALPHA }
    : { x: 52.35, z: 14, yaw: 0, viewAlpha: ISOMETRIC_ALPHA };
}

export function passengerDestinationPosition(destination: PassengerDestination): Station {
  return destination === 'maek'
    ? { x: maekX, z: 14, yaw: Math.PI, viewAlpha: ISOMETRIC_ALPHA }
    : { x: 57.35, z: 15.45, yaw: Math.PI / 2, viewAlpha: (5 * Math.PI) / 4 };
}

// The old streets form a ladder: two boulevards joined by three cross streets.
// Keep driving through each terminus so the bus arrives on the return trip without reversing.
function serviceStreets(route: PassengerRoute, origin: Station, end: Station) {
  const point = (x: number, z: number): Point => ({ x, z });
  let outbound: Point[], homeward: Point[];
  if (route.stop === 'flats') {
    const cross = route.destination === 'abay' ? 57.35 : 42;
    outbound = [origin, point(cross, 18)];
    if (route.destination === 'maek') outbound.push(point(cross, 14));
    outbound.push(end);
    homeward = route.destination === 'abay' ? [point(cross, 14)] : [];
    homeward.push(point(32.9, 14), point(32.9, 18));
  } else if (route.destination === 'abay') {
    outbound = [origin, point(57.35, 14), end];
    homeward = [point(57.35, 18), point(42, 18), point(42, 14)];
  } else {
    outbound = [origin, end];
    homeward = [point(32.9, 14), point(32.9, 18), point(57.35, 18), point(57.35, 14)];
  }
  return { points: [...outbound, ...homeward], terminus: outbound.length - 1 };
}

function stopShelter(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, 0, 1.24, 0.53, 0.045, '#c1b49a');
  for (const x of [-0.48, 0.44]) {
    p.box(x, 0.14, 0.045, 0.037, 0.042, 0.48, '#417477');
    p.box(x, 0.03, 0.045, 0.037, 0.13, 0.13, '#416568');
  }
  p.box(0, 0.155, 0.23, 0.96, 0.033, 0.21, '#7da7a5');
  p.box(0, 0.06, 0.175, 0.99, 0.12, 0.034, '#bf865b');
  p.box(0, 0, 0.52, 1.1, 0.5, 0.043, '#eee4c9');
  p.box(0, -0.245, 0.496, 1.1, 0.029, 0.05, '#457c85');
  // An enamel bus pictogram on both sides of the pole.
  p.box(0.66, -0.14, 0, 0.03, 0.035, 0.68, '#617375');
  p.box(0.66, -0.14, 0.51, 0.21, 0.035, 0.23, '#3d7891');
  p.box(0.66, -0.14, 0.537, 0.156, 0.04, 0.165, '#f4e8c8');
  p.box(0.66, -0.14, 0.561, 0.1, 0.045, 0.106, '#34565d');
  p.box(0.66, -0.14, 0.6, 0.075, 0.05, 0.048, '#f4e8c8');
  return p;
}

function routeLivery(): ModelParts {
  const p = new ModelParts();
  p.box(0, 0, 0.069, 0.224, 0.666, 0.075, '#c55b3f');
  p.box(0, 0, 0.137, 0.225, 0.667, 0.022, '#f4deab');
  for (const x of [-0.078, 0.078]) p.box(x, 0.334, 0.082, 0.029, 0.012, 0.023, '#ffe4a3');
  // The destination box carries the number 1 above the front window.
  p.box(0, 0.335, 0.222, 0.105, 0.012, 0.038, '#364c4e');
  p.box(0.002, 0.344, 0.23, 0.009, 0.003, 0.025, '#fff1c9');
  return p;
}

const DWELL = 4.8;
const SPEED = 1.35;
const ambient = [
  { x: 32.98, z: 14.08 },
  { x: 41.92, z: 14.08 },
  { x: 41.92, z: 17.92 },
  { x: 32.98, z: 17.92 }
];

export function mountPassengerBus(
  bus: Mesh,
  finish: (parts: ModelParts, name: string) => Mesh
): void {
  const originShelter = finish(stopShelter(), 'passenger stop');
  const endShelter = finish(stopShelter(), 'passenger terminus');
  const livery = finish(routeLivery(), 'route 1 livery');
  livery.parent = bus;
  const riders = ['#bd6148', '#d8ae59', '#568d94'].map((shirt, i) => {
    const p = new ModelParts();
    neighbour(p, 0, 0, 0, 0.35 - 0.017 * i, shirt, '#536171', ['#705040', '#b3885d', '#50423d'][i]);
    return finish(p, 'bus passenger ' + (i + 1));
  });

  let route: PassengerRoute | null = null;
  let origin = passengerStopPosition('flats'),
    end = passengerDestinationPosition('maek');
  let points = ambient,
    terminus = -1,
    segment = 0,
    elapsed = 0;
  function positionShelter(mesh: Mesh, station: Station) {
    const nx = Math.sin(station.yaw),
      nz = Math.cos(station.yaw);
    // Pull up just past the shelter so the roof leaves the door and waiting riders in view.
    mesh.position.set(station.x + 0.56 * nx + 0.88 * nz, 0.157, station.z + 0.56 * nz - 0.88 * nx);
    mesh.rotation.y = station.yaw;
  }
  function updateRoute() {
    route = gameState.getPassengerRoute();
    originShelter.setEnabled(!!route);
    endShelter.setEnabled(!!route);
    livery.setEnabled(!!route);
    for (const rider of riders) rider.setEnabled(!!route);
    bus.scaling.setAll(route ? 1.55 : 1);
    segment = 0;
    elapsed = route ? 0 : 2 / 0.85;
    if (route) {
      origin = passengerStopPosition(route.stop);
      end = passengerDestinationPosition(route.destination);
      positionShelter(originShelter, origin);
      positionShelter(endShelter, end);
      ({ points, terminus } = serviceStreets(route, origin, end));
    } else {
      points = ambient;
      terminus = -1;
    }
    bus.rotation.y = Math.atan2(points[1].x - points[0].x, points[1].z - points[0].z);
  }
  function checkCurb() {
    const models = CityModels.forScene(bus.getScene());
    flatsX = clearCurb(models, 37.9, 18, 51.25);
    maekX = clearCurb(models, 36.8, 14, 51.75);
    if (
      route &&
      (origin.x !== passengerStopPosition(route.stop).x ||
        end.x !== passengerDestinationPosition(route.destination).x)
    )
      updateRoute();
  }

  // The same three meshes wait, step up to the door and later walk off the bus.
  function moveRiders(station: Station, alighting: boolean, seconds: number, doorHeading: number) {
    const nx = Math.sin(station.yaw),
      nz = Math.cos(station.yaw);
    const sign = alighting ? 1 : -1;
    const doorX = station.x + 0.17 * nx + 0.3 * Math.sin(doorHeading);
    const doorZ = station.z + 0.17 * nz + 0.3 * Math.cos(doorHeading);
    for (let i = 0; i < riders.length; i++) {
      const rider = riders[i],
        walk = (seconds - 0.75 - i * 0.79) / 1.07;
      const visible = alighting ? walk >= 0 && walk <= 1 : walk < 1;
      rider.setEnabled(visible);
      if (!visible) continue;
      const t = Math.min(1, Math.max(0, alighting ? walk : 1 - walk));
      // Leave along the pavement past the bench, keeping the shelter and road clear.
      const along = alighting ? 1.28 + i * 0.22 : 0.32 - i * 0.26;
      const across = alighting ? 0.34 + i * 0.04 : 0.37;
      const dx = station.x + across * nx + along * nz - doorX;
      const dz = station.z + across * nz - along * nx - doorZ;
      const step = walk > 0 && walk < 1 ? 0.016 * Math.abs(Math.sin(walk * Math.PI * 4)) : 0;
      rider.position.set(doorX + t * dx, 0.2 + step, doorZ + t * dz);
      rider.rotation.y = Math.atan2(-sign * dx, -sign * dz);
    }
  }

  checkCurb();
  updateRoute();
  gameState.on('passengerRouteChange', updateRoute);
  for (const event of ['buildingPlaced', 'buildingRemoved', 'civicProjectChange'] as const)
    gameState.on(event, checkCurb);
  const scene = bus.getScene();
  const drive = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(100, scene.getEngine().getDeltaTime()) * 0.001;
    elapsed += dt;
    const next = (segment + 1) % points.length;
    const a = points[segment],
      b = points[next];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const dwell = route && (segment === 0 || segment === terminus) ? DWELL : 0;
    const speed = route ? SPEED : 0.85;
    const length = Math.hypot(dx, dz);
    const pullOut = dwell ? 0.5 : 0;
    const brake = route && (next === 0 || next === terminus) ? 0.5 : 0;
    const travel = length / speed + (pullOut + brake) / 2;
    const t = Math.min(travel, Math.max(0, elapsed - dwell));
    let distance = speed * (t - pullOut / 2);
    if (t < pullOut) distance = (speed * t * t) / (2 * pullOut);
    else if (t > travel - brake) distance = length - (speed * (travel - t) ** 2) / (2 * brake);
    const progress = distance / length;
    bus.position.set(a.x + dx * progress, 0.192, a.z + dz * progress);
    const turn = Math.atan2(dx, dz) - bus.rotation.y;
    bus.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 12);
    bus.isVisible = !gameState.getBuildingAt(
      Math.floor(bus.position.x),
      Math.floor(bus.position.z)
    );
    livery.isVisible = bus.isVisible;
    if (route) {
      if (segment === 0 && elapsed < DWELL) moveRiders(origin, false, elapsed, bus.rotation.y);
      else if (segment === terminus && elapsed < DWELL)
        moveRiders(end, true, elapsed, bus.rotation.y);
      else if (segment >= terminus)
        moveRiders(origin, false, 0, Math.atan2(points[1].x - origin.x, points[1].z - origin.z));
      else for (const rider of riders) rider.setEnabled(false);
    }
    if (elapsed >= dwell + travel) {
      elapsed -= dwell + travel;
      segment = (segment + 1) % points.length;
    }
  });
  bus.onDisposeObservable.addOnce(() => {
    scene.onBeforeRenderObservable.remove(drive);
    gameState.off('passengerRouteChange', updateRoute);
    for (const event of ['buildingPlaced', 'buildingRemoved', 'civicProjectChange'] as const)
      gameState.off(event, checkCurb);
  });
}
