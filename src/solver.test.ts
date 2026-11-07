import {
  BOX_INDICES,
  CELLS,
  SIZE,
  emptyGrid,
  existsInColumn,
  existsInRow,
} from './solver';

// Row 0 = 1..9, column 0 = 1..9 (cell 0 shared), everything else empty.
function sampleGrid() {
  const g = emptyGrid();
  for (let k = 0; k < SIZE; k++) {
    g[k].value = k + 1; // row 0
    g[k * SIZE].value = k + 1; // column 0
  }
  g[4 * SIZE + 7].value = 6; // row 4, column 7
  return g;
}

describe('existsInRow', () => {
  const g = sampleGrid();

  test('finds a number that is in the row', () => {
    expect(existsInRow(g, 0, 1)).toBe(true);
    expect(existsInRow(g, 0, 9)).toBe(true);
    expect(existsInRow(g, 4, 6)).toBe(true); // placed at column 7
  });

  test('does not find a number that is not in the row', () => {
    expect(existsInRow(g, 4, 7)).toBe(false);
    expect(existsInRow(g, 8, 2)).toBe(false);
  });

  test('only looks at the given row, not neighbours', () => {
    expect(existsInRow(g, 1, 9)).toBe(false); // 9 is in row 0 and column 0 (row 8)
    expect(existsInRow(g, 3, 6)).toBe(false); // 6 is in row 4, not row 3
    expect(existsInRow(g, 5, 6)).toBe(true); // 6 is in column 0 at row 5
  });

  test('0 matches an empty cell, and a full row has none', () => {
    expect(existsInRow(g, 4, 0)).toBe(true);
    expect(existsInRow(g, 0, 0)).toBe(false);
  });

  test('last row is read correctly (no off-by-one)', () => {
    expect(existsInRow(g, 8, 9)).toBe(true); // column 0 of row 8
    expect(existsInRow(g, 8, 1)).toBe(false);
  });
});

describe('existsInColumn', () => {
  const g = sampleGrid();

  test('finds a number that is in the column', () => {
    expect(existsInColumn(g, 0, 1)).toBe(true);
    expect(existsInColumn(g, 0, 9)).toBe(true);
    expect(existsInColumn(g, 7, 6)).toBe(true); // placed at row 4
  });

  test('does not find a number that is not in the column', () => {
    expect(existsInColumn(g, 7, 7)).toBe(false);
    expect(existsInColumn(g, 8, 2)).toBe(false);
  });

  test('only looks at the given column, not neighbours', () => {
    expect(existsInColumn(g, 1, 9)).toBe(false); // 9 is in row 0 at column 8
    expect(existsInColumn(g, 6, 6)).toBe(false); // 6 is in column 7, not 6
    expect(existsInColumn(g, 5, 6)).toBe(true); // 6 is in row 0 at column 5
  });

  test('0 matches an empty cell, and a full column has none', () => {
    expect(existsInColumn(g, 7, 0)).toBe(true);
    expect(existsInColumn(g, 0, 0)).toBe(false);
  });

  test('last column is read correctly (no off-by-one)', () => {
    expect(existsInColumn(g, 8, 9)).toBe(true); // row 0 of column 8
    expect(existsInColumn(g, 8, 1)).toBe(false);
  });
});

describe('BOX_INDICES', () => {
  test('has 9 boxes with 9 cells each', () => {
    expect(Object.keys(BOX_INDICES)).toHaveLength(SIZE);
    for (let b = 0; b < SIZE; b++) {
      expect(BOX_INDICES[b]).toHaveLength(SIZE);
    }
  });

  test('covers every cell 0-80 exactly once', () => {
    const all = Object.values(BOX_INDICES).flat().sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: CELLS }, (_, i) => i));
  });

  test.each([
    [0, [0, 1, 2, 9, 10, 11, 18, 19, 20]],
    [1, [3, 4, 5, 12, 13, 14, 21, 22, 23]],
    [2, [6, 7, 8, 15, 16, 17, 24, 25, 26]],
    [3, [27, 28, 29, 36, 37, 38, 45, 46, 47]],
    [4, [30, 31, 32, 39, 40, 41, 48, 49, 50]],
    [5, [33, 34, 35, 42, 43, 44, 51, 52, 53]],
    [6, [54, 55, 56, 63, 64, 65, 72, 73, 74]],
    [7, [57, 58, 59, 66, 67, 68, 75, 76, 77]],
    [8, [60, 61, 62, 69, 70, 71, 78, 79, 80]],
  ])('box %i contains the expected indices', (box, expected) => {
    expect(BOX_INDICES[box]).toEqual(expected);
  });

  test('each box sits inside one 3x3 block of the grid', () => {
    for (let b = 0; b < SIZE; b++) {
      const rows = new Set(BOX_INDICES[b].map((i) => Math.floor(i / SIZE)));
      const cols = new Set(BOX_INDICES[b].map((i) => i % SIZE));
      expect(rows.size).toBe(3);
      expect(cols.size).toBe(3);
      expect(Math.max(...Array.from(rows)) - Math.min(...Array.from(rows))).toBe(2);
      expect(Math.max(...Array.from(cols)) - Math.min(...Array.from(cols))).toBe(2);
    }
  });
});
