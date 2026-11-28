import { Vector3 } from '@babylonjs/core';
import { getCameraInstance } from '../engine/Camera';
import { t } from '../i18n';
import { soundManager } from '../managers/SoundManager';
import { passengerDestinationPosition, passengerStopPosition } from '../models/PassengerBus';
import { gameState, RESERVE_CREW_DAYS } from '../simulation/GameState';
import {
  ABAY_MORALE_BONUS,
  MAEK_CREW_DAYS,
  type PassengerDestination,
  type PassengerStop
} from '../simulation/PassengerRoute';
import { tickSystem } from '../simulation/TickSystem';
import { ICONS } from './Icons';
import './passenger-route.css';

export class PassengerRoutePanel {
  private readonly dialog = document.createElement('dialog');
  private readonly form: HTMLFormElement;
  private readonly submit: HTMLButtonElement;
  private readonly button: HTMLButtonElement;
  private readonly lockedHint: HTMLElement;

  constructor(button: HTMLButtonElement, lockedHint: HTMLElement, beforeTrip: () => void) {
    this.button = button;
    this.lockedHint = lockedHint;
    const option = (group: string, value: string, label: string, detail = '') => `
      <label class="passenger-option">
        <input type="radio" name="passenger-${group}" value="${value}">
        <span><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ''}</span>
      </label>`;
    this.dialog.id = 'passenger-route-dialog';
    this.dialog.setAttribute('aria-labelledby', 'passenger-title');
    this.dialog.innerHTML = `
      <header class="passenger-header">
        <div class="passenger-heading"><span class="passenger-number" aria-hidden="true">1</span><h2 id="passenger-title">${t('bus.title')}</h2></div>
        <button type="button" class="passenger-close" aria-label="${t('menu.close')}">${ICONS.close}</button>
      </header>
      <form class="passenger-form">
        <fieldset><legend>${t('bus.board')}</legend><div class="passenger-options">
          ${option('stop', 'flats', t('bus.flats'))}${option('stop', 'kiosk', t('bus.kiosk'))}
        </div></fieldset>
        <fieldset><legend>${t('bus.terminus')}</legend><div class="passenger-options">
          ${option('destination', 'maek', t('bus.maek'), t('bus.maekBenefit', { usual: RESERVE_CREW_DAYS, days: MAEK_CREW_DAYS }))}
          ${option('destination', 'abay', t('bus.abay'), t('bus.abayBenefit', { amount: ABAY_MORALE_BONUS }))}
        </div></fieldset>
        <p class="passenger-crew" hidden></p>
        <button type="submit" class="passenger-submit"></button>
      </form>`;
    document.body.append(this.dialog);
    this.form = this.dialog.querySelector('form')!;
    this.submit = this.form.querySelector('.passenger-submit')!;
    button.addEventListener('click', () => {
      if (!gameState.canOpenPassengerRoute() || tickSystem.hasOpenModal() || this.dialog.open)
        return;
      const route = gameState.getPassengerRoute();
      this.stops.value = route?.stop ?? 'flats';
      this.destinations.value = route?.destination ?? 'maek';
      const until = gameState.getPassengerDestinationLockedUntil();
      this.form.querySelector<HTMLInputElement>('[value="abay"]')!.disabled = until !== null;
      const note = this.form.querySelector<HTMLElement>('.passenger-crew')!;
      note.hidden = until === null;
      if (until !== null) note.textContent = t('bus.crewAway', { day: until });
      this.updateAction();
      this.dialog.showModal();
      tickSystem.onModalOpen();
    });
    this.dialog
      .querySelector('.passenger-close')!
      .addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('keydown', (event) => event.stopPropagation());
    this.dialog.addEventListener('close', () => tickSystem.onModalClose());
    this.form.addEventListener('change', () => this.updateAction());
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const stop = this.stops.value as PassengerStop;
      const destination = this.destinations.value as PassengerDestination;
      const current = gameState.getPassengerRoute();
      const unchanged = current?.stop === stop && current.destination === destination;
      if (!unchanged && !gameState.setPassengerRoute(stop, destination)) return;
      this.dialog.close();
      beforeTrip();
      const station = unchanged
        ? passengerDestinationPosition(destination)
        : passengerStopPosition(stop);
      const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500;
      getCameraInstance()?.focusOn(new Vector3(station.x, 0, station.z), duration, {
        alpha: station.viewAlpha,
        radius: 7.5
      });
      soundManager.play(unchanged ? 'click' : 'success');
    });
  }

  private get stops(): RadioNodeList {
    return this.form.elements.namedItem('passenger-stop') as RadioNodeList;
  }

  private get destinations(): RadioNodeList {
    return this.form.elements.namedItem('passenger-destination') as RadioNodeList;
  }

  private updateAction(): void {
    const current = gameState.getPassengerRoute();
    const unchanged =
      current?.stop === this.stops.value && current.destination === this.destinations.value;
    this.submit.textContent = t(!current ? 'bus.start' : unchanged ? 'bus.visit' : 'bus.change');
  }

  public update(): void {
    const unlocked = gameState.canOpenPassengerRoute();
    this.button.hidden = !unlocked;
    this.lockedHint.hidden = unlocked;
    if (!unlocked) return;
    const route = gameState.getPassengerRoute();
    const label = route
      ? t('bus.running', { destination: t(`bus.${route.destination}`) })
      : t('bus.open');
    const caption = this.button.querySelector('strong')!;
    if (caption.textContent !== label) caption.textContent = label;
  }
}
