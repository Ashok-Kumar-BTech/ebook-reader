import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
});

