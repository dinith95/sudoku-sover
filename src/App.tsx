import { KeyboardEvent, useRef, useState } from 'react';
import './App.scss';
import {
  BOX_INDICES,
  CELLS,
  Grid,
  SIZE,
  conflictCount,
  emptyGrid,
  hasConflict,
  solveWithStats,
  startingGrid,
} from './solver';

const HINT = 'Enter the numbers you know, then press Solve.';
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Where a cell's value came from: the starting puzzle, the user, or the solver. */
type Source = 'given' | 'entered' | 'solved';

/** What the solve log shows about the last run. */
interface SolveRun {
  solved: boolean;
  at: string;
  ms: number;
  filledPerIteration: number[];
}

const formatMs = (ms: number) => (ms < 10 ? ms.toFixed(2) : ms.toFixed(1));

const boxOf = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % SIZE) / 3);

function cellClass(i: number, source: Source, selected: number): string {
  const classes = ['cell', source];
  if (i === selected) classes.push('selected');
  else if (
    selected >= 0 &&
    (Math.floor(i / SIZE) === Math.floor(selected / SIZE) ||
      i % SIZE === selected % SIZE ||
      boxOf(i) === boxOf(selected))
  ) {
    classes.push('peer'); // same row, column or box as the selected cell
  }
  return classes.join(' ');
}

const BackspaceIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <path d="M18 9l-6 6" />
    <path d="M12 9l6 6" />
  </svg>
);

