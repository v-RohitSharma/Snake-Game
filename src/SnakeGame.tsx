import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import './SnakeGame.css';
import { CLASSIC_GRID, LARGE_GRID, keyOf, randPointExcluding, stepSnake } from './game';
import type { Point, Direction } from './game';

const SPEED_LEVELS = {
  slow: 300,
  normal: 200,
  fast: 120,
};

const BOARD_PRESETS = {
  classic: { grid: CLASSIC_GRID, cellSize: 60 },
  large: { grid: LARGE_GRID, cellSize: 50 },
} as const;

type BoardPreset = keyof typeof BOARD_PRESETS;

const getHighScore = (): number => {
  try {
    return parseInt(localStorage.getItem('snakeGameHighScore') || '0', 10);
  } catch {
    return 0;
  }
};

const setHighScore = (score: number): void => {
  try {
    localStorage.setItem('snakeGameHighScore', String(score));
  } catch {
    // Fallback if localStorage is not available
  }
};

const INITIAL_SNAKE: Point[] = [[0, 2], [0, 1], [0, 0]];

const KEY_MAP: Record<string, Direction> = {
  'ArrowRight': 'RIGHT',
  'ArrowLeft': 'LEFT',
  'ArrowUp': 'UP',
  'ArrowDown': 'DOWN',
};

const OPPOSITES: Record<Direction, Direction> = {
  'RIGHT': 'LEFT',
  'LEFT': 'RIGHT',
  'UP': 'DOWN',
  'DOWN': 'UP',
};

