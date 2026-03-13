import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockClear = vi.fn();
const mockUnmount = vi.fn();

vi.mock("ink", () => ({
  render: vi.fn(() => ({ clear: mockClear, unmount: mockUnmount })),
  Text: ({ children }: { children: React.ReactNode }) => children,
}));

import { withSpinner } from "../src/tui/withSpinner";

describe("withSpinner", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
  });

  describe("non-TTY", () => {
    beforeEach(() => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
    });

    it("should return fn result", async () => {
      const result = await withSpinner("loading...", async () => 42);
      expect(result).toBe(42);
    });

    it("should propagate fn errors", async () => {
      await expect(
        withSpinner("loading...", async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    });

    it("should log label to console", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await withSpinner("loading...", async () => "ok");
      expect(spy).toHaveBeenCalledWith("loading...");
      spy.mockRestore();
    });

    it("should not call ink render", async () => {
      const { render } = await import("ink");
      await withSpinner("loading...", async () => "ok");
      expect(render).not.toHaveBeenCalled();
    });
  });

  describe("TTY", () => {
    beforeEach(() => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
    });

    it("should return fn result", async () => {
      const result = await withSpinner("loading...", async () => "done");
      expect(result).toBe("done");
    });

    it("should call clear and unmount on success", async () => {
      await withSpinner("loading...", async () => "ok");
      expect(mockClear).toHaveBeenCalledOnce();
      expect(mockUnmount).toHaveBeenCalledOnce();
    });

    it("should call clear and unmount on error", async () => {
      await withSpinner("loading...", async () => {
        throw new Error("boom");
      }).catch(() => {});

      expect(mockClear).toHaveBeenCalledOnce();
      expect(mockUnmount).toHaveBeenCalledOnce();
    });

    it("should propagate fn errors", async () => {
      await expect(
        withSpinner("loading...", async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });
  });
});
