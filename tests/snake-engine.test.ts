import assert from "node:assert/strict";
import { it } from "vitest";
import {
  advance,
  createInitialState,
  startGame,
  tickDelay,
  togglePause,
  turn,
} from "../src/features/snake/snakeEngine.ts";

it("initial state has a ready three-cell snake and food outside the snake", () => {
  const state = createInitialState(() => 0);

  assert.equal(state.status, "ready");
  assert.equal(state.width, 20);
  assert.equal(state.height, 20);
  assert.equal(state.snake.length, 3);
  assert.ok(state.food);
  assert.equal(
    state.snake.some(
      (point) => point.x === state.food?.x && point.y === state.food?.y,
    ),
    false,
  );
});

it("a direct reverse turn is ignored", () => {
  const running = startGame(createInitialState(() => 0));
  const turned = turn(running, "left");

  assert.equal(turned.pendingDirection, "right");
});

it("eating food grows the snake and increases the score", () => {
  const running = startGame(createInitialState(() => 0));
  const head = running.snake[0];
  const withFoodAhead = {
    ...running,
    food: { x: head.x + 1, y: head.y },
  };
  const moved = advance(withFoodAhead, () => 0);

  assert.equal(moved.snake.length, 4);
  assert.equal(moved.score, 10);
  assert.equal(moved.status, "running");
});

it("wrapping from the right edge continues at the left edge", () => {
  const running = startGame(createInitialState(() => 0));
  const atRightEdge = {
    ...running,
    snake: [
      { x: 19, y: 10 },
      { x: 18, y: 10 },
      { x: 17, y: 10 },
    ],
  };

  const moved = advance(atRightEdge, () => 0);

  assert.deepEqual(moved.snake[0], { x: 0, y: 10 });
  assert.equal(moved.status, "running");
});

it("wrapping from the left edge continues at the right edge", () => {
  const running = startGame(createInitialState(() => 0));
  const atLeftEdge = {
    ...running,
    snake: [
      { x: 0, y: 10 },
      { x: 1, y: 10 },
      { x: 2, y: 10 },
    ],
    direction: "left" as const,
    pendingDirection: "left" as const,
  };

  const moved = advance(atLeftEdge, () => 0);

  assert.deepEqual(moved.snake[0], { x: 19, y: 10 });
  assert.equal(moved.status, "running");
});

it("wrapping from the bottom edge continues at the top edge", () => {
  const running = startGame(createInitialState(() => 0));
  const atBottomEdge = {
    ...running,
    snake: [
      { x: 10, y: 19 },
      { x: 10, y: 18 },
      { x: 10, y: 17 },
    ],
    direction: "down" as const,
    pendingDirection: "down" as const,
  };

  const moved = advance(atBottomEdge, () => 0);

  assert.deepEqual(moved.snake[0], { x: 10, y: 0 });
  assert.equal(moved.status, "running");
});

it("wrapping from the top edge continues at the bottom edge", () => {
  const running = startGame(createInitialState(() => 0));
  const atTopEdge = {
    ...running,
    snake: [
      { x: 10, y: 0 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
    ],
    direction: "up" as const,
    pendingDirection: "up" as const,
  };

  const moved = advance(atTopEdge, () => 0);

  assert.deepEqual(moved.snake[0], { x: 10, y: 19 });
  assert.equal(moved.status, "running");
});

it("hitting the snake body ends the game", () => {
  const running = startGame(createInitialState(() => 0));
  const looped = {
    ...running,
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ],
    direction: "down" as const,
    pendingDirection: "left" as const,
    food: { x: 10, y: 10 },
  };

  assert.equal(advance(looped, () => 0).status, "gameover");
});

it("a paused snake does not move", () => {
  const running = startGame(createInitialState(() => 0));
  const paused = togglePause(running);

  assert.equal(paused.status, "paused");
  assert.deepEqual(advance(paused, () => 0), paused);
});

it("snake speed increases with score but never drops below the minimum", () => {
  assert.equal(tickDelay(0), 140);
  assert.equal(tickDelay(50), 120);
  assert.equal(tickDelay(100), 100);
  assert.equal(tickDelay(1_000), 70);
});

it("a running snake advances one cell without mutating input", () => {
  const ready = createInitialState(() => 0);
  const running = startGame(ready);
  const head = running.snake[0];
  const moved = advance(running, () => 0);

  assert.deepEqual(moved.snake[0], { x: head.x + 1, y: head.y });
  assert.deepEqual(running.snake[0], head);
});