const SnakeGame: React.FC = () => {
  const [boardPreset, setBoardPreset] = useState<BoardPreset>('classic');
  const gridSize = BOARD_PRESETS[boardPreset].grid;
  const baseCellSize = BOARD_PRESETS[boardPreset].cellSize;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardSlotRef = useRef<HTMLDivElement | null>(null);
  const [{ boardSize, cellSize }, setBoardMetrics] = useState<{ boardSize: number; cellSize: number }>(() => ({
    boardSize: gridSize * baseCellSize,
    cellSize: baseCellSize,
  }));

  const [snake, setSnake] = useState<Point[]>(() => INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(() => {
    const s = new Set<string>(INITIAL_SNAKE.map(keyOf));
    return randPointExcluding(s, gridSize);
  });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore());
  const [speedLabel, setSpeedLabel] = useState<keyof typeof SPEED_LEVELS>('normal');
  const [showInstructions, setShowInstructions] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const runningRef = useRef(true);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const updateBoardMetrics = () => {
      const slotWidth = boardSlotRef.current?.clientWidth ?? window.innerWidth;
      const maxBoardSize = Math.min(slotWidth, window.innerHeight * 0.72);
      const targetSize = Math.min(gridSize * baseCellSize, maxBoardSize);
      const nextCellSize = Math.max(24, Math.floor(targetSize / gridSize));
      const nextBoardSize = nextCellSize * gridSize;
      setBoardMetrics({ boardSize: nextBoardSize, cellSize: nextCellSize });
    };

    updateBoardMetrics();
    // Re-calculate after layout to ensure accurate dimensions
    const layoutTimer = requestAnimationFrame(() => {
      requestAnimationFrame(updateBoardMetrics);
    });
    
    window.addEventListener('resize', updateBoardMetrics);
    return () => {
      cancelAnimationFrame(layoutTimer);
      window.removeEventListener('resize', updateBoardMetrics);
    };
  }, [gridSize, baseCellSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.setProperty('--grid-size', String(gridSize));
    container.style.setProperty('--cell-size', `${cellSize}px`);
    container.style.setProperty('--board-size', `${boardSize}px`);
  }, [gridSize, cellSize, boardSize]);

  // keep runningRef in sync with state and reset lastRef when resuming
  useEffect(() => {
    runningRef.current = running;
    if (running) lastRef.current = null;
  }, [running]);

  // requestAnimationFrame-based loop with accumulated time for smoothness
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const msPerTickRef = useRef<number>(SPEED_LEVELS.normal);

  useEffect(() => {
    msPerTickRef.current = SPEED_LEVELS[speedLabel];
  }, [speedLabel]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const nextDir = KEY_MAP[e.key];
    if (!nextDir) return;
    e.preventDefault();
    // Prevent snake from reversing directly into itself
    if (OPPOSITES[nextDir] !== directionRef.current) {
      directionRef.current = nextDir;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameOver) return;
    let acc = 0;

    const loop = (t: number) => {
      if (!runningRef.current) {
        lastRef.current = t;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (lastRef.current == null) lastRef.current = t;
      acc += t - lastRef.current;
      lastRef.current = t;

      let msPerTick = msPerTickRef.current;
      while (acc >= msPerTick) {
        // perform a game tick
        setSnake(prev => {
          const { snake: next, ate, collision } = stepSnake(prev, directionRef.current, food, gridSize);
          if (collision) {
            setGameOver(true);
            return prev;
          }
          if (ate) {
            setScore(s => s + 1);
            const sset = new Set(next.map(keyOf));
            setFood(randPointExcluding(sset, gridSize));
            // Increase speed by 5% per food eaten (min 40ms)
            msPerTickRef.current = Math.max(40, msPerTickRef.current * 0.95);
          }
          return next;
        });
        // Update msPerTick after potential speed increase and decrement
        msPerTick = msPerTickRef.current;
        acc -= msPerTick;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [food, gameOver]);

  const reset = useCallback(() => {
    const initial: Point[] = INITIAL_SNAKE;
    directionRef.current = 'RIGHT';
    setSnake(initial);
    setGameOver(false);
    setScore(0);
    msPerTickRef.current = SPEED_LEVELS.normal;
    const s = new Set<string>(initial.map(keyOf));
    setFood(randPointExcluding(s, gridSize));
  }, [gridSize]);

  useEffect(() => {
    setRunning(true);
    reset();
  }, [gridSize, reset]);

  // Update high score when score increases and game ends
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      setHighScoreState(score);
    }
  }, [gameOver, score, highScore]);

  const snakeSet = new Set(snake.map(keyOf));
  const headKey = keyOf(snake[0]);
  const foodKey = keyOf(food);
  const totalCells = gridSize * gridSize;

  return (
    <div className="game-container" ref={containerRef}>
      <div className="game-header">
        <h1 className="game-title">🐍 Snake Game</h1>
        <p className="game-subtitle">Navigate, eat, and grow • Arrow keys to move</p>
      </div>

      {showInstructions && (
        <div className="instructions-panel">
          <div className="instructions-header">
            <h2>How to Play</h2>
            <button className="close-btn" onClick={() => setShowInstructions(false)} aria-label="Close instructions">✕</button>
          </div>
          <div className="instructions-content">
            <div className="instruction-item">
              <strong>Controls:</strong> Use arrow keys (↑ ↓ ← →) to navigate
            </div>
            <div className="instruction-item">
              <strong>Objective:</strong> Eat the red food to grow and gain points
            </div>
            <div className="instruction-item">
              <strong>Challenge:</strong> Don't hit yourself or the walls! (Snake wraps around)
            </div>
            <div className="instruction-item">
              <strong>Speed:</strong> Game gets faster as you eat more food
            </div>
          </div>
        </div>
      )}

      <div className="board-slot" ref={boardSlotRef}>
        <div className="board" tabIndex={0}>
          {Array.from({ length: totalCells }, (_, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const key = `${row},${col}`;
            const isSnake = snakeSet.has(key);
            const isHead = key === headKey;
            const isFood = key === foodKey;
            const className = [
              'cell',
              isSnake && 'segment',
              isHead && 'head',
              isFood && 'food',
            ].filter(Boolean).join(' ');

            return <div key={key} className={className} />;
          })}
        </div>
      </div>

      <div className="game-stats">
        <div className="stat-card">
          <label>Score</label>
          <div className="stat-value">{score}</div>
        </div>
        <div className="stat-card">
          <label>Best</label>
          <div className="stat-value">{highScore}</div>
        </div>
        <div className="stat-card">
          <label>Length</label>
          <div className="stat-value">{snake.length}</div>
        </div>
        <div className="stat-card">
          <label>Level</label>
          <div className="stat-value">{speedLabel}</div>
        </div>
      </div>

      <div className="controls-section">
        <div className="speed-control">
          <label htmlFor="speed-select">Difficulty</label>
          <select id="speed-select" value={speedLabel} onChange={e => setSpeedLabel(e.target.value as keyof typeof SPEED_LEVELS)}>
            <option value="slow">🐢 Slow</option>
            <option value="normal">🐇 Normal</option>
            <option value="fast">⚡ Fast</option>
          </select>
        </div>
        <div className="speed-control">
          <label htmlFor="board-size">Board Size</label>
          <select id="board-size" value={boardPreset} onChange={e => setBoardPreset(e.target.value as BoardPreset)}>
            <option value="classic">Classic</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" onClick={() => setRunning(r => !r)}>
            {running ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setRunning(true); reset(); }}>🔄 New</button>
          <button className="btn btn-secondary" onClick={() => setShowInstructions(!showInstructions)}>❓ Help</button>
        </div>
      </div>

      <div className="game-status" data-status={gameOver ? 'game-over' : running ? 'running' : 'paused'}>
        {gameOver ? (
          <div className="status-message">GAME OVER! 💀</div>
        ) : running ? (
          <div className="status-message">🎮 In Progress</div>
        ) : (
          <div className="status-message">⏸️ Paused</div>
        )}
      </div>

      {gameOver && (
        <div className="game-over-panel">
          <p>Score: <strong>{score}</strong></p>
          {score > 0 && score === highScore && <p className="new-record">🏆 New High Score!</p>}
          <p className="game-tip">Click New to play again</p>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;
