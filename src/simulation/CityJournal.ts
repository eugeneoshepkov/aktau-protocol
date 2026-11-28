import { STARTING_RESOURCES, type Resources } from '../types';
import type { PipeType } from '../config/ResourceFlow';

const MAX_ENTRIES = 160;
const ACTIONS = [
  'built',
  'buildRejected',
  'demolished',
  'reserveShift',
  'civicProject',
  'fieldSeason',
  'shortage',
  'weather',
  'loaded',
  'gameOver'
] as const;
export type CityAction = (typeof ACTIONS)[number];

export interface ActionDetails {
  gridX?: number;
  gridZ?: number;
  buildingId?: string;
  reason?: string;
  missing?: readonly PipeType[];
}

interface Entry extends ActionDetails {
  step: number;
  day: number;
  action: CityAction;
  subject: string;
  resources: Resources;
}

export class CityJournal {
  private entries: Entry[] = [];

  record(
    day: number,
    resources: Resources,
    action: CityAction,
    subject: string,
    details: ActionDetails
  ) {
    const step = (this.entries.at(-1)?.step ?? 0) + 1;
    this.entries.push({ step, day, action, subject, ...details, resources: { ...resources } });
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
  }

  snapshot(): Entry[] {
    return structuredClone(this.entries);
  }

  restore(raw: unknown, day: number): void {
    this.entries = [];
    if (!Array.isArray(raw)) return;
    for (const entry of raw.slice(-MAX_ENTRIES)) {
      // The history is optional. A malformed entry must not prevent opening a playable city.
      if (
        !entry ||
        !Number.isSafeInteger(entry.day) ||
        entry.day < 1 ||
        entry.day > day ||
        !Number.isSafeInteger(entry.step) ||
        entry.step <= (this.entries.at(-1)?.step ?? 0) ||
        !ACTIONS.includes(entry.action) ||
        typeof entry.subject !== 'string' ||
        !Object.keys(STARTING_RESOURCES).every((k) => Number.isFinite(entry.resources?.[k]))
      )
        continue;
      const details: ActionDetails = {};
      if (Number.isSafeInteger(entry.gridX)) details.gridX = entry.gridX;
      if (Number.isSafeInteger(entry.gridZ)) details.gridZ = entry.gridZ;
      if (typeof entry.buildingId === 'string') details.buildingId = entry.buildingId.slice(0, 100);
      if (typeof entry.reason === 'string') details.reason = entry.reason.slice(0, 240);
      if (Array.isArray(entry.missing)) {
        details.missing = (['heat', 'water'] as const).filter((r) => entry.missing.includes(r));
      }
      const resources = { ...STARTING_RESOURCES };
      for (const key of Object.keys(resources) as (keyof Resources)[])
        resources[key] = entry.resources[key];
      this.entries.push({
        step: entry.step,
        day: entry.day,
        action: entry.action,
        subject: entry.subject.slice(0, 100),
        ...details,
        resources
      });
    }
  }
}
