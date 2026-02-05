import { describe, it, expect } from 'vitest';
import { stepSnake } from './game';
import type { Point } from './game';

describe('stepSnake', () => {
  it('moves the snake forward', () => {
    const snake: Point[] = [[0, 1], [0, 0]];
    const { snake: next, ate, collision } = stepSnake(snake, 'RIGHT', [9, 9]);
    expect(collision).toBe(false);
    expect(ate).toBe(false);
    expect(next[0]).toEqual([0, 2]);
  });

  it('eats food and grows', () => {
    const snake: Point[] = [[0, 1], [0, 0]];
    const food: Point = [0, 2];
    const { snake: next, ate, collision } = stepSnake(snake, 'RIGHT', food);
    expect(collision).toBe(false);
    expect(ate).toBe(true);
    expect(next.length).toBe(3);
    expect(next[0]).toEqual([0, 2]);
  });

  it('wraps around borders', () => {
    const snake: Point[] = [[0, 9], [0, 8]];
    const { snake: next, collision } = stepSnake(snake, 'RIGHT', [5, 5]);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([0, 0]); // wrapped from right edge to left
  });

  it('wraps around left border', () => {
    const snake: Point[] = [[5, 0], [5, 1]];
    const { snake: next, collision } = stepSnake(snake, 'LEFT', [5, 5]);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([5, 9]); // wrapped from left edge to right
  });

  it('wraps around top border', () => {
    const snake: Point[] = [[0, 5], [1, 5]];
    const { snake: next, collision } = stepSnake(snake, 'UP', [5, 5]);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([9, 5]); // wrapped from top to bottom
  });

  it('wraps around bottom border', () => {
    const snake: Point[] = [[9, 5], [8, 5]];
    const { snake: next, collision } = stepSnake(snake, 'DOWN', [5, 5]);
    expect(collision).toBe(false);
    expect(next[0]).toEqual([0, 5]); // wrapped from bottom to top
  });

  it('detects self collision', () => {
    // arrange a shape where the next move causes the head to run into the body
    const snake: Point[] = [[0, 2], [1, 2], [1, 1], [0, 1]];
    // moving DOWN from head [0,2] will produce new head [1,2], which is occupied
    const { collision } = stepSnake(snake, 'DOWN', [9, 9]);
    expect(collision).toBe(true);
  });
});
