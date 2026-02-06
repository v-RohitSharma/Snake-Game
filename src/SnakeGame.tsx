import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import './SnakeGame.css';
import { CLASSIC_GRID, LARGE_GRID, keyOf, randPointExcluding, stepSnake } from './game';
import type { Point, Direction } from './game';

// Milliseconds per tick for each difficulty preset.
const SPEED_LEVELS = {
  slow: 300,
  normal: 200,
  fast: 120,
};

// Grid size and cell sizing options for the board.
const BOARD_PRESETS = {
  classic: { grid: CLASSIC_GRID, cellSize: 60 },
  large: { grid: LARGE_GRID, cellSize: 50 },
} as const;

type BoardPreset = keyof typeof BOARD_PRESETS;

// Local storage helpers for best score persistence.
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

// Starting snake body (head first).
const INITIAL_SNAKE: Point[] = [[0, 2], [0, 1], [0, 0]];

// Keyboard direction mapping.
const KEY_MAP: Record<string, Direction> = {
  'ArrowRight': 'RIGHT',
  'ArrowLeft': 'LEFT',
  'ArrowUp': 'UP',
  'ArrowDown': 'DOWN',
};

// Used to block instant reversal.
const OPPOSITES: Record<Direction, Direction> = {
  'RIGHT': 'LEFT',
  'LEFT': 'RIGHT',
  'UP': 'DOWN',
  'DOWN': 'UP',
};

const SnakeGame: React.FC = () => {
  // UI + game state.
  const [boardPreset, setBoardPreset] = useState<BoardPreset>('classic');
  const gridSize = BOARD_PRESETS[boardPreset].grid;
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Device detection: check if touch is supported.
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Refs avoid stale closures inside the RAF loop.
  const directionRef = useRef<Direction>('RIGHT');
  const runningRef = useRef(true);
  const [running, setRunning] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Expose grid size to CSS for responsive sizing.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.setProperty('--grid-size', String(gridSize));
  }, [gridSize]);

  // Device detection: set isTouchDevice on mount.
  useEffect(() => {
    const hasTouch = () => {
      return (
        typeof window !== 'undefined' &&
        (navigator.maxTouchPoints > 0 ||
          ('ontouchstart' in window))
      );
    };
    setIsTouchDevice(hasTouch());
  }, []);

  // Keep runningRef in sync with state and reset lastRef when resuming.
  useEffect(() => {
    runningRef.current = running;
    if (running) lastRef.current = null;
  }, [running]);

  // requestAnimationFrame-based loop with accumulated time for smoothness.
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const msPerTickRef = useRef<number>(SPEED_LEVELS.normal);

  useEffect(() => {
    msPerTickRef.current = SPEED_LEVELS[speedLabel];
  }, [speedLabel]);

  // Keyboard handler for direction changes.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const nextDir = KEY_MAP[e.key];
    if (!nextDir) return;
    e.preventDefault();
    // Prevent snake from reversing directly into itself
    if (OPPOSITES[nextDir] !== directionRef.current) {
      directionRef.current = nextDir;
    }
  }, []);

  // Touch D-pad button handler.
  const handleDPadPress = useCallback((direction: Direction) => {
    if (OPPOSITES[direction] !== directionRef.current) {
      directionRef.current = direction;
    }
  }, []);

  // Swipe gesture detection.
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const threshold = 30; // Minimum swipe distance
    let swipeDir: Direction | null = null;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      swipeDir = deltaX > 0 ? 'RIGHT' : 'LEFT';
    } else if (Math.abs(deltaY) > threshold) {
      swipeDir = deltaY > 0 ? 'DOWN' : 'UP';
    }

    if (swipeDir && OPPOSITES[swipeDir] !== directionRef.current) {
      directionRef.current = swipeDir;
    }
    touchStartRef.current = null;
  }, []);

  // Main game loop: advance, eat, grow, and detect collisions.
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Touch handlers are attached via React props on the board element.

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

  // Reset the board to a fresh game.
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

  // Reset game when board size changes.
  useEffect(() => {
    setRunning(true);
    reset();
  }, [gridSize, reset]);

  // Update high score when score increases and game ends.
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      setHighScoreState(score);
    }
  }, [gameOver, score, highScore]);

  // Precompute cell membership for fast rendering.
  const snakeSet = new Set(snake.map(keyOf));
  const headKey = keyOf(snake[0]);
  const foodKey = keyOf(food);
  const totalCells = gridSize * gridSize;

  return (
    <div className="game-container" ref={containerRef} data-touch-device={isTouchDevice}>
      <div className="game-header">
        <h1 className="game-title">🐍 Snake Game</h1>
        <p className="game-subtitle">
          Navigate, eat, and grow • {isTouchDevice ? 'Swipe or tap D-pad' : 'Arrow keys'} to move
        </p>
      </div>

      {showInstructions && (
        <div className="instructions-panel">
          <div className="instructions-header">
            <h2>How to Play</h2>
            <button className="close-btn" onClick={() => setShowInstructions(false)} aria-label="Close instructions">✕</button>
          </div>
          <div className="instructions-content">
            <div className="instruction-item">
              <strong>Controls:</strong> {isTouchDevice ? 'Swipe or tap D-pad buttons (↑ ↓ ← →) to navigate' : 'Use arrow keys (↑ ↓ ← →) to navigate'}
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

      <div className="board-slot">
        <div className="board" tabIndex={0} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
        {isTouchDevice && (
          <div className="dpad-container">
            <button className="dpad-btn dpad-up" onClick={() => handleDPadPress('UP')} aria-label="Move up">▲</button>
            <div className="dpad-middle">
              <button className="dpad-btn dpad-left" onClick={() => handleDPadPress('LEFT')} aria-label="Move left">◀</button>
              <button className="dpad-btn dpad-right" onClick={() => handleDPadPress('RIGHT')} aria-label="Move right">▶</button>
            </div>
            <button className="dpad-btn dpad-down" onClick={() => handleDPadPress('DOWN')} aria-label="Move down">▼</button>
          </div>
        )}
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
