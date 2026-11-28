import { expect, mock, test } from 'bun:test';
import { STARTER_DISTRICT } from '../src/simulation/DistrictPlan';
import { GameState } from '../src/simulation/GameState';
import type { PassengerRoute } from '../src/simulation/PassengerRoute';

test('two supplied homes unlock the bus, and only the active Abay service adds evening morale', () => {
  const city = new GameState();
  city.setConnectionChecker((b) => ({ isFullyOperational: b.gridX !== 20 }));
  for (const { type, x, z } of STARTER_DISTRICT) city.placeBuilding(type, x, z);
  const changes = mock(() => {});
  city.on('passengerRouteChange', changes);
  const isolated = city.placeBuilding('microrayon', 20, 20)!;
  expect(city.setPassengerRoute('flats', 'abay')).toBe(false);
  city.removeBuilding(isolated.id);
  const second = city.placeBuilding('microrayon', 39, 15)!;
  expect(city.canOpenPassengerRoute()).toBe(true);
  expect(city.getPassengerRoute()).toBeNull();

  const initialMorale = city.getResources().happiness;
  expect(city.setPassengerRoute('flats', 'abay')).toBe(true);
  expect(city.setPassengerRoute('flats', 'abay')).toBe(false);
  expect(changes).toHaveBeenCalledTimes(1);
  expect(city.setPassengerRoute('kiosk', 'abay')).toBe(true);
  expect(city.getResources().happiness).toBe(initialMorale);
  city.tick();
  expect(city.getResourceTrend().happiness).toBe(3); // Two homes and one evening service.
  city.setPassengerRoute('kiosk', 'maek');
  city.tick();
  expect(city.getResourceTrend().happiness).toBe(2);
  city.setPassengerRoute('flats', 'abay');
  city.addResources({ happiness: 99 - city.getResources().happiness });
  city.tick();
  expect(city.getResources().happiness).toBe(100);
  city.removeBuilding(second.id);
  expect(city.canOpenPassengerRoute()).toBe(true);
  expect(
    city.getDiagnosticReport().actions.filter((e) => e.action === 'passengerRoute')
  ).toHaveLength(4);
  city.reset();
  expect(city.getPassengerRoute()).toBeNull();
  expect(city.canOpenPassengerRoute()).toBe(false);
  expect(changes).toHaveBeenLastCalledWith(null);
});

test('legacy cities can open service, and only dispatches using the MAEK bus commit its destination', () => {
  const city = new GameState();
  city.setConnectionChecker(() => ({ isFullyOperational: true }));
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved = '';
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      }
    }
  });
  try {
    for (const { type, x, z } of STARTER_DISTRICT) city.placeBuilding(type, x, z);
    city.placeBuilding('pump', 38, 7);
    city.placeBuilding('distiller', 40, 9);
    for (const [x, z] of [
      [39, 15],
      [40, 12],
      [42, 13]
    ])
      city.placeBuilding('microrayon', x, z);
    city.addResources({ electricity: 150, freshWater: 80, heat: 80 });
    expect(city.save()).toBe(true);
    const legacy = JSON.parse(saved);
    delete legacy.passengerRoute;
    delete legacy.passengerDestinationLockedUntil;
    delete legacy.completedOrders;
    saved = JSON.stringify(legacy);
    expect(city.load()).toBe(true);
    expect(city.canOpenPassengerRoute()).toBe(true);
    expect(city.getPassengerRoute()).toBeNull();
    expect(city.dispatchSupply('freshWater')).toBe(true);
    const normalReturn = city.getDay() + 10;
    city.setPassengerRoute('flats', 'maek');
    expect(city.getPassengerDestinationLockedUntil()).toBeNull();
    expect(city.setPassengerRoute('flats', 'abay')).toBe(true);
    expect(city.getNextDispatchDay()).toBe(normalReturn);
    while (city.getDay() < normalReturn && !city.isGameOver()) city.tick();
    expect(city.getDay()).toBe(normalReturn);

    const route: PassengerRoute = { stop: 'kiosk', destination: 'maek' };
    expect(city.setPassengerRoute(route.stop, route.destination)).toBe(true);
    city.addResources({ freshWater: -40 });
    expect(city.dispatchSupply('freshWater')).toBe(true);
    const busReturn = city.getDay() + 7;
    expect(city.getNextDispatchDay()).toBe(busReturn);
    expect(city.getPassengerDestinationLockedUntil()).toBe(busReturn);
    expect(city.save()).toBe(true);
    const booked = saved;
    const changes = mock(() => {});
    city.on('passengerRouteChange', changes);
    expect(city.load()).toBe(true);
    expect(changes).toHaveBeenCalledWith(route);
    expect(city.getDiagnosticReport().city.passengerRoute).toEqual(route);
    expect(city.getPassengerDestinationLockedUntil()).toBe(busReturn);
    expect(city.getDiagnosticReport().actions.some((e) => e.action === 'passengerRoute')).toBe(
      true
    );
    saved = JSON.stringify({ ...JSON.parse(booked), passengerRoute: { ...route, stop: 'sea' } });
    expect(city.load()).toBe(false);
    expect(city.getPassengerRoute()).toEqual(route);
    expect(city.setPassengerRoute('flats', 'maek')).toBe(true);
    expect(city.setPassengerRoute('kiosk', 'abay')).toBe(false);
    expect(city.dispatchSupply('heat')).toBe(false);
    while (city.getDay() < busReturn && !city.isGameOver()) city.tick();
    expect(city.getDay()).toBe(busReturn);
    expect(city.getPassengerDestinationLockedUntil()).toBeNull();
    expect(city.setPassengerRoute('kiosk', 'abay')).toBe(true);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
