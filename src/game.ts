export type Point = [number, number];
export type Direction = 'RIGHT' | 'LEFT' | 'UP' | 'DOWN';

export const GRID = 10;
export const keyOf = (p: Point) => `${p[0]},${p[1]}`;

export function randPointExcluding(exclude: Set<string>): Point {
  const max = GRID * GRID;
  if (exclude.size >= max) throw new Error('No available points to place food');
  while (true) {
    const p: Point = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
    const k = keyOf(p);
    if (!exclude.has(k)) return p;
  }
}

export function stepSnake(prev: Point[], dir: Direction, food: Point): { snake: Point[]; ate: boolean; collision: boolean } {
  const head = prev[0];
  let newHead: Point;
  if (dir === 'RIGHT') newHead = [head[0], head[1] + 1];
  else if (dir === 'LEFT') newHead = [head[0], head[1] - 1];
  else if (dir === 'UP') newHead = [head[0] - 1, head[1]];
  else /* DOWN */ newHead = [head[0] + 1, head[1]];

  // wrap around borders
  if (newHead[0] < 0) newHead[0] = GRID - 1;
  else if (newHead[0] >= GRID) newHead[0] = 0;
  if (newHead[1] < 0) newHead[1] = GRID - 1;
  else if (newHead[1] >= GRID) newHead[1] = 0;

  const occupied = new Set(prev.map(keyOf));
  const tail = prev[prev.length - 1];
  const willEat = newHead[0] === food[0] && newHead[1] === food[1];
  const tailKey = keyOf(tail);
  const newHeadKey = keyOf(newHead);
  const hitSelf = occupied.has(newHeadKey) && !(newHeadKey === tailKey && !willEat);
  if (hitSelf) {
    return { snake: prev, ate: false, collision: true };
  }

  const newSnake = [newHead, ...prev];
  if (!willEat) newSnake.pop();

  return { snake: newSnake, ate: willEat, collision: false };
}
