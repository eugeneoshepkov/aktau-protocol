import { ModelParts } from './CityModels';

// The ammonia shop in Lada's “Предприятия Шевченко” archive photograph.
export function fertiliserWorks(): ModelParts {
  const p = new ModelParts();
  const chalk = '#dfd8c3';
  const concrete = '#bbb8a9';
  const steel = '#596668';
  const glass = '#45656a';
  p.box(0, 0, -0.045, 3.65, 1.95, 0.09, '#aaa594');

  // The long office frontage has taller, narrow-windowed bays at both ends.
  p.box(0, 0.4, 0.045, 3.42, 0.72, 0.49, chalk);
  p.box(0, 0.4, 0.535, 3.46, 0.76, 0.045, concrete);
  for (let column = -8; column <= 8; column++) {
    const x = column * 0.195;
    p.box(x - 0.089, 0.767, 0.046, 0.026, 0.033, 0.48, concrete);
    for (const y of [0.16, 0.365]) {
      p.box(x, 0.765, y, 0.116, 0.017, 0.094, glass);
    }
  }
  for (const side of [-1, 1]) {
    const x = side * 1.12;
    p.box(x, 0.42, 0.58, 0.92, 0.68, 0.19, chalk);
    p.box(x, 0.42, 0.77, 0.95, 0.71, 0.034, concrete);
    for (let bay = -3; bay <= 3; bay++) {
      p.box(x + bay * 0.116, 0.765, 0.562, 0.057, 0.018, 0.16, glass);
    }
    for (const z of [0.17, 0.41, 0.63]) {
      p.box(side * 1.715, z, 0.15, 0.019, 0.12, 0.11, glass);
      p.box(side * 1.715, z, 0.355, 0.019, 0.12, 0.11, glass);
    }
  }
  p.box(0, 0.771, 0.05, 0.29, 0.028, 0.16, steel);
  p.box(0, 0.854, 0.22, 0.45, 0.2, 0.04, chalk);
  p.box(0, 0.28, 0.58, 1.34, 0.41, 0.1, chalk);
  for (const x of [-0.52, -0.26, 0, 0.26, 0.52]) {
    p.box(x, 0.488, 0.605, 0.17, 0.016, 0.048, glass);
  }

  // In the photograph, two pale rectangular towers and an open steel mast
  // rise above the frontage. Keep clear sky between their silhouettes.
  p.box(0, -0.34, 0.045, 3.24, 0.63, 0.49, concrete);
  for (const x of [0.62, 1.2]) {
    p.box(x, -0.38, 0.535, 0.39, 0.44, 0.72, chalk);
    p.box(x, -0.38, 1.255, 0.41, 0.46, 0.045, concrete);
  }
  for (const y of [0.75, 1.08]) {
    p.box(0.91, -0.38, y, 0.28, 0.25, 0.065, steel);
  }

  for (const x of [-1.55, -0.47, 0.59, 1.58]) {
    p.box(x, -0.8, 0.045, 0.075, 0.15, 0.23, concrete);
  }
  for (const z of [-0.84, -0.75]) {
    p.tube([-1.64, 0.31, z], [1.65, 0.31, z], 0.078, '#8d9691', 8);
  }

  // The lower western shed is framed in steel and has short roof vents.
  p.box(-1.04, -0.37, 0.535, 0.87, 0.55, 0.52, concrete);
  for (const y of [0.6, 0.86]) {
    p.box(-1.04, -0.37, y, 0.884, 0.566, 0.078, glass);
  }
  for (const x of [-1.44, -1.17, -0.9, -0.64]) {
    p.box(x, -0.37, 0.535, 0.028, 0.576, 0.52, steel);
  }
  p.box(-1.04, -0.37, 1.055, 0.95, 0.6, 0.06, steel);
  for (const x of [-1.31, -1.04, -0.77]) {
    p.cylinder(x, -0.38, 1.115, 0.095, 0.083, 0.26, concrete, 8);
    p.cylinder(x, -0.38, 1.375, 0.12, 0.12, 0.045, steel, 8);
  }

  const mastX = -0.24;
  const mastZ = -0.5;
  p.cylinder(mastX, mastZ, 0.535, 0.085, 0.045, 1.77, '#b7aba0', 8);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      p.tube(
        [mastX + x * 0.15, 0.54, mastZ + z * 0.15],
        [mastX + x * 0.048, 2.21, mastZ + z * 0.048],
        0.03,
        steel,
        4
      );
    }
  }
  for (let level = 0; level < 4; level++) {
    const y = 0.55 + 0.41 * level;
    const r = 0.15 - 0.025 * level;
    const next = r - 0.025;
    for (const side of [-1, 1]) {
      p.tube(
        [mastX - r, y, mastZ + side * r],
        [mastX + next, y + 0.41, mastZ + side * next],
        0.023,
        steel,
        4
      );
      p.tube(
        [mastX + side * r, y, mastZ + r],
        [mastX + side * next, y + 0.41, mastZ - next],
        0.023,
        steel,
        4
      );
    }
  }
  p.box(mastX, mastZ, 2.17, 0.23, 0.21, 0.045, steel);
  return p;
}
