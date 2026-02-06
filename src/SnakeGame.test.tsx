import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SnakeGame from './SnakeGame';

// Clean persisted state between tests.
beforeEach(() => {
  localStorage.clear();
});

// Component-level behavior tests for the UI.
describe('SnakeGame', () => {
  it('renders header and subtitle', () => {
    render(<SnakeGame />);
    expect(screen.getByText(/Snake Game/i)).toBeInTheDocument();
    // Subtitle text varies based on touch device detection
    const subtitle = screen.getByText(/Navigate, eat, and grow/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('shows initial stats', () => {
    render(<SnakeGame />);
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
  });

  it('toggles pause and resume', () => {
    render(<SnakeGame />);
    fireEvent.click(screen.getByRole('button', { name: /Pause/i }));
    expect(screen.getByText(/Paused/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Resume/i }));
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
  });

  it('opens and closes help panel', () => {
    render(<SnakeGame />);
    fireEvent.click(screen.getByRole('button', { name: /Help/i }));
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Close instructions/i));
    expect(screen.queryByText(/How to Play/i)).not.toBeInTheDocument();
  });

  it('changes difficulty selection', () => {
    render(<SnakeGame />);
    const select = screen.getByLabelText(/Difficulty/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'fast' } });
    expect(select.value).toBe('fast');
  });

  it('changes board size selection', () => {
    render(<SnakeGame />);
    const select = screen.getByLabelText(/Board Size/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'large' } });
    expect(select.value).toBe('large');
  });
});