function SolveLog({ run }: { run: SolveRun }) {
  const iterations = run.filledPerIteration;
  const total = iterations.reduce((a, b) => a + b, 0);
  const most = Math.max(1, ...iterations);
  return (
    <div className="log-body">
      <div className="log-summary">
        <p className="log-result">
          <span className={`dot${run.solved ? '' : ' stuck'}`} aria-hidden="true" />
          <strong>{run.solved ? 'Solved' : 'Stuck'}</strong>
          <span>Last run · {run.at}</span>
        </p>
        <dl className="log-stats">
          <div>
            <dt>Execution time</dt>
            <dd>{formatMs(run.ms)}<small> ms</small></dd>
          </div>
          <div>
            <dt>Iterations</dt>
            <dd>{iterations.length}</dd>
          </div>
          <div>
            <dt>Cells filled</dt>
            <dd className="filled">{total}</dd>
          </div>
        </dl>
      </div>

      <div className="log-iterations">
        <h3>Cells filled per iteration</h3>
        <ol>
          {iterations.map((filled, n) => (
            <li key={n}>
              <span className="iter">Iteration {n + 1}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${(filled / most) * 100}%` }} />
              </span>
              <span className="count">{filled}</span>
            </li>
          ))}
        </ol>
        <p className="log-note">Each iteration sweeps rows, then columns, then boxes.</p>
      </div>
    </div>
  );
}

function App() {
  const [grid, setGrid] = useState<Grid>(startingGrid);
  const [sources, setSources] = useState<Source[]>(() => grid.map(() => 'given'));
  const [message, setMessage] = useState(HINT);
  const [selected, setSelected] = useState(-1);
  const [lastRun, setLastRun] = useState<SolveRun | null>(null);
  const cellRefs = useRef<(HTMLInputElement | null)[]>([]);

  const empty = grid.filter((c) => c.value === 0).length;
  const conflicts = conflictCount(grid);

  const setCell = (i: number, digit: number) => {
    setGrid((prev) => {
      const next = prev.slice();
      next[i] = { ...prev[i], value: digit };
      return next;
    });
    setSources((prev) => {
      const next = prev.slice();
      next[i] = 'entered';
      return next;
    });
    setMessage(HINT);
  };

  const handleChange = (i: number, raw: string) => {
    setCell(i, parseInt(raw.replace(/[^1-9]/g, '').slice(-1), 10) || 0);
  };

  // Number pad: fill the selected cell, then hand focus back to it so arrow keys keep working.
  const handlePad = (digit: number) => {
    if (selected < 0) {
      setMessage('Select a cell first.');
      return;
    }
    setCell(selected, digit);
    cellRefs.current[selected]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    let next = -1;
    if (e.key === 'ArrowUp' && r > 0) next = i - SIZE;
    else if (e.key === 'ArrowDown' && r < SIZE - 1) next = i + SIZE;
    else if (e.key === 'ArrowLeft' && c > 0) next = i - 1;
    else if (e.key === 'ArrowRight' && c < SIZE - 1) next = i + 1;
    if (e.key.startsWith('Arrow')) e.preventDefault();
    if (next >= 0) cellRefs.current[next]?.focus();
  };

  const handleSolve = () => {
    if (hasConflict(grid)) {
      setMessage('Two numbers clash in a row, column or box.');
      return;
    }
    const start = performance.now();
    const { grid: result, filledPerIteration } = solveWithStats(grid);
    const ms = performance.now() - start;
    const solved = !result.some((c) => c.value === 0);
    setSources(sources.map((s, i) => (grid[i].value === 0 && result[i].value !== 0 ? 'solved' : s)));
    setGrid(result);
    setMessage(solved ? 'Solved.' : 'Got stuck — some cells are still empty.');
    setLastRun({ solved, at: new Date().toLocaleTimeString(), ms, filledPerIteration });
  };

  const handleReset = () => {
    setGrid(emptyGrid());
    setSources(new Array(CELLS).fill('entered'));
    setSelected(-1);
    setMessage(HINT);
  };

  return (
    <main className="app">
      <header className="top">
        <div>
          <h1>Sudoku</h1>
          <p className="message" aria-live="polite">{message}</p>
        </div>
        <p className={`status${conflicts ? ' clash' : ''}`}>
          <span className="dot" aria-hidden="true" />
          {empty} empty · {conflicts} {conflicts === 1 ? 'conflict' : 'conflicts'}
        </p>
      </header>

      <div className="layout">
        <section className="board" aria-label="Puzzle grid">
          <div className="grid">
            {Object.values(BOX_INDICES).map((cells, b) => (
              <div className="box" key={b}>
                {cells.map((i) => {
                  const cands = grid[i].candidates;
                  const hint = cands.length === 1 ? 'single' : cands.length === 2 ? 'pair' : '';
                  const where = `Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}`;
                  return (
                    <div className="cell-wrap" key={i}>
                      <input
                        ref={(el) => { cellRefs.current[i] = el; }}
                        className={cellClass(i, sources[i], selected)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        autoComplete="off"
                        aria-label={hint ? `${where}, candidates ${cands.join(', ')}` : where}
                        value={grid[i].value ? String(grid[i].value) : ''}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={(e) => {
                          setSelected(i);
                          e.target.select();
                        }}
                      />
                      {hint && <span className={`cands ${hint}`} aria-hidden="true">{cands.join(' ')}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <ul className="legend">
            <li><span className="given">5</span>Given</li>
            <li><span className="entered">5</span>Your entry</li>
            <li><span className="solved">5</span>Filled by solver</li>
          </ul>
        </section>

        <aside className="side">
          <div className="panel-group">
            <h2 className="label">Number</h2>
            <div className="pad">
              {DIGITS.map((d) => {
                const left = SIZE - grid.filter((c) => c.value === d).length;
                return (
                  <button key={d} type="button" className={left === 0 ? 'done' : undefined}
                    aria-label={`Enter ${d}`} onClick={() => handlePad(d)}>
                    {d}
                    <span className="left">{left} left</span>
                  </button>
                );
              })}
              <button type="button" className="clear" aria-label="Clear cell" onClick={() => handlePad(0)}>
                <BackspaceIcon />
                <span className="clear-text">Clear cell</span>
              </button>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="primary" onClick={handleSolve}>Solve</button>
            <button type="button" onClick={handleReset}>Reset board</button>
          </div>

          <div className="keys">
            <h2 className="label">Keyboard</h2>
            <p><span>Move between cells</span><kbd>← ↑ → ↓</kbd></p>
            <p><span>Enter a number</span><kbd>1 – 9</kbd></p>
            <p><span>Clear a cell</span><kbd>Backspace</kbd></p>
          </div>
        </aside>
      </div>

      <section className="log" aria-labelledby="log-title">
        <div className="log-head">
          <h2 id="log-title" className="label">Solve log</h2>
          {lastRun && (
            <button type="button" className="clear-log" onClick={() => setLastRun(null)}>Clear log</button>
          )}
        </div>
        {lastRun ? (
          <SolveLog run={lastRun} />
        ) : (
          <p className="log-empty">Press Solve to see the execution time and iterations.</p>
        )}
      </section>
    </main>
  );
}

export default App;
