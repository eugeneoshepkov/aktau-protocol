import { t } from '../i18n';
import { FIELD_HOUSING, FIELD_RETURN_DELAY, type DistrictOrder } from '../simulation/DistrictPlan';
import { gameState, SEASONS, SEASON_LENGTH } from '../simulation/GameState';
import type { SightId } from './CitySights';

interface FieldBrief {
  title: string;
  description: string;
  order?: DistrictOrder;
}

export class FieldSeasonPanel {
  private readonly controls: HTMLElement;
  private readonly host: HTMLButtonElement;
  private readonly send: HTMLButtonElement;
  private readonly keep: HTMLButtonElement;
  private readonly visit: HTMLButtonElement;

  constructor(controls: HTMLElement, onArrival: () => void, openSight: (id: SightId) => void) {
    this.controls = controls;
    const addButton = (action: string, label: string, click: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.fieldAction = action;
      button.textContent = label;
      button.addEventListener('click', click);
      controls.append(button);
      return button;
    };
    this.host = addButton('host', t('field.host'), () => {
      if (gameState.startFieldSeason()) onArrival();
    });
    this.send = addButton('send', t('field.send'), () => gameState.chooseFieldCrew(true));
    this.keep = addButton('keep', t('field.keep'), () => gameState.chooseFieldCrew(false));
    this.visit = addButton('visit', '', () => {
      const phase = gameState.getFieldSeason()?.phase;
      if (phase === 'tower' || phase === 'returned') {
        openSight(phase === 'tower' ? 'fieldTower' : 'fieldTrace');
      }
    });
  }

  public update(established: boolean): FieldBrief | null {
    this.controls.hidden = !established;
    if (!established) return null;
    const field = gameState.getFieldSeason();
    const spring = gameState.getSeason() === 'spring';
    const homesReady =
      field?.phase === 'housing' &&
      gameState.getOperationalCount('microrayon') >= FIELD_HOUSING.target;
    this.host.hidden = !!field || !spring;
    this.send.hidden = this.keep.hidden = !homesReady;
    this.visit.hidden = field?.phase !== 'tower' && field?.phase !== 'returned';
    this.controls.hidden = this.host.hidden && this.send.hidden && this.visit.hidden;

    if (!field) {
      const year = SEASONS.length * SEASON_LENGTH;
      const nextSpring = gameState.getDay() + year - ((gameState.getDay() - 1) % year);
      return {
        title: t('plan.established.title'),
        description: spring ? t('field.invitation') : t('field.nextSpring', { day: nextSpring })
      };
    }
    if (field.phase === 'housing') {
      if (!homesReady) {
        return {
          title: t('field.housing.title'),
          description: t('field.housing.desc'),
          order: FIELD_HOUSING
        };
      }
      const freeDay = gameState.getNextDispatchDay();
      this.send.disabled = freeDay > gameState.getDay();
      const schedule = this.send.disabled
        ? ' ' + t('plan.nextDispatch', { day: freeDay }) + '.'
        : '';
      return { title: t('field.shift.title'), description: t('field.shift.desc') + schedule };
    }
    if (field.phase === 'trial') {
      const key = field.sentCrew ? 'field.trial.sent' : 'field.trial.kept';
      return { title: t('field.trial.title'), description: t(key, { day: field.completionDay }) };
    }
    const returned = field.phase === 'returned';
    this.visit.textContent = t(returned ? 'field.visitTrace' : 'field.visitTower');
    return {
      title: t(returned ? 'field.return.title' : 'field.tower.title'),
      description: returned
        ? t('field.return.desc')
        : t('field.tower.desc', { day: field.completionDay + FIELD_RETURN_DELAY })
    };
  }
}
