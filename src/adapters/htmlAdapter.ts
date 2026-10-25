import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';

export class HtmlAdapter implements BookAdapter {
  readonly format = 'html' as const;
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'HTML Document';

  async load(bookPath: string, _fileData: Uint8Array): Promise<BookInstance> {
    this.title = bookPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'HTML Document';
    this.pageCount = 1;
    this.currentPage = 0;
    return { format: 'html', filePath: bookPath, title: this.title, pageCount: this.pageCount, metadata: {} };
  }

  unload(): void { this.pageCount = 0; this.currentPage = 0; }
  getPageCount(): number { return this.pageCount; }
  async goToLocation(loc: number): Promise<void> { if (loc >= 0 && loc < this.pageCount) this.currentPage = loc; }
  getCurrentLocation(): number { return this.currentPage; }
  async search(_query: string): Promise<SearchResult[]> { return []; }
  async getTOC(): Promise<TOCItem[]> { return []; }
  async renderPage(_pageNum: number, _container: HTMLElement, _options: RenderOptions): Promise<void> { }
  async renderPageRange(_startPage: number, _endPage: number, _container: HTMLElement, _options: RenderOptions): Promise<void> { }
}

export class DocxAdapter implements BookAdapter {
  readonly format = 'docx' as const;
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'Word Document';

  async load(bookPath: string, _fileData: Uint8Array): Promise<BookInstance> {
    this.title = bookPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Word Document';
    this.pageCount = 1;
    this.currentPage = 0;
    return { format: 'docx', filePath: bookPath, title: this.title, pageCount: this.pageCount, metadata: {} };
  }

  unload(): void { this.pageCount = 0; this.currentPage = 0; }
  getPageCount(): number { return this.pageCount; }
  async goToLocation(loc: number): Promise<void> { this.currentPage = loc; }
  getCurrentLocation(): number { return this.currentPage; }
  async search(_query: string): Promise<SearchResult[]> { return []; }
  async getTOC(): Promise<TOCItem[]> { return []; }
  async renderPage(_pageNum: number, _container: HTMLElement, _options: RenderOptions): Promise<void> { }
  async renderPageRange(_startPage: number, _endPage: number, _container: HTMLElement, _options: RenderOptions): Promise<void> { }
}

export function createHtmlAdapter(): BookAdapter { return new HtmlAdapter(); }
export function createDocxAdapter(): BookAdapter { return new DocxAdapter(); }