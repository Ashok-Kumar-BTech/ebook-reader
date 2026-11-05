import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';
import { extractDocumentTitle } from '../utils/pathUtils';

// Dynamic import for epubjs
let epubjs: any = null;

async function loadEpubJs(): Promise<any> {
  if (epubjs) return epubjs;
  if (typeof window !== 'undefined') {
    epubjs = await import('epubjs');
  }
  return epubjs;
}

export class EpubAdapter implements BookAdapter {
  readonly format = 'epub' as const;

  private book: any = null;
  private rendition: any = null;
  private renditionContainer: HTMLElement | null = null;
  private scrollRendition: any = null;
  private scrollContainer: HTMLElement | null = null;
  private pageCount: number = 0;
  private currentLocation: number = 0;
  private title: string = 'EPUB Document';
  private author: string | undefined;
  private spineItems: any[] = [];
  private toc: TOCItem[] = [];
  onLocationChange?: (location: number) => void;

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const epub = await loadEpubJs();
    const arrayBuffer = fileData.buffer.slice(
      fileData.byteOffset,
      fileData.byteOffset + fileData.byteLength
    );
    const ePubFn = typeof epub.default === 'function' ? epub.default : (typeof epub === 'function' ? epub : (epub as any).ePub);
    this.book = ePubFn(arrayBuffer);

    // Await book opening and package readiness
    try {
      await Promise.all([this.book.opened, this.book.ready]);
    } catch (e) {
      console.warn('[EpubAdapter] Error waiting for book ready, falling back:', e);
    }

    const metadata = this.book.package?.metadata || (await this.book.loaded?.metadata) || {};
    this.title = metadata.title || extractDocumentTitle(bookPath) || 'EPUB Document';
    this.author = metadata.creator;
    this.spineItems = this.book.spine?.spineItems || [];
    this.pageCount = Math.max(1, this.spineItems.length);
    this.currentLocation = 0;

