import { useEffect, useState } from "react";
import {
  advance,
  createInitialState,
  startGame,
  tickDelay,
  togglePause,
  turn,
  type Direction,
  type SnakeState,
} from "./snakeEngine";

const HIGH_SCORE_KEY = "snakeHighScore";

const directionLabels: Record<Direction, string> = {
  up: "上",
  down: "下",
  left: "左",
  right: "右",
};

const directionKeys: Record<string, Direction | undefined> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

function readHighScore(): number {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // The game remains usable when local storage is unavailable.
  }
}

function statusLabel(state: SnakeState): string {
  switch (state.status) {
    case "ready":
      return "准备开始";
    case "running":
      return "游戏进行中";
    case "paused":
      return "游戏已暂停";
    case "won":
      return "全部吃完了";
    default:
      return "游戏结束";
  }
}

interface SnakePageProps {
  random?: () => number;
}

function freshRunningGame(random: () => number): SnakeState {
  return startGame(createInitialState(random));
}

export function SnakePage({ random = Math.random }: SnakePageProps) {
  const [game, setGame] = useState<SnakeState>(() =>
    createInitialState(random),
  );
  const [highScore, setHighScore] = useState(readHighScore);

  useEffect(() => {
    if (game.status !== "running") return;
    const timer = window.setTimeout(() => {
      setGame((current) => advance(current, random));
    }, tickDelay(game.score));
    return () => window.clearTimeout(timer);
  }, [game, random]);

  useEffect(() => {
    if (game.status !== "gameover" && game.status !== "won") return;
    setHighScore((current) => {
      const next = Math.max(current, game.score);
      if (next > current) saveHighScore(next);
      return next;
    });
  }, [game.score, game.status]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = directionKeys[event.key.toLowerCase()];
      if (direction) {
        event.preventDefault();
        setGame((current) =>
          current.status === "running" ? turn(current, direction) : current,
        );
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        setGame((current) => togglePause(current));
        return;
      }
      if (event.key === "Enter") {
        setGame((current) =>
          current.status === "gameover" ||
          current.status === "won" ||
          current.status === "ready"
            ? freshRunningGame(random)
            : current,
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function pauseWhenHidden() {
      setGame((current) =>
        current.status === "running"
          ? { ...current, status: "paused" }
          : current,
      );
    }
    window.addEventListener("blur", pauseWhenHidden);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      window.removeEventListener("blur", pauseWhenHidden);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, []);

  const overlay =
    game.status === "ready" ? (
      <div className="snake-overlay">
        <p>吃掉红色果实，别撞墙或咬到自己。</p>
        <button
          type="button"
          className="primary"
          onClick={() => setGame(freshRunningGame(random))}
        >
          开始游戏
        </button>
      </div>
    ) : game.status === "paused" ? (
      <div className="snake-overlay">
        <p>先休息一下，速度会随着分数逐渐提升。</p>
        <button
          type="button"
          className="primary"
          onClick={() => setGame(togglePause)}
        >
          继续游戏
        </button>
      </div>
    ) : game.status === "gameover" || game.status === "won" ? (
      <div className="snake-overlay">
        <p>
          {game.status === "won"
            ? "你填满了整个棋盘。"
            : `本局得分 ${game.score}，再试一次？`}
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => setGame(freshRunningGame(random))}
        >
          再来一局
        </button>
      </div>
    ) : null;

  return (
    <div className="page-stack snake-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">账本之外，休息一下</p>
          <h1>贪吃蛇</h1>
        </div>
        <p className={`game-status ${game.status}`} role="status">
          {statusLabel(game)}
        </p>
      </header>

      <div className="snake-layout">
        <section className="snake-card" aria-label="贪吃蛇游戏">
          <header className="snake-scoreboard">
            <div>
              <span>当前分数</span>
              <strong>{game.score}</strong>
            </div>
            <div>
              <span>本机最高</span>
              <strong>{highScore}</strong>
            </div>
            <div>
              <span>蛇身长度</span>
              <strong>{game.snake.length}</strong>
            </div>
          </header>

          <div className="snake-board-wrap">
            <svg
              className="snake-board"
              viewBox={`0 0 ${game.width} ${game.height}`}
              role="img"
              aria-label={`贪吃蛇游戏区域，当前方向：${directionLabels[game.pendingDirection]}`}
            >
              <defs>
                <pattern
                  id="snake-grid"
                  width="1"
                  height="1"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 1 0 L 0 0 0 1"
                    fill="none"
                    stroke="#29303a"
                    strokeWidth="0.04"
                  />
                </pattern>
              </defs>
              <rect width={game.width} height={game.height} fill="#141820" />
              <rect
                width={game.width}
                height={game.height}
                fill="url(#snake-grid)"
              />
              {game.snake.map((point, index) => (
                <rect
                  key={`${point.x}:${point.y}`}
                  x={point.x + 0.08}
                  y={point.y + 0.08}
                  width="0.84"
                  height="0.84"
                  rx="0.2"
                  className={index === 0 ? "snake-head" : "snake-segment"}
                />
              ))}
              {game.food && (
                <circle
                  cx={game.food.x + 0.5}
                  cy={game.food.y + 0.5}
                  r="0.34"
                  className="snake-food"
                />
              )}
            </svg>
            {overlay}
          </div>

          <div className="snake-controls">
            <div className="direction-pad" aria-label="方向控制">
              <button
                type="button"
                aria-label="向上"
                disabled={game.status !== "running"}
                onClick={() => setGame((current) => turn(current, "up"))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="向左"
                disabled={game.status !== "running"}
                onClick={() => setGame((current) => turn(current, "left"))}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="向下"
                disabled={game.status !== "running"}
                onClick={() => setGame((current) => turn(current, "down"))}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="向右"
                disabled={game.status !== "running"}
                onClick={() => setGame((current) => turn(current, "right"))}
              >
                →
              </button>
            </div>
            <button
              type="button"
              className="secondary"
              disabled={game.status !== "running" && game.status !== "paused"}
              onClick={() => setGame((current) => togglePause(current))}
            >
              {game.status === "paused" ? "继续" : "暂停"}
            </button>
          </div>
        </section>

        <aside className="panel snake-help">
          <p className="eyebrow">操作提示</p>
          <h2>像记账一样利落</h2>
          <dl>
            <div>
              <dt>移动</dt>
              <dd>方向键或 WASD</dd>
            </div>
            <div>
              <dt>暂停</dt>
              <dd>空格键</dd>
            </div>
            <div>
              <dt>重开</dt>
              <dd>Enter</dd>
            </div>
          </dl>
          <p>
            蛇的速度会随着得分逐渐提升。切换页面或窗口失去焦点时，本局会自动暂停。
          </p>
        </aside>
      </div>
    </div>
  );
}
