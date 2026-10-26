import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';

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
  private pageCount: number = 0;
  private currentLocation: number = 0;
  private title: string = 'EPUB Document';
  private author: string | undefined;
  private spineItems: any[] = [];
  private toc: TOCItem[] = [];

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const epub = await loadEpubJs();
    
    const blob = new Blob([fileData.buffer as ArrayBuffer], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    this.book = epub.default ? epub.default(url) : epub(url);
    
    const metadata = await this.book.loaded.metadata;
    this.title = metadata.title || bookPath.split('/').pop() || 'EPUB Document';
    this.author = metadata.creator;
    this.spineItems = this.book.spine.spineItems;
    this.pageCount = this.spineItems.length;
    this.toc = await this.parseTOC();
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
    if (!this.book || !this.book.navigation) return [];
    try {
      const toc = this.book.navigation.toc;
      if (!toc) return [];
      const parseTocItems = (items: any[], level = 0): TOCItem[] => {
        return items.map((item, index) => ({
          id: `toc-${level}-${index}`,
          label: item.label || `Chapter ${index + 1}`,
          location: item.href ? this.getLocationFromHref(item.href) : index,
          level,
          children: item.subitems ? parseTocItems(item.subitems, level + 1) : undefined,
        }));
      };
      return parseTocItems(toc);
    } catch (e) {
      console.warn('Failed to parse TOC:', e);
      return [];
    }
  }

  private getLocationFromHref(href: string): number {
    const index = this.spineItems.findIndex(item => item.href === href);
    return index >= 0 ? index : 0;
  }

  unload(): void {
    if (this.rendition) { this.rendition.destroy(); this.rendition = null; }
    if (this.book) { this.book.destroy(); this.book = null; }
    this.pageCount = 0;
    this.currentLocation = 0;
    this.spineItems = [];
    this.toc = [];
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async goToLocation(loc: number): Promise<void> {
    if (!this.rendition || loc < 0 || loc >= this.pageCount) return;
    try {
      const spineItem = this.spineItems[loc];
      if (spineItem) {
        await this.rendition.display(spineItem.href);
        this.currentLocation = loc;
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
    return this.toc;
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    if (!this.book || pageNum < 0 || pageNum >= this.pageCount) return;
    
    if (!this.rendition) {
      this.rendition = this.book.renderTo(container, {
        width: options.width - options.margin * 2,
        height: options.height - options.margin * 2,
        spread: options.twoPageView ? 'always' : 'none',
        minSpreadWidth: 800,
        styles: {
          body: {
            'font-family': this.getFontFamily(options.fontFamily),
            'font-size': options.fontSize + 'px',
            'line-height': options.lineHeight,
            'margin': options.margin + 'px',
            'color': this.getThemeColor(options.theme),
            'background-color': this.getThemeBg(options.theme),
          },
        },
      });
      
      this.rendition.on('relocated', (location: any) => {
        if (location.start && location.start.cfi) {
          this.currentLocation = this.getLocationFromCfi(location.start.cfi);
        }
      });
    }
    
    const idx = (pageNum >= 1 && pageNum <= this.pageCount) ? pageNum - 1 : Math.max(0, pageNum);
    const spineItem = this.spineItems[idx];
    if (spineItem) {
      await this.rendition.display(spineItem.href);
      this.currentLocation = idx;
    }
  }

  async renderPageRange(
    startPage: number,
    endPage: number,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    if (!this.book) return;
    container.innerHTML = '';
    const boundedStart = Math.max(1, startPage);
    const boundedEnd = Math.min(endPage, this.pageCount);
    
    for (let pageNum = boundedStart; pageNum <= boundedEnd; pageNum++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'epub-page-item';
      pageWrapper.style.margin = `${options.margin / 2}px auto`;
      container.appendChild(pageWrapper);
      await this.renderPage(pageNum, pageWrapper, options);
    }
    this.currentLocation = boundedEnd;
  }

  private getFontFamily(fontFamily: string): string {
    switch (fontFamily) {
      case 'serif': return 'Georgia, "Times New Roman", serif';
      case 'sans': return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'mono': return '"Fira Code", "Consolas", monospace';
      default: return 'Georgia, "Times New Roman", serif';
    }
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

  private getLocationFromCfi(_cfi: string): number {
    return this.currentLocation;
  }
}

export function createEpubAdapter(): BookAdapter {
  return new EpubAdapter();
}