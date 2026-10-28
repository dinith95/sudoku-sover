import { useState } from 'react';
import './App.scss';
import { CELLS, SIZE, emptyGrid, hasConflict, solve } from './solver';

const HINT = 'Enter the numbers you know, then press Solve.';

function cellClass(i: number, solved: boolean): string {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const classes = ['cell'];
  if (c === SIZE - 1) classes.push('edge-r');
  else if (c % 3 === 2) classes.push('box-r');
  if (r === SIZE - 1) classes.push('edge-b');
  else if (r % 3 === 2) classes.push('box-b');
  if (solved) classes.push('solved');
  return classes.join(' ');
}

function App() {
  const [grid, setGrid] = useState<number[]>(emptyGrid);
  const [solved, setSolved] = useState<boolean[]>(() => new Array(CELLS).fill(false));
  const [message, setMessage] = useState(HINT);

  const clearSolved = () => setSolved(new Array(CELLS).fill(false));

  const handleChange = (i: number, raw: string) => {
    const digit = parseInt(raw.replace(/[^1-9]/g, '').slice(-1), 10) || 0;
    setGrid((prev) => {
      const next = prev.slice();
      next[i] = digit;
      return next;
    });
    clearSolved();
    setMessage(HINT);
  };

  const handleSolve = () => {
    if (hasConflict(grid)) {
      setMessage('Two numbers clash in a row, column or box.');
      return;
    }
    const result = solve(grid);
    if (!result) {
      setMessage('No solution exists for this puzzle.');
      return;
    }
    setSolved(grid.map((v, i) => v === 0 && result[i] !== 0));
    setGrid(result);
    setMessage('Solved.');
  };

  const handleReset = () => {
    setGrid(emptyGrid());
    clearSolved();
    setMessage(HINT);
  };

  return (
    <main className="app">
      <header>
        <h1>Sudoku</h1>
        <p className="message" aria-live="polite">{message}</p>
      </header>
      <div className="grid">
        {grid.map((value, i) => (
          <input
            key={i}
            className={cellClass(i, solved[i])}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete="off"
            aria-label={`Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}`}
            value={value ? String(value) : ''}
            onChange={(e) => handleChange(i, e.target.value)}
          />
        ))}
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={handleSolve}>Solve</button>
        <button type="button" onClick={handleReset}>Reset</button>
      </div>
    </main>
  );
}

export default App;
