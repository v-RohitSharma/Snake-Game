import { describe, it, expect } from 'vitest';
import { CLASSIC_GRID, randPointExcluding, stepSnake } from './game';
import type { Point } from './game';

// Unit tests for the pure game-logic helpers.
describe('stepSnake', () => {
  it('moves the snake forward', () => {
    const snake: Point[] = [[0, 1], [0, 0]];
    const { snake: next, ate, collision } = stepSnake(snake, 'RIGHT', [CLASSIC_GRID - 1, CLASSIC_GRID - 1], CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(ate).toBe(false);
    expect(next[0]).toEqual([0, 2]);
  });

  it('eats food and grows', () => {
    const snake: Point[] = [[0, 1], [0, 0]];
    const food: Point = [0, 2];
    const { snake: next, ate, collision } = stepSnake(snake, 'RIGHT', food, CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(ate).toBe(true);
    expect(next.length).toBe(3);
    expect(next[0]).toEqual([0, 2]);
  });

  it('wraps around borders', () => {
    const snake: Point[] = [[0, 9], [0, 8]];
    const { snake: next, collision } = stepSnake(snake, 'RIGHT', [5, 5], CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([0, 0]); // wrapped from right edge to left
  });

  it('wraps around left border', () => {
    const snake: Point[] = [[5, 0], [5, 1]];
    const { snake: next, collision } = stepSnake(snake, 'LEFT', [5, 5], CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([5, CLASSIC_GRID - 1]); // wrapped from left edge to right
  });

  it('wraps around top border', () => {
    const snake: Point[] = [[0, 5], [1, 5]];
    const { snake: next, collision } = stepSnake(snake, 'UP', [5, 5], CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([CLASSIC_GRID - 1, 5]); // wrapped from top to bottom
  });

  it('wraps around bottom border', () => {
    const snake: Point[] = [[9, 5], [8, 5]];
    const { snake: next, collision } = stepSnake(snake, 'DOWN', [5, 5], CLASSIC_GRID);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([0, 5]); // wrapped from bottom to top
  });

  it('detects self collision', () => {
    // arrange a shape where the next move causes the head to run into the body
    const snake: Point[] = [[0, 2], [1, 2], [1, 1], [0, 1]];
    // moving DOWN from head [0,2] will produce new head [1,2], which is occupied
    const { collision } = stepSnake(snake, 'DOWN', [CLASSIC_GRID - 1, CLASSIC_GRID - 1], CLASSIC_GRID);
    expect(collision).toBe(true);
  });

  it('places food only on available cells', () => {
    const gridSize = 4;
    const exclude = new Set<string>();
    for (let r = 0; r < gridSize; r += 1) {
      for (let c = 0; c < gridSize; c += 1) {
        if (!(r === 3 && c === 2)) exclude.add(`${r},${c}`);
      }
    }
    const food = randPointExcluding(exclude, gridSize);
    expect(food).toEqual([3, 2]);
  });

  it('wraps correctly on a smaller grid', () => {
    const gridSize = 4;
    const snake: Point[] = [[0, 3], [0, 2]];
    const { snake: next, collision } = stepSnake(snake, 'RIGHT', [2, 2], gridSize);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([0, 0]);
  });
});
