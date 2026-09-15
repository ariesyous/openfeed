import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
vi.mock("../src/components/FeedList", () => ({
  FeedList: () => <div>Feed</div>,
}));
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
describe("theme", () => {
  it("defaults to dark and persists an explicit light preference", () => {
    const view = render(<App />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );
    expect(document.documentElement.dataset.theme).toBe("light");
    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });
});
