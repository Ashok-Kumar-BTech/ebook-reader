import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsDrawer } from "../../../src/components/SettingsDrawer";
import type { BookSettings } from "../../../src/stores/bookStore";
import type { BookInstance } from "../../../src/types/reader";

const baseSettings: BookSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  margin: 48,
  theme: "dark",
  twoPageView: false,
  continuousScroll: true,
  panelMode: "smart",
  zoom: 1.0,
};

describe("SettingsDrawer View Applicability & Typography", () => {
  it("disables Single and Spread buttons for scroll-only formats (TXT) with tooltips", () => {
    const txtInstance: BookInstance = {
      format: "txt",
      filePath: "/books/notes.txt",
      title: "Notes",
      pageCount: 1,
      metadata: {},
    };

    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={baseSettings}
        onUpdateSettings={vi.fn()}
        onResetSettings={vi.fn()}
        bookInstance={txtInstance}
        currentPage={1}
        totalPages={1}
        theme="dark"
      />
    );

    const singleBtn = screen.getByRole("button", { name: "Single" });
    const spreadBtn = screen.getByRole("button", { name: "Spread" });
    const scrollBtn = screen.getByRole("button", { name: "Scroll" });

    expect(singleBtn).toBeDisabled();
    expect(singleBtn).toHaveAttribute("title", "This format is scroll-only and does not support single-page view.");
    expect(spreadBtn).toBeDisabled();
    expect(spreadBtn).toHaveAttribute("title", "This format is scroll-only and does not support two-page spread view.");
    expect(scrollBtn).not.toBeDisabled();
  });

  it("enables all view buttons for multi-view formats (EPUB)", () => {
    const epubInstance: BookInstance = {
      format: "epub",
      filePath: "/books/novel.epub",
      title: "Novel",
      pageCount: 100,
      metadata: { author: "Jane Doe" },
    };

    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={baseSettings}
        onUpdateSettings={vi.fn()}
        onResetSettings={vi.fn()}
        bookInstance={epubInstance}
        currentPage={1}
        totalPages={100}
        theme="dark"
      />
    );

    const singleBtn = screen.getByRole("button", { name: "Single" });
    const spreadBtn = screen.getByRole("button", { name: "Spread" });
    const scrollBtn = screen.getByRole("button", { name: "Scroll" });

    expect(singleBtn).not.toBeDisabled();
    expect(spreadBtn).not.toBeDisabled();
    expect(scrollBtn).not.toBeDisabled();

    // Verifies author metadata rendering
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders Typography controls and updates font size for reflowable formats", () => {
    const onUpdateSettings = vi.fn();
    const epubInstance: BookInstance = {
      format: "epub",
      filePath: "/books/novel.epub",
      title: "Novel",
      pageCount: 100,
      metadata: {},
    };

    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={baseSettings}
        onUpdateSettings={onUpdateSettings}
        onResetSettings={vi.fn()}
        bookInstance={epubInstance}
        currentPage={1}
        totalPages={100}
        theme="dark"
      />
    );

    const increaseBtn = screen.getByTitle("Increase font size");
    fireEvent.click(increaseBtn);
    expect(onUpdateSettings).toHaveBeenCalledWith({ fontSize: 18 });

    const decreaseBtn = screen.getByTitle("Decrease font size");
    fireEvent.click(decreaseBtn);
    expect(onUpdateSettings).toHaveBeenCalledWith({ fontSize: 14 });
  });

  it("shows fixed-layout notice instead of typography controls for PDF", () => {
    const pdfInstance: BookInstance = {
      format: "pdf",
      filePath: "/books/paper.pdf",
      title: "Research Paper",
      pageCount: 20,
      metadata: {},
    };

    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={baseSettings}
        onUpdateSettings={vi.fn()}
        onResetSettings={vi.fn()}
        bookInstance={pdfInstance}
        currentPage={1}
        totalPages={20}
        theme="dark"
      />
    );

    expect(
      screen.getByText(/Typography reflow \(font size, margins\) is not applicable for fixed-layout formats/i)
    ).toBeInTheDocument();
  });
});

