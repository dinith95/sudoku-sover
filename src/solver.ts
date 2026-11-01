/** One square of the board; `value` is 1-9, or 0 when the cell is empty. */
export interface Cell {
  value: number;
  /** The digits that can legally go in this cell; empty for a filled cell. */
  candidates: number[];
}

export type Grid = Cell[];

export function gridFromValues(values: number[]): Grid {
  return refreshCandidates(values.map((value) => ({ value, candidates: [] })));
}

/** Returns a deep copy: the cells themselves are copied, not shared. */
export function cloneGrid(g: Grid): Grid {
  return g.map((c) => ({ ...c, candidates: c.candidates.slice() }));
}

/** Returns a copy of the grid with every cell's candidates recomputed from the current values. */
export function refreshCandidates(g: Grid): Grid {
  return g.map((c, i) => ({ ...c, candidates: candidatesFor(g, i) }));
}

/** A string that is equal for two grids exactly when every cell has the same value. */
export function gridKey(g: Grid): string {
  return g.map((c) => c.value).join();
}

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
  return gridFromValues(new Array(CELLS).fill(0));
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
  const grid = gridFromValues(SAMPLE_SOLUTION.split('').map(Number));
  for (let b = 0; b < SIZE; b++) {
    grid[BOX_INDICES[b][0]].value = 0;
    grid[BOX_INDICES[b][4]].value = 0;
  }
  return refreshCandidates(grid);
}

function fits(g: Grid, i: number, v: number): boolean {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  for (let k = 0; k < SIZE; k++) {
    const a = r * SIZE + k;
    const b = k * SIZE + c;
    if (a !== i && g[a].value === v) return false;
    if (b !== i && g[b].value === v) return false;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const j = (br + y) * SIZE + bc + x;
      if (j !== i && g[j].value === v) return false;
    }
  }
  return true;
}

/** The digits that can legally go in cell `i`; empty for a filled cell. */
export function candidatesFor(g: Grid, i: number): number[] {
  if (g[i].value !== 0) return [];
  const out: number[] = [];
  for (let v = 1; v <= SIZE; v++) if (fits(g, i, v)) out.push(v);
  return out;
}

/** Returns the 9 values of the given row (0-8); 0 marks an empty cell. */
export function existsInRow(g: Grid, row: number, num: number): boolean {
  return g.slice(row * SIZE, (row + 1) * SIZE).some((c) => c.value === num);
}

/** Returns true if `num` already appears in the given column (0-8). */
export function existsInColumn(g: Grid, col: number, num: number): boolean {
  return g.some((c, i) => i % SIZE === col && c.value === num);
}

/**
 * Returns the box number (0-8) with the fewest empty cells, skipping boxes that are already full;
 * ties go to the lowest box. Returns -1 if every box is full.
 */
