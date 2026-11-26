import { ModelParts } from './CityModels';

// The 1977 archive view shows the screened foyer wrapping the corner;
// the 1989 colour photograph records the separate red and gold rooftop letters.
export function abayPalace(): ModelParts {
  const p = new ModelParts();
  const shell = '#c5ad89';
  const limestone = '#e9d9bb';
  const eaves = '#ccbba0';
  const glass = '#4c666a';
  const sash = '#93a09a';
  const roof = '#a6a49a';

  // Broad steps run around the street corner and up to the recessed entrances.
  p.box(0, 0, -0.04, 3.8, 2.9, 0.066, '#bbad90');
  for (let i = 0; i < 3; i++) {
    p.box(0.025 * i, -0.045 * i, 0.026 + 0.033 * i,
      3.68 - i * 0.09, 2.77 - i * 0.16, 0.033, i % 2 ? eaves : limestone);
  }

  // The hall occupies one side of the block. An open court behind the foyer
  // separates it from the low rooms along the other side.
  function wing(x: number, z: number, w: number, d: number, h: number) {
    p.box(x, z, 0.125, w, d, h - 0.125, shell);
    p.box(x, z, h, w + 0.018, d + 0.018, 0.033, eaves);
    p.box(x, z, h + 0.033, w - 0.045, d - 0.045, 0.009, roof);
  }
  wing(0, 0.755, 3.42, 0.62, 1.06);
  wing(-0.88, -0.378, 1.66, 1.647, 1.055);
  wing(1.505, -0.378, 0.41, 1.647, 0.83);
  wing(0.627, -1.02, 1.345, 0.365, 0.83);
  p.box(0.632, -0.186, 0.125, 1.35, 1.28, 0.01, '#b9ad93');
  for (let i = 0; i < 5; i++) {
    p.box(0.10 + i * 0.257, -0.833, 0.24, 0.19, 0.016, 0.42, glass);
    p.box(1.295, -0.68 + i * 0.235, 0.24, 0.016, 0.16, 0.42, glass);
  }

  // The fins stand out from two storeys of glass; the open lower arcade has
  // wider spaced columns and a projecting canopy over the central doors.
  const front = 1.075;
  p.box(-0.28, front, 0.135, 2.83, 0.027, 0.833, glass);
  p.box(-0.28, front + 0.019, 0.357, 2.87, 0.047, 0.071, shell);
  p.box(-0.28, front + 0.019, 0.675, 2.87, 0.04, 0.042, sash);
  for (let i = 0; i <= 22; i++) {
    const x = -1.67 + i * 0.127;
    p.box(x, front + 0.047, 0.418, 0.036, 0.115, 0.556, limestone);
    if (i % 3 === 0) {
      p.box(x, front + 0.027, 0.125, 0.053, 0.067, 0.236, limestone);
    }
  }
  p.box(-0.28, front + 0.025, 0.972, 2.89, 0.113, 0.09, shell);
  p.box(-0.22, front + 0.024, 0.136, 0.66, 0.027, 0.187, '#384f51');
  for (let i = 0; i < 5; i++) {
    p.box(-0.51 + 0.145 * i, front + 0.041, 0.136, 0.014, 0.013, 0.189, sash);
  }
  p.box(-0.22, front + 0.083, 0.323, 0.78, 0.2, 0.034, eaves);

  const side = -1.713;
  p.box(side, 0.229, 0.135, 0.027, 1.68, 0.833, glass);
  p.box(side - 0.018, 0.229, 0.357, 0.045, 1.7, 0.071, shell);
  p.box(side - 0.018, 0.229, 0.675, 0.038, 1.7, 0.042, sash);
  for (let i = 0; i < 14; i++) {
    const z = 1.03 - 0.127 * i;
    p.box(side - 0.047, z, 0.418, 0.115, 0.036, 0.556, limestone);
    if (i % 3 === 0) p.box(side - 0.024, z, 0.125, 0.067, 0.053, 0.236, limestone);
  }
  p.box(side - 0.027, 0.23, 0.972, 0.117, 1.75, 0.088, shell);
  for (let i = 0; i < 5; i++) {
    p.box(1.24 + i * 0.086, front, 0.787, 0.035, 0.019, 0.109, '#707774');
    p.box(side, -0.744 - i * 0.082, 0.787, 0.018, 0.031, 0.109, '#707774');
  }

  // The roof sign is open metalwork. The sky remains visible between its
  // letters from the square just as it is in photographs of Shevchenko.
  const tx = -0.77, tz = -0.605;
  p.box(tx, tz, 1.095, 1.08, 0.766, 0.418, '#b29a79');
  p.box(tx, tz, 1.513, 1.1, 0.788, 0.028, eaves);
  p.box(tx, tz, 1.541, 1.063, 0.75, 0.013, roof);
  const signZ = tz + 0.35;
  const signX = tx - 0.5;
  const metal = '#625d50';
  for (const x of [tx - 0.48, tx - 0.24, tx, tx + 0.24, tx + 0.48]) {
    p.box(x, signZ, 1.55, 0.014, 0.02, 0.082, metal);
    p.tube([x, 1.55, signZ - 0.071], [x, 1.63, signZ], 0.012, metal, 4);
  }
  p.box(tx, signZ, 1.614, 1.057, 0.022, 0.021, metal);
  p.box(signX, tz, 1.614, 0.022, 0.705, 0.021, metal);
  for (const z of [tz - 0.32, tz - 0.1, tz + 0.12]) {
    p.box(signX, z, 1.55, 0.014, 0.02, 0.08, metal);
  }

  // Stroke outlines for the freestanding АБАЯ on the long face of the tower.
  const letterA = [[0, 0, 0.082, 0.178], [0.082, 0.178, 0.166, 0], [0.037, 0.066, 0.135, 0.066]];
  const letters = [
    letterA,
    [[0, 0, 0, 0.178], [0, 0.178, 0.152, 0.178], [0, 0.093, 0.13, 0.093],
      [0.13, 0.093, 0.154, 0.064], [0.154, 0.064, 0.145, 0.021], [0.145, 0.021, 0, 0]],
    letterA,
    [[0.15, 0, 0.15, 0.178], [0.15, 0.178, 0.038, 0.178], [0.038, 0.178, 0.01, 0.14],
      [0.01, 0.14, 0.029, 0.10], [0.029, 0.10, 0.15, 0.086], [0.1, 0.094, 0, 0]]
  ];
  letters.forEach((letter, i) => {
    const start = tx + 0.458 - i * 0.245;
    for (const [x1, y1, x2, y2] of letter) {
      p.tube([start - x1, 1.64 + y1, signZ], [start - x2, 1.64 + y2, signZ], 0.031, '#a63c32', 6);
    }
  });
  // A gold slanting border frames the pale ДК on the return face.
  p.box(signX, tz, 1.636, 0.015, 0.7, 0.16, '#4e625f');
  for (const z of [-0.32, -0.205, 0.235]) {
    p.tube([signX - 0.012, 1.646, tz + z],
      [signX - 0.012, 1.785, tz + z + 0.078], 0.045, '#d0a857', 4);
  }
  const dk = [
    [0.005, 0.035, 0.036, 0.158], [0.036, 0.158, 0.096, 0.158], [0.096, 0.158, 0.096, 0.035],
    [-0.007, 0.035, 0.112, 0.035], [-0.007, 0.035, -0.007, 0], [0.112, 0.035, 0.112, 0],
    [0.144, 0.014, 0.144, 0.158], [0.144, 0.085, 0.222, 0.158], [0.144, 0.085, 0.223, 0.014]
  ];
  for (const [x1, y1, x2, y2] of dk) {
    p.tube([signX - 0.022, 1.642 + y1, tz + 0.15 - x1],
      [signX - 0.022, 1.642 + y2, tz + 0.15 - x2], 0.024, '#f2dba8', 5);
  }
  return p;
}
