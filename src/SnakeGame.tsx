import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { keyOf, randPointExcluding, stepSnake } from './game';
import type { Point, Direction } from './game';


const SPEED_LEVELS = {
  slow: 300,
  normal: 200,
  fast: 120,
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
  const [snake, setSnake] = useState<Point[]>(() => INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(() => {
    const s = new Set<string>(INITIAL_SNAKE.map(keyOf));
    return randPointExcluding(s);
  });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speedLabel, setSpeedLabel] = useState<keyof typeof SPEED_LEVELS>('normal');

  const directionRef = useRef<Direction>('RIGHT');
  const runningRef = useRef(true);
  const [running, setRunning] = useState(true);

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
          const { snake: next, ate, collision } = stepSnake(prev, directionRef.current, food);
          if (collision) {
            setGameOver(true);
            return prev;
          }
          if (ate) {
            setScore(s => s + 1);
            const sset = new Set(next.map(keyOf));
            setFood(randPointExcluding(sset));
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
    setFood(randPointExcluding(s));
  }, []);

  return (
    <div className="game">
      <h1>{gameOver ? 'Game Over' : 'Snake Game'}</h1>

      <div className="hud">
        <div className="score">Score: {score}</div>
        <div className="speed">Speed: {speedLabel}</div>
        <div className="status">Running: {String(running)} • Length: {snake.length}</div>
      </div>

      <div className="board" tabIndex={0}>
        {snake.map((segment, i) => (
          <div key={`${segment[0]}-${segment[1]}-${i}`} className={`segment r${segment[0]} c${segment[1]} ${i === 0 ? 'head' : ''}`} />
        ))}
        <div className={`food r${food[0]} c${food[1]}`} />
      </div>

      <div className="controls">
        <select aria-label="Speed" value={speedLabel} onChange={e => setSpeedLabel(e.target.value as keyof typeof SPEED_LEVELS)}>
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
        <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Resume'}</button>
        <button onClick={() => { setRunning(true); reset(); }}>Reset</button>
      </div>
    </div>
  );
};

export default SnakeGame;