export function findMostOccupiedBox(grid: Grid): number {
  let best = -1;
  let fewestZeros = SIZE + 1;
  for (let b = 0; b < SIZE; b++) {
    const zeros = BOX_INDICES[b].filter((i) => grid[i].value === 0).length;
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
export function solveCell(grid: Grid, box: number){
 
  BOX_INDICES[box].forEach((cell) => {

    if (grid[cell].value !== 0) {
      grid[cell].candidates = [];
      return; // ignore existing values
    }

    const row = Math.floor(cell / SIZE);
    const col = cell % SIZE;
    const boxValues = BOX_INDICES[box].map((i) => grid[i].value);
    // Drop candidates already in the box, the row or the column.
    const suitable = grid[cell].candidates.filter(
      (v) => !boxValues.includes(v) && !existsInRow(grid, row, v) && !existsInColumn(grid, col, v),
    );
    grid[cell].candidates = suitable;

    if (suitable.length === 1) {
      grid[cell].value = suitable[0]; // all other candidates are not suitable
      grid[cell].candidates = [];
    }
  });
}

/**
 * Fills, in place, every empty cell of column `col` (0-8) that has exactly one suitable value.
 * The candidates are the values missing from the column; a candidate is suitable for a cell when it is not
 * already in the cell's row, and it is placed only if every other candidate is not suitable there.
 */
export function solveInsideColumn(grid: Grid, col: number): void {
  for (let row = 0; row < SIZE; row++) {
    const cell = row * SIZE + col;

    if (grid[cell].value !== 0) {
      grid[cell].candidates = [];
      continue; // ignore existing values
    }

    // Drop candidates already in the column (placed earlier in this sweep) or in the row.
    const suitable = grid[cell].candidates.filter(
      (v) => !existsInColumn(grid, col, v) && !existsInRow(grid, row, v),
    );
    
    grid[cell].candidates = suitable;

    if (suitable.length === 1) {
      grid[cell].value = suitable[0]; // all other candidates exist in the row
      grid[cell].candidates = [];
    }
  }
}

/**
 * Fills, in place, every empty cell of row `row` (0-8) that has exactly one suitable value.
 * The candidates are the values missing from the row; a candidate is suitable for a cell when it is not
 * already in the cell's column, and it is placed only if every other candidate is not suitable there.
 */
export function solveInsideRow(grid: Grid, row: number): void {
  for (let col = 0; col < SIZE; col++) {
    const cell = row * SIZE + col;

    if (grid[cell].value !== 0) {
      grid[cell].candidates = [];
      continue; // ignore existing values
    }

    // Drop candidates already in the row (placed earlier in this sweep) or in the column.
    const suitable = grid[cell].candidates.filter(
      (v) => !existsInRow(grid, row, v) && !existsInColumn(grid, col, v),
    );

    grid[cell].candidates = suitable;

    if (suitable.length === 1) {
      grid[cell].value = suitable[0]; // all other candidates exist in the column
      grid[cell].candidates = [];
    }
  }
}

/** Repeats solveCell on `box` until no more empty cells in it can be filled; returns a copy of the grid. */
export function solveInsideBox(grid: Grid, box: number){
  let before = gridKey(grid);

  solveCell(grid, box);

  while (before !== gridKey(grid)) {
    before = gridKey(grid);
    solveCell(grid, box);
  }
}

export function hasConflict(g: Grid): boolean {
  return g.some((c, i) => c.value !== 0 && !fits(g, i, c.value));
}

/** Returns how many filled cells clash with another cell in their row, column or box. */
export function conflictCount(g: Grid): number {
  return g.filter((c, i) => c.value !== 0 && !fits(g, i, c.value)).length;
}

/** Returns a solved copy of the grid, or null if there is no solution. */
export function solve(given: Grid): Grid | null {
  return solveWithStats(given).grid;
}

/** Like `solve`, but also returns how many cells each iteration filled. */
export function solveWithStats(given: Grid): { grid: Grid; filledPerIteration: number[] } {
  const filledPerIteration: number[] = [];
  const empties = (grid: Grid) => grid.filter((c) => c.value === 0).length;
  let g = cloneGrid(given);

  // Reset the candidates before solving. An empty cell (value 0) could still be any digit, so it starts
  // with all of 1-9; solveInsideRow and solveInsideColumn then remove the digits that clash.
  // A filled cell has nothing left to decide, so its candidates are empty.
  const allDigits = Array.from({ length: SIZE }, (_, k) => k + 1);
  g.forEach((cell) => {
    const isEmpty = cell.value === 0;
    cell.candidates = isEmpty ? allDigits.slice() : [];
  });

  // Sweep every row until the grid is full or a whole sweep fills no new cell.
  let before: string;
  do {
    before = gridKey(g);
    const emptyBefore = empties(g);

    for (let row = 0; row < SIZE; row++) {
      solveInsideRow(g, row);
    }

    for (let col = 0; col < SIZE; col++) {
      solveInsideColumn(g, col);
    }
    for (let box = 0; box < SIZE; box++) {
      solveInsideBox(g, box);
    }
    filledPerIteration.push(emptyBefore - empties(g));
  } while (g.some((c) => c.value === 0) && gridKey(g) !== before);
  return { grid: refreshCandidates(g), filledPerIteration };
}
