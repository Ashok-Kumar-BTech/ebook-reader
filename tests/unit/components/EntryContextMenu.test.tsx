import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntryContextMenu } from "../../../src/components/shell/EntryContextMenu";

describe("EntryContextMenu Component", () => {
  it("renders entry name, open, reveal in file manager, and copy path actions", () => {
    const onOpen = vi.fn();
    const onRevealInOS = vi.fn();
    const onClose = vi.fn();

    render(
      <EntryContextMenu
        x={100}
        y={100}
        entry={{ name: "dune.epub", path: "/books/dune.epub", isDirectory: false, isSupported: true }}
        onClose={onClose}
        onOpen={onOpen}
        onRevealInOS={onRevealInOS}
      />
    );

    expect(screen.getByText("dune.epub")).toBeInTheDocument();
    expect(screen.getByText("Open Book")).toBeInTheDocument();
    expect(screen.getByText("Reveal in File Manager")).toBeInTheDocument();
    expect(screen.getByText("Copy Path")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Open Book"));
    expect(onOpen).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Reveal in File Manager"));
    expect(onRevealInOS).toHaveBeenCalled();
  });

  it("copies path to clipboard when clicking Copy Path", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <EntryContextMenu
        x={50}
        y={50}
        entry={{ name: "fantasy", path: "/books/fantasy", isDirectory: true }}
        onClose={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Copy Path"));
    expect(writeTextMock).toHaveBeenCalledWith("/books/fantasy");
  });

  it("renders Completed and Not Completed toggle options for book entries", () => {
    const onToggleCompleted = vi.fn();
    const onClose = vi.fn();

    // 1. Not completed state
    const { rerender } = render(
      <EntryContextMenu
        x={50}
        y={50}
        entry={{ name: "dune.epub", path: "/books/dune.epub", isDirectory: false }}
        onClose={onClose}
        onOpen={vi.fn()}
        isCompleted={false}
        onToggleCompleted={onToggleCompleted}
      />
    );

    expect(screen.getByText("Not Completed")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Not Completed"));
    expect(onToggleCompleted).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();

    // 2. Completed state
    rerender(
      <EntryContextMenu
        x={50}
        y={50}
        entry={{ name: "dune.epub", path: "/books/dune.epub", isDirectory: false }}
        onClose={onClose}
        onOpen={vi.fn()}
        isCompleted={true}
        onToggleCompleted={onToggleCompleted}
      />
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Completed"));
    expect(onToggleCompleted).toHaveBeenCalledTimes(2);

    // 3. Directory should NOT render Completed / Not Completed
    rerender(
      <EntryContextMenu
        x={50}
        y={50}
        entry={{ name: "docs", path: "/books/docs", isDirectory: true }}
        onClose={onClose}
        onOpen={vi.fn()}
        isCompleted={false}
        onToggleCompleted={onToggleCompleted}
      />
    );

    expect(screen.queryByText("Not Completed")).not.toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("closes context menu when clicking the backdrop overlay", () => {
    const onClose = vi.fn();
    render(
      <EntryContextMenu
        x={100}
        y={100}
        entry={{ name: "dune.epub", path: "/books/dune.epub", isDirectory: false }}
        onClose={onClose}
        onOpen={vi.fn()}
      />
    );

    const backdrop = screen.getByTestId("context-menu-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders mobile bottom sheet with Cancel button when isCompact is true", () => {
    const onClose = vi.fn();
    render(
      <EntryContextMenu
        x={100}
        y={100}
        entry={{ name: "dune.epub", path: "/books/dune.epub", isDirectory: false }}
        onClose={onClose}
        onOpen={vi.fn()}
        isCompact={true}
      />
    );

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("omits Reveal in File Manager action when onRevealInOS is undefined (Android/Web behavior)", () => {
    render(
      <EntryContextMenu
        x={100}
        y={100}
        entry={{ name: "android_book.epub", path: "content://books/1", isDirectory: false }}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onRevealInOS={undefined}
      />
    );

    expect(screen.getByText("Open Book")).toBeInTheDocument();
    expect(screen.getByText("Copy Path")).toBeInTheDocument();
    expect(screen.queryByText("Reveal in File Manager")).not.toBeInTheDocument();
  });

  it("omits Reveal in File Manager on mobile bottom sheet when onRevealInOS is undefined", () => {
    render(
      <EntryContextMenu
        x={100}
        y={100}
        entry={{ name: "mobile_book.pdf", path: "content://books/2", isDirectory: false }}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onRevealInOS={undefined}
        isCompact={true}
      />
    );

    expect(screen.queryByText("Reveal in File Manager")).not.toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});

