import { expect, test } from 'bun:test';
import { getTileTypeAt } from '../src/grid/TileTypes';
import { GameState } from '../src/simulation/GameState';
import type { BuildingType } from '../src/types';

test('four and eight homes unlock the next thermal plants at the usual construction cost', () => {
  const city = new GameState();
  city.addResources({ freshWater: 500, heat: 500 });
  const place = (type: BuildingType, x: number, z: number) => {
    expect(city.canPlaceBuilding(type, x, z, getTileTypeAt(x, z)).canPlace).toBe(true);
    expect(city.placeBuilding(type, x, z)).not.toBeNull();
  };

  place('thermal_plant', 24, 22);
  for (let homes = 1; homes <= 8; homes++) {
    place('microrayon', 22 + 2 * homes, 18);
    if (homes === 4 || homes === 8) {
      const power = homes === 4 ? 46 : 52;
      const before = city.getResources().electricity;
      expect(city.getEffectiveCost('thermal_plant')).toEqual({ electricity: power });
      place('thermal_plant', 24 + homes, 22);
      expect(city.getResources().electricity).toBe(before - power);
    }
    expect(city.getEffectiveCost('thermal_plant')).toBeNull();
  }
});
