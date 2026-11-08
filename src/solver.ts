/** One square of the board; `value` is 1-9, or 0 when the cell is empty. */
export interface Cell {
  value: number;
  /** The digits that can legally go in this cell; empty for a filled cell. */
  candidates: number[];
}

export type Grid = Cell[];

function gridFromValues(values: number[]): Grid {
  return values.map((value) => ({ value, candidates: [] }));
}

/** Returns a deep copy: the cells themselves are copied, not shared. */
function cloneGrid(g: Grid): Grid {
  return g.map((c) => ({ ...c, candidates: c.candidates.slice() }));
}

/** A string that is equal for two grids exactly when every cell has the same value. */
function gridKey(g: Grid): string {
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

const STARTING_PUZZLE =  [
  4,0,0, 9,1,3, 0,6,0,
  9,0,0, 0,8,0, 0,4,2,
  0,0,0, 0,0,0, 1,9,7,
  0,0,0, 4,0,0, 6,8,0,
  0,0,0, 0,0,2, 0,3,0,
  7,0,4, 5,0,0, 0,0,0,
  0,0,1, 0,0,5, 0,2,0,
  3,4,0, 0,0,6, 0,5,0,
  2,0,0, 0,0,0, 4,0,3
];

/** The puzzle the app opens with. */
export function startingGrid(): Grid {
  return gridFromValues(STARTING_PUZZLE);
}

/** Returns the 9 values of the given row (0-8); 0 marks an empty cell. */
export function existsInRow(g: Grid, row: number, num: number): boolean {
  return g.slice(row * SIZE, (row + 1) * SIZE).some((c) => c.value === num);
}

/** Returns true if `num` already appears in the given column (0-8). */
export function existsInColumn(g: Grid, col: number, num: number): boolean {
  return g.some((c, i) => i % SIZE === col && c.value === num);
}

/** True if another cell in row `rowNumber` (0-8), apart from column `cellNumber`, lists `candidateValue`. */
export function canRowPeersHold(grid: Grid, rowNumber: number, cellNumber: number, candidateValue: number): boolean {
  for (let col = 0; col < SIZE; col++) {
    const gridNumeber = rowNumber * SIZE + col;
    if (col !== cellNumber && grid[gridNumeber].candidates.includes(candidateValue)) {
      return true;
    }
  }
  return false;
}

/** True if another cell in column `cellNumber` (0-8), apart from row `rowNumber`, lists `candidateValue`. */
export function canColumnPeersHold(grid: Grid, rowNumber: number, colNumber: number, candidateValue: number): boolean {
  
  for (let row = 0; row < SIZE; row++) {
    const gridNumber = row * SIZE + colNumber;
    if (row !== rowNumber && grid[gridNumber].candidates.includes(candidateValue)) {
      return true;
    }
  }
  return false;
}

/** True if another cell in the box of cell (`rowNumber`, `cellNumber`) lists `candidateValue`. */
export function canBoxPeersHold(grid: Grid, rowNumber: number, cellNumber: number, candidateValue: number): boolean {
  const index = rowNumber * SIZE + cellNumber;
  const box = Math.floor(rowNumber / 3) * 3 + Math.floor(cellNumber / 3);
  return BOX_INDICES[box].some((i) => i !== index && grid[i].candidates.includes(candidateValue));
}

/**
 * Returns true only when the row peers, column peers and box peers each still have at least one
 * other cell that can hold `candidateValue`. False means this cell is the only place for the digit
 * in its row, column or box. `rowNumber` and `cellNumber` are 0-8 (cellNumber = column).
 */
// export function canOtherCellsHold(grid: Grid, rowNumber: number, cellNumber: number, candidateValue: number): boolean {
//   return (
//     canRowPeersHold(grid, rowNumber, cellNumber, candidateValue) &&
//     canColumnPeersHold(grid, rowNumber, cellNumber, candidateValue) &&
//     canBoxPeersHold(grid, rowNumber, cellNumber, candidateValue)
//   );
// }

/**
 * Fills, in place, every empty cell of `box` (0-8) that has exactly one candidate left.
 * Each empty cell's candidates drop any digit already in its box, row or column.
 */
function solveCell(grid: Grid, box: number): void {
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
 * Fills, in place, every empty cell of column `col` (0-8) that has exactly one candidate left.
 * Each empty cell's candidates drop any digit already in its column or row.
 */
function solveInsideColumn(grid: Grid, col: number): void {
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

    // Hidden single: a candidate that no other cell in this column can hold must go here.
    if (suitable.length > 1) {
      const onlyHere = suitable.filter((v) => !canColumnPeersHold(grid, row, col, v));
      if (onlyHere.length === 1) {
        grid[cell].candidates = onlyHere; // the only suitable candidate
      }
    }

    const remaining = grid[cell].candidates;
    if (remaining.length === 1) {
      grid[cell].value = remaining[0]; // all other candidates are ruled out
      grid[cell].candidates = [];
    }
  }
}

/**
 * Fills, in place, every empty cell of row `row` (0-8) that has exactly one candidate left.
 * Each empty cell's candidates drop any digit already in its row or column.
 */
function solveInsideRow(grid: Grid, row: number): void {
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

    // Hidden single: a candidate that no other cell in this row can hold must go here.
    if (suitable.length > 1) {
      const onlyHere = suitable.filter((v) => !canRowPeersHold(grid, row, col, v));
      if (onlyHere.length === 1) {
        grid[cell].candidates = onlyHere; // the only suitable candidate
      }
    }

    const remaining = grid[cell].candidates;
    if (remaining.length === 1) {
      grid[cell].value = remaining[0]; // all other candidates are ruled out
      grid[cell].candidates = [];
    }
  }
}

/** Repeats solveCell on `box`, in place, until no more empty cells in it can be filled. */
function solveInsideBox(grid: Grid, box: number): void {
  let before = gridKey(grid);

  solveCell(grid, box);

  while (before !== gridKey(grid)) {
    before = gridKey(grid);
    solveCell(grid, box);
  }
}

/**
 * Returns a solved copy of the grid (as far as the row, column and box rules can take it) and how many
 * cells each iteration filled. Cells left empty keep their remaining candidates.
 */
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
  return { grid: g, filledPerIteration };
}

/**
 * Returns true when no row, column or box holds the same digit twice.
 * Empty cells (0) are ignored, so an unfinished grid can still be valid.
 */
export function isValidGrid(g: Grid): boolean {
  const units: number[][] = [];
  for (let k = 0; k < SIZE; k++) {
    units.push(Array.from({ length: SIZE }, (_, n) => k * SIZE + n)); // row k
    units.push(Array.from({ length: SIZE }, (_, n) => n * SIZE + k)); // column k
    units.push(BOX_INDICES[k]); // box k
  }
  return units.every((unit) => {
    const seen = new Set<number>();
    return unit.every((i) => {
      const value = g[i].value;
      if (value === 0) return true;
      if (seen.has(value)) return false; // duplicate in this row, column or box
      seen.add(value);
      return true;
    });
  });
}
