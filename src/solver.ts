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

export function hasConflict(g: Grid): boolean {
  return g.some((v, i) => v !== 0 && !fits(g, i, v));
}

// Backtracking, always filling the cell with the fewest candidates first.
function search(g: Grid): boolean {
  let best = -1;
  let bestOpts: number[] | null = null;
  for (let i = 0; i < CELLS; i++) {
    if (g[i]) continue;
    const opts: number[] = [];
    for (let v = 1; v <= SIZE; v++) if (fits(g, i, v)) opts.push(v);
    if (opts.length === 0) return false;
    if (!bestOpts || opts.length < bestOpts.length) {
      best = i;
      bestOpts = opts;
    }
    if (opts.length === 1) break;
  }
  if (!bestOpts) return true;
  for (const v of bestOpts) {
    g[best] = v;
    if (search(g)) return true;
  }
  g[best] = 0;
  return false;
}

/** Returns a solved copy of the grid, or null if there is no solution. */
export function solve(given: Grid): Grid | null {
  const g = given.slice();
  return search(g) ? g : null;
}
