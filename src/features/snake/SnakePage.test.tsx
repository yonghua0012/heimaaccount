import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SnakePage } from "./SnakePage";
import { createInitialState } from "./snakeEngine";

describe("SnakePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts the game and pauses from the keyboard", async () => {
    const user = userEvent.setup();
    render(<SnakePage />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    expect(screen.getByText("游戏进行中")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("游戏已暂停")).toBeInTheDocument();
  });

  it("changes direction with an on-screen control", async () => {
    const user = userEvent.setup();
    render(<SnakePage />);
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await user.click(screen.getByRole("button", { name: "向上" }));

    expect(
      screen.getByRole("img", { name: /当前方向：上/ }),
    ).toBeInTheDocument();
  });

  it("shows the best score stored on this computer", () => {
    localStorage.setItem("snakeHighScore", "80");
    render(<SnakePage />);

    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("pauses automatically when the window loses focus", async () => {
    const user = userEvent.setup();
    render(<SnakePage />);
    await user.click(screen.getByRole("button", { name: "开始游戏" }));

    fireEvent.blur(window);

    expect(screen.getByText("游戏已暂停")).toBeInTheDocument();
  });

  it("persists a new best score after the game ends", async () => {
    const finishedGame = {
      ...createInitialState(() => 0),
      score: 90,
      status: "gameover" as const,
    };
    render(<SnakePage initialGame={finishedGame} />);

    await waitFor(
      () => expect(localStorage.getItem("snakeHighScore")).toBe("90"),
      { timeout: 500 },
    );
  });
});
