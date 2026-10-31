export type Grid = number[];

export const SIZE = 9;
export const CELLS = SIZE * SIZE;

/** Maps box number (0-8, row-major) to the 9 flat cell indices it contains. */
export const BOX_INDICES: Record<number, number[]> = (() => {
  const boxes: Record<number, number[]> = {};
  for (let b = 0; b < SIZE; b++) {
    let i = Math.floor(b / 3) * 27 + (b % 3) * 3; // first cell of the box
    boxes[b] = [];
    for (let n = 0; n < SIZE; n++) {
      boxes[b].push(i);
      if (n % 3 === 2) {
        // 3rd cell of a box row: move past it (1) and skip the other 6 cells
        // of the grid row, landing on the first cell of the next box row
        i += 1 + 6;
      } else {
        // 1st or 2nd cell: just move to the neighbour on the right
        i += 1;
      }
    }
  }
  return boxes;
})();

export function emptyGrid(): Grid {
  return new Array(CELLS).fill(0);
}

const SAMPLE_SOLUTION =
  '534678912' +
  '672195348' +
  '198342567' +
  '859761423' +
  '426853791' +
  '713924856' +
  '961537284' +
  '287419635' +
  '345286179';

/** A valid grid where every box is missing exactly 2 values: its top-left and centre cells are empty. */
export function twoMissingPerBoxGrid(): Grid {
  const grid = SAMPLE_SOLUTION.split('').map(Number);
  for (let b = 0; b < SIZE; b++) {
    grid[BOX_INDICES[b][0]] = 0;
    grid[BOX_INDICES[b][4]] = 0;
  }
  return grid;
}

function fits(g: Grid, i: number, v: number): boolean {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  for (let k = 0; k < SIZE; k++) {
    const a = r * SIZE + k;
    const b = k * SIZE + c;
    if (a !== i && g[a] === v) return false;
    if (b !== i && g[b] === v) return false;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const j = (br + y) * SIZE + bc + x;
      if (j !== i && g[j] === v) return false;
    }
  }
  return true;
}

/** Returns the 9 values of the given row (0-8); 0 marks an empty cell. */
export function existsInRow(g: Grid, row: number, num: number): boolean {
  return g.slice(row * SIZE, (row + 1) * SIZE).includes(num);
}

/** Returns true if `num` already appears in the given column (0-8). */
export function existsInColumn(g: Grid, col: number, num: number): boolean {
  return g.filter((_, i) => i % SIZE === col).includes(num);
}

/**
 * Returns the box number (0-8) with the fewest empty cells, skipping boxes that are already full;
 * ties go to the lowest box. Returns -1 if every box is full.
 */
export function findMostOccupiedBox(grid: Grid): number {
  let best = -1;
  let fewestZeros = SIZE + 1;
  for (let b = 0; b < SIZE; b++) {
    const zeros = BOX_INDICES[b].filter((i) => grid[i] === 0).length;
    if (zeros === 0){
      continue; // box is completely filled, nothing left to solve
    }
    if (zeros < fewestZeros) {
      fewestZeros = zeros;
      best = b;
    }
  }
  return best;
}

/**
 * Fills every empty cell of `box` (0-8) that has exactly one suitable value and returns a copy of the grid.
 * Existing box values are ignored; a missing value is suitable for a cell when it is not already in the
 * cell's row or column, and it is placed only if every other missing value is not suitable there.
 */
export function solveCell(grid: Grid, box: number): Grid {
  const g = grid.slice();
  BOX_INDICES[box].forEach((cell) => {
    if (g[cell] !== 0) return; // ignore existing values
    const row = Math.floor(cell / SIZE);
    const col = cell % SIZE;
    const boxValues = BOX_INDICES[box].map((i) => g[i]);
    const suitable: number[] = [];
    for (let v = 1; v <= SIZE; v++) {
      if (boxValues.includes(v)) continue; // only the missing values are candidates
      if (!existsInRow(g, row, v) && !existsInColumn(g, col, v)) suitable.push(v);
    }
    if (suitable.length === 1) {
      g[cell] = suitable[0]; // all other values are not suitable
    }
  });
  return g;
}

/** Repeats solveCell on `box` until no more empty cells in it can be filled; returns a copy of the grid. */
export function solveInsideBox(grid: Grid, box: number): Grid {
  let current = grid;
  let next = solveCell(current, box);
  while (next.join() !== current.join()) {
    current = next;
    next = solveCell(current, box);
  }
  return next;
}

export function hasConflict(g: Grid): boolean {
  return g.some((v, i) => v !== 0 && !fits(g, i, v));
}

// Backtracking, always filling the cell with the fewest candidates first.
// function search(g: Grid): boolean {
//   let best = -1;
//   let bestOpts: number[] | null = null;
//   for (let i = 0; i < CELLS; i++) {
//     if (g[i]) continue;
//     const opts: number[] = [];
//     for (let v = 1; v <= SIZE; v++) if (fits(g, i, v)) opts.push(v);
//     if (opts.length === 0) return false;
//     if (!bestOpts || opts.length < bestOpts.length) {
//       best = i;
//       bestOpts = opts;
//     }
//     if (opts.length === 1) break;
//   }
//   if (!bestOpts) return true;
//   for (const v of bestOpts) {
//     g[best] = v;
//     if (search(g)) return true;
//   }
//   g[best] = 0;
//   return false;
// }

/** Returns a solved copy of the grid, or null if there is no solution. */
export function solve(given: Grid): Grid | null {
  let g = given;
  for (let i = 0; i < 3; i++) {
    const box = findMostOccupiedBox(g);
    if (box === -1) break; // every box is full
    g = solveInsideBox(g, box);
  }
  return g;
}
