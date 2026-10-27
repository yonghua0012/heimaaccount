export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "ready" | "running" | "paused" | "gameover" | "won";

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  width: number;
  height: number;
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction;
  food: Point | null;
  score: number;
  status: GameStatus;
}

function foodFor(snake: Point[], width: number, height: number, random: () => number) {
  const occupied = new Set(snake.map((point) => `${point.x}:${point.y}`));
  const available: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(`${x}:${y}`)) available.push({ x, y });
    }
  }
  if (available.length === 0) return null;
  const index = Math.min(available.length - 1, Math.floor(random() * available.length));
  return available[index];
}

export function createInitialState(random: () => number = Math.random): SnakeState {
  const width = 20;
  const height = 20;
  const center = Math.floor(width / 2);
  const snake = [
    { x: center, y: 10 },
    { x: center - 1, y: 10 },
    { x: center - 2, y: 10 },
  ];
  return {
    width,
    height,
    snake,
    direction: "right",
    pendingDirection: "right",
    food: foodFor(snake, width, height, random),
    score: 0,
    status: "ready",
  };
}

export function startGame(state: SnakeState): SnakeState {
  return {
    ...state,
    status: "running",
  };
}

export function turn(state: SnakeState, direction: Direction): SnakeState {
  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  } as const;
  if (opposite[state.direction] === direction) return state;
  return {
    ...state,
    pendingDirection: direction,
  };
}

export function togglePause(state: SnakeState): SnakeState {
  if (state.status === "running") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "running" };
  return state;
}

export function tickDelay(score: number): number {
  return Math.max(70, 140 - Math.floor(score / 50) * 20);
}

export function advance(
  state: SnakeState,
  random: () => number = Math.random,
): SnakeState {
  if (state.status !== "running") return state;
  const delta = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[state.pendingDirection];
  const head = state.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };
  if (nextHead.x < 0) nextHead.x = state.width - 1;
  if (nextHead.x >= state.width) nextHead.x = 0;
  if (nextHead.y < 0) nextHead.y = state.height - 1;
  if (nextHead.y >= state.height) nextHead.y = 0;
  const eating =
    state.food?.x === nextHead.x && state.food?.y === nextHead.y;
  const occupiedBody = eating ? state.snake : state.snake.slice(0, -1);
  if (
    occupiedBody.some(
      (point) => point.x === nextHead.x && point.y === nextHead.y,
    )
  ) {
    return { ...state, status: "gameover" };
  }
  const snake = eating
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];
  const food = eating
    ? foodFor(snake, state.width, state.height, random)
    : state.food;
  return {
    ...state,
    direction: state.pendingDirection,
    snake,
    food,
    score: state.score + (eating ? 10 : 0),
    status: eating && food === null ? "won" : state.status,
  };
}
