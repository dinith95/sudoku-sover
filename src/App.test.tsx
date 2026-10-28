import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const cell = (r: number, c: number) =>
  screen.getByLabelText(`Row ${r}, column ${c}`) as HTMLInputElement;

test('solves a puzzle and resets the board', () => {
  render(<App />);
  userEvent.type(cell(1, 1), '5');
  userEvent.click(screen.getByRole('button', { name: 'Solve' }));
  expect(screen.getByText('Solved.')).toBeInTheDocument();
  expect(cell(1, 1).value).toBe('5');
  expect(cell(9, 9).value).not.toBe('');

  userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(cell(1, 1).value).toBe('');
  expect(cell(9, 9).value).toBe('');
});

test('reports clashing numbers', () => {
  render(<App />);
  userEvent.type(cell(1, 1), '5');
  userEvent.type(cell(1, 2), '5');
  userEvent.click(screen.getByRole('button', { name: 'Solve' }));
  expect(screen.getByText(/clash/)).toBeInTheDocument();
});
