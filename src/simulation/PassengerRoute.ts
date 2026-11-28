export type PassengerStop = 'flats' | 'kiosk';
export type PassengerDestination = 'maek' | 'abay';

export interface PassengerRoute {
  readonly stop: PassengerStop;
  readonly destination: PassengerDestination;
}

export const MAEK_CREW_DAYS = 7;
export const ABAY_MORALE_BONUS = 1;

export function isPassengerRoute(value: unknown): value is PassengerRoute {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'stop' in value &&
    (value.stop === 'flats' || value.stop === 'kiosk') &&
    'destination' in value &&
    (value.destination === 'maek' || value.destination === 'abay')
  );
}
