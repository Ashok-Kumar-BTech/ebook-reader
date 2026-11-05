import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowseGrid, type BrowseGridEntry } from "../../../src/components/shell/BrowseGrid";

describe("BrowseGrid Component", () => {
  const mockEntries: BrowseGridEntry[] = [
    {
      name: "SubFolder",
      path: "D:/Books/SubFolder",
      isDirectory: true,
      size: 0,
      modified: Date.now(),
      isSupported: false,
    },
    {
      name: "Quantum Physics.pdf",
      path: "D:/Books/Quantum Physics.pdf",
      isDirectory: false,
      size: 1024 * 1024,
      modified: Date.now(),
      isSupported: true,
    },
    {
      name: "unsupported.bin",
      path: "D:/Books/unsupported.bin",
      isDirectory: false,
      size: 512,
      modified: Date.now(),
      isSupported: false,
    },
  ];

  it("renders empty state message when entries array is empty", () => {
    render(
      <BrowseGrid
        entries={[]}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery=""
      />
    );

    expect(screen.getByText("No supported ebooks found in this folder")).toBeInTheDocument();
  });

  it("renders search empty state message when filtered by searchQuery", () => {
    render(
      <BrowseGrid
        entries={[]}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery="nonexistent"
      />
    );

    expect(screen.getByText('No ebooks match "nonexistent"')).toBeInTheDocument();
  });

  it("renders entry cards with proper titles and badges", () => {
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery=""
      />
    );

    expect(screen.getByText("SubFolder")).toBeInTheDocument();
    expect(screen.getByText("Quantum Physics.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("calls onDirectoryClick when a folder entry is clicked", () => {
    const onDir = vi.fn();
    const onFile = vi.fn();
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={onFile}
        onDirectoryClick={onDir}
        searchQuery=""
      />
    );

    fireEvent.click(screen.getByText("SubFolder"));
    expect(onDir).toHaveBeenCalledWith("D:/Books/SubFolder");
    expect(onFile).not.toHaveBeenCalled();
  });

  it("calls onFileClick with path and name when a supported file is clicked", () => {
    const onDir = vi.fn();
    const onFile = vi.fn();
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={onFile}
        onDirectoryClick={onDir}
        searchQuery=""
      />
    );

    fireEvent.click(screen.getByText("Quantum Physics.pdf"));
    expect(onFile).toHaveBeenCalledWith("D:/Books/Quantum Physics.pdf", "Quantum Physics.pdf");
    expect(onDir).not.toHaveBeenCalled();
  });

  it("does not call onFileClick when an unsupported file is clicked", () => {
    const onDir = vi.fn();
    const onFile = vi.fn();
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={onFile}
        onDirectoryClick={onDir}
        searchQuery=""
      />
    );

    fireEvent.click(screen.getByText("unsupported.bin"));
    expect(onFile).not.toHaveBeenCalled();
    expect(onDir).not.toHaveBeenCalled();
  });

  it("opens context menu when clicking the 3-dots kebab options button", () => {
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery=""
      />
    );

    const kebabButtons = screen.getAllByRole("button", { name: /options/i });
    expect(kebabButtons.length).toBeGreaterThan(0);

    fireEvent.click(kebabButtons[1]); // Click for Quantum Physics.pdf
    expect(screen.getByRole("menu", { name: /entry actions/i })).toBeInTheDocument();
    expect(screen.getByText("Open Book")).toBeInTheDocument();
  });

  it("opens context menu on right-click contextmenu event", () => {
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery=""
      />
    );

    const bookTitle = screen.getByText("Quantum Physics.pdf");
    fireEvent.contextMenu(bookTitle);

    expect(screen.getByRole("menu", { name: /entry actions/i })).toBeInTheDocument();
    expect(screen.getByText("Copy Path")).toBeInTheDocument();
  });

  it("supports 500ms long press touch gesture to open context menu", () => {
    vi.useFakeTimers();

    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        searchQuery=""
      />
    );

    const bookCard = screen.getByText("Quantum Physics.pdf").closest(".cursor-pointer");
    expect(bookCard).toBeTruthy();

    fireEvent.touchStart(bookCard!, { touches: [{ clientX: 100, clientY: 150 }] });
    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByRole("menu", { name: /entry actions/i })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does not render Reveal in File Manager in context menu when onRevealInOS is undefined", () => {
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        onRevealInOS={undefined}
        searchQuery=""
      />
    );

    const kebabButtons = screen.getAllByRole("button", { name: /options/i });
    fireEvent.click(kebabButtons[1]);

    expect(screen.getByRole("menu", { name: /entry actions/i })).toBeInTheDocument();
    expect(screen.queryByText("Reveal in File Manager")).not.toBeInTheDocument();
  });

  it("renders and calls onRevealInOS in context menu when onRevealInOS is provided", () => {
    const onReveal = vi.fn();
    render(
      <BrowseGrid
        entries={mockEntries}
        onFileClick={vi.fn()}
        onDirectoryClick={vi.fn()}
        onRevealInOS={onReveal}
        searchQuery=""
      />
    );

    const kebabButtons = screen.getAllByRole("button", { name: /options/i });
    fireEvent.click(kebabButtons[1]);

    const revealBtn = screen.getByText("Reveal in File Manager");
    expect(revealBtn).toBeInTheDocument();
    fireEvent.click(revealBtn);
    expect(onReveal).toHaveBeenCalledWith("D:/Books/Quantum Physics.pdf");
  });
});