    return {
      format: 'epub',
      filePath: bookPath,
      title: this.title,
      author: this.author,
      pageCount: this.pageCount,
      metadata: metadata,
    };
  }

  private async parseTOC(): Promise<TOCItem[]> {
    if (!this.book) return [];
    try {
      const nav = await (this.book.loaded?.navigation || this.book.navigation);
      const toc = nav?.toc || this.book.navigation?.toc;
      if (!toc) return [];
      const parseTocItems = (items: any[], level = 0): TOCItem[] =>
        items.map((item, index) => ({
          id: `toc-${level}-${index}`,
          label: item.label || `Chapter ${index + 1}`,
          location: item.href ? this.getLocationFromHref(item.href) : index,
          level,
          children: item.subitems ? parseTocItems(item.subitems, level + 1) : undefined,
        }));
      return parseTocItems(toc);
    } catch (e) {
      console.warn('Failed to parse TOC:', e);
      return [];
    }
  }

  private getLocationFromHref(href: string): number {
    const cleanHref = href.split('#')[0].replace(/^\.\//, '');
    const index = this.spineItems.findIndex(item => {
      const itemClean = item.href.split('#')[0].replace(/^\.\//, '');
      return itemClean === cleanHref || itemClean.endsWith(cleanHref) || cleanHref.endsWith(itemClean);
    });
    return index >= 0 ? index : 0;
  }

  unload(): void {
    if (this.scrollRendition) {
      try { this.scrollRendition.destroy(); } catch { /* ignore */ }
      this.scrollRendition = null;
    }
    this.scrollContainer = null;
    if (this.rendition) {
      try { this.rendition.destroy(); } catch { /* ignore */ }
      this.rendition = null;
    }
    this.renditionContainer = null;
    if (this.book) {
      try { this.book.destroy(); } catch { /* ignore */ }
      this.book = null;
    }
    this.pageCount = 0;
    this.currentLocation = 0;
    this.spineItems = [];
    this.toc = [];
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async goToLocation(loc: number): Promise<void> {
    // Prioritize whichever rendition is currently attached to a live DOM container
    const target = (this.scrollRendition && this.scrollContainer)
      ? this.scrollRendition
      : (this.rendition || this.scrollRendition);
    if (!target || loc < 0 || loc >= this.pageCount) return;
    try {
      const spineItem = this.spineItems[loc];
      if (spineItem) {
        await target.display(spineItem.href);
        this.currentLocation = loc + 1;
        if (this.onLocationChange) {
          this.onLocationChange(loc + 1);
        }
      }
    } catch (e) {
      console.warn('Failed to navigate to location:', e);
    }
  }

  getCurrentLocation(): number {
    return this.currentLocation;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.book || !query.trim()) return [];
    try {
      const results = await this.book.search(query);
      return results.map((result: any) => ({
        location: this.getLocationFromHref(result.href),
        context: result.excerpt,
        matchedText: query,
      }));
    } catch (e) {
      console.warn('Search failed:', e);
      return [];
    }
  }

  async getTOC(): Promise<TOCItem[]> {
    if (this.toc.length === 0) {
      this.toc = await this.parseTOC();
    }
    return this.toc;
  }

  /** Render EPUB for Continuous Scroll view using a single scrolled rendition */
  async renderScrollView(container: HTMLElement, options: RenderOptions): Promise<void> {
    if (!this.book) return;

    if (this.rendition) {
      try { this.rendition.destroy(); } catch { /* ignore */ }
      this.rendition = null;
      this.renditionContainer = null;
    }

    if (this.scrollRendition && this.scrollContainer !== container) {
      try { this.scrollRendition.destroy(); } catch { /* ignore */ }
      this.scrollRendition = null;
      this.scrollContainer = null;
    }

    const w = Math.max(280, container.clientWidth || options.width);
    const h = Math.max(400, container.clientHeight || options.height);

    if (!this.scrollRendition) {
      this.scrollRendition = this.book.renderTo(container, {
        width: w,
        height: h,
        flow: 'scrolled-continuous',
        manager: 'continuous',
        stylesheet: this._buildStylesheet(options),
      });

      this.scrollRendition.on('relocated', (location: any) => {
        if (location?.start) {
          const idx = location.start.index !== undefined ? location.start.index : 0;
          const page = Math.min(this.pageCount, Math.max(1, idx + 1));
          this.currentLocation = page;
          if (this.onLocationChange) {
            this.onLocationChange(page);
          }
        }
      });

      this.scrollContainer = container;

      const idx = this.currentLocation >= 0 ? this.currentLocation : 0;
      const spineItem = this.spineItems[idx] || this.spineItems[0];
      if (spineItem) {
        await this.scrollRendition.display(spineItem.href);
      }
    } else {
      try {
        this.scrollRendition.resize(w, h);
        if (this.scrollRendition.themes) {
          this.scrollRendition.themes.fontSize(`${options.fontSize}px`);
          this.scrollRendition.themes.default(this._buildStylesheetObj(options));
        }
      } catch { /* ignore */ }
    }
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    if (!this.book || pageNum < 0 || pageNum >= this.pageCount) return;

    // For continuous scroll, delegate to renderScrollView
    if (options.continuousScroll) {
      return this.renderScrollView(container, options);
    }

    // Destroy scroll rendition if switching to paged mode
    if (this.scrollRendition) {
      try { this.scrollRendition.destroy(); } catch { /* ignore */ }
      this.scrollRendition = null;
      this.scrollContainer = null;
    }

    // Destroy paged rendition if target container changed
    if (this.rendition && this.renditionContainer !== container) {
      try { this.rendition.destroy(); } catch { /* ignore */ }
      this.rendition = null;
      this.renditionContainer = null;
    }

    const w = Math.max(280, options.width - options.margin * 2);
    const h = Math.max(280, options.height - options.margin * 2);

    if (!this.rendition) {
      this.rendition = this.book.renderTo(container, {
        width: w,
        height: h,
        spread: options.twoPageView ? 'always' : 'none',
        minSpreadWidth: options.twoPageView ? 0 : 800,
        stylesheet: this._buildStylesheet(options),
      });

      this.rendition.on('relocated', (location: any) => {
        if (location?.start) {
          const idx = location.start.index !== undefined ? location.start.index : 0;
          const page = Math.min(this.pageCount, Math.max(1, idx + 1));
          this.currentLocation = page;
          if (this.onLocationChange) {
            this.onLocationChange(page);
          }
        }
      });

      this.renditionContainer = container;
    } else {
      try {
        this.rendition.resize(w, h);
        if (this.rendition.themes) {
          this.rendition.themes.fontSize(`${options.fontSize}px`);
          this.rendition.themes.default(this._buildStylesheetObj(options));
        }
      } catch {
        // Ignore resize/themes error
      }
    }

    const idx = pageNum >= 1 ? pageNum - 1 : Math.max(0, pageNum);
    const spineItem = this.spineItems[Math.min(idx, this.spineItems.length - 1)];
    if (spineItem) {
      await this.rendition.display(spineItem.href);
      this.currentLocation = Math.min(idx, this.spineItems.length - 1);
    }
  }

  async renderPageRange(
    startPage: number,
    endPage: number,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    if (!this.book) return;
    await this.renderPage(Math.max(1, startPage), container, options);
    this.currentLocation = Math.min(endPage, this.pageCount) - 1;
  }

  private _buildStylesheet(options: RenderOptions): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: ${options.fontSize}px !important;
        line-height: ${options.lineHeight} !important;
        margin: ${options.margin}px !important;
        color: ${this.getThemeColor(options.theme)} !important;
        background-color: ${this.getThemeBg(options.theme)} !important;
      }
      p, div, li, span {
        line-height: ${options.lineHeight} !important;
      }
    `;
  }

  private _buildStylesheetObj(options: RenderOptions): object {
    return {
      body: {
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size': options.fontSize + 'px',
        'line-height': `${options.lineHeight} !important`,
        'margin': options.margin + 'px',
        'color': this.getThemeColor(options.theme),
        'background-color': this.getThemeBg(options.theme),
      },
      p: { 'line-height': `${options.lineHeight} !important` },
      div: { 'line-height': `${options.lineHeight} !important` },
      li: { 'line-height': `${options.lineHeight} !important` },
      span: { 'line-height': `${options.lineHeight} !important` },
    };
  }

  private getThemeColor(theme: string): string {
    switch (theme) {
      case 'dark': return '#e0e0e0';
      case 'sepia': return '#4a3d2e';
      default: return '#1a1a1a';
    }
  }

  private getThemeBg(theme: string): string {
    switch (theme) {
      case 'dark': return '#1a1a1a';
      case 'sepia': return '#f4ecd8';
      default: return '#ffffff';
    }
  }
}

export function createEpubAdapter(): BookAdapter {
  return new EpubAdapter();
}
