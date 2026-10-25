import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';

export class TxtAdapter implements BookAdapter {
  readonly format = 'txt' as const;
  
  private content: string = '';
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'Text Document';
  private pages: string[] = [];
  private charsPerPage: number = 3000;

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    this.content = decoder.decode(fileData);
    this.title = bookPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Text Document';
    this.pages = this.splitIntoPages(this.content);
    this.pageCount = this.pages.length;
    this.currentPage = 0;
    return { format: 'txt', filePath: bookPath, title: this.title, pageCount: this.pageCount, metadata: {} };
  }

  private splitIntoPages(text: string): string[] {
    const pages: string[] = [];
    let currentPage = '';
    const paragraphs = text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      if (currentPage.length + para.length > this.charsPerPage && currentPage.length > 0) {
        pages.push(currentPage.trim());
        currentPage = para;
      } else {
        currentPage += (currentPage ? '\n\n' : '') + para;
      }
    }
    if (currentPage.trim()) pages.push(currentPage.trim());
    return pages.length > 0 ? pages : [text];
  }

  unload(): void { this.content = ''; this.pages = []; this.pageCount = 0; this.currentPage = 0; }

  getPageCount(): number { return this.pageCount; }

  async goToLocation(loc: number): Promise<void> { if (loc >= 0 && loc < this.pageCount) this.currentPage = loc; }

  getCurrentLocation(): number { return this.currentPage; }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();
    const lines = this.content.split('\n');
    lines.forEach((line, lineIndex) => {
      if (line.toLowerCase().includes(searchTerm)) {
        const charIndex = lines.slice(0, lineIndex + 1).join('\n').length;
        let pageIndex = 0;
        let charCount = 0;
        for (let i = 0; i < this.pages.length; i++) {
          charCount += this.pages[i].length + 2;
          if (charCount > charIndex) { pageIndex = i; break; }
        }
        results.push({ location: pageIndex, context: line.trim().substring(0, 200), matchedText: query });
      }
    });
    return results;
  }

  async getTOC(): Promise<TOCItem[]> {
    return this.pages.map((page, index) => {
      const firstLine = page.split('\n')[0].trim().substring(0, 50);
      return { id: 'page-' + index, label: firstLine || 'Page ' + (index + 1), location: index, level: 0 };
    });
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    if (pageNum < 0 || pageNum >= this.pageCount) return;
    const text = this.pages[pageNum];
    const div = document.createElement('div');
    div.style.whiteSpace = 'pre-wrap';
    div.style.fontFamily = this.getFontFamily(options.fontFamily);
    div.style.fontSize = options.fontSize + 'px';
    div.style.lineHeight = options.lineHeight.toString();
    div.style.margin = options.margin + 'px';
    div.style.color = this.getThemeColor(options.theme);
    div.style.backgroundColor = this.getThemeBg(options.theme);
    div.style.maxWidth = (options.width - options.margin * 2) + 'px';
    div.style.margin = '0 auto';
    div.style.padding = options.margin + 'px';
    div.textContent = text;
    container.innerHTML = '';
    container.appendChild(div);
    this.currentPage = pageNum;
  }

  async renderPageRange(startPage: number, endPage: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let pageNum = startPage; pageNum <= endPage && pageNum < this.pageCount; pageNum++) {
      const text = this.pages[pageNum];
      const div = document.createElement('div');
      div.style.whiteSpace = 'pre-wrap';
      div.style.fontFamily = this.getFontFamily(options.fontFamily);
      div.style.fontSize = options.fontSize + 'px';
      div.style.lineHeight = options.lineHeight.toString();
      div.style.marginBottom = options.margin * 2 + 'px';
      div.style.color = this.getThemeColor(options.theme);
      div.style.backgroundColor = this.getThemeBg(options.theme);
      div.style.padding = options.margin + 'px';
      div.style.borderRadius = '4px';
      div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      div.textContent = text;
      fragment.appendChild(div);
    }
    container.appendChild(fragment);
    this.currentPage = endPage;
  }

  private getFontFamily(fontFamily: string): string {
    switch (fontFamily) { case 'serif': return 'Georgia, "Times New Roman", serif'; case 'sans': return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; case 'mono': return '"Fira Code", "Consolas", monospace'; default: return 'Georgia, "Times New Roman", serif'; }
  }

  private getThemeColor(theme: string): string {
    switch (theme) { case 'dark': return '#e0e0e0'; case 'sepia': return '#4a3d2e'; default: return '#1a1a1a'; }
  }

  private getThemeBg(theme: string): string {
    switch (theme) { case 'dark': return '#1a1a1a'; case 'sepia': return '#f4ecd8'; default: return '#ffffff'; }
  }
}

export function createTxtAdapter(): BookAdapter { return new TxtAdapter(); }