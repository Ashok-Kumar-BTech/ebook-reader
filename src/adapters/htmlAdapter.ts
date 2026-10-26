import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';
import DOMPurify from 'dompurify';
import mammoth from 'mammoth';

export class HtmlAdapter implements BookAdapter {
  readonly format = 'html' as const;
  private content: string = '';
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'HTML Document';
  private sections: string[] = [];

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawHtml = decoder.decode(fileData);
    const sanitized = DOMPurify.sanitize(rawHtml, {
      WHOLE_DOCUMENT: false,
      ADD_TAGS: ['style'],
    });

    this.title = bookPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'HTML Document';
    this.content = sanitized;
    // For HTML, provide a single continuous document or chapter sections
    this.sections = [sanitized];
    this.pageCount = this.sections.length;
    this.currentPage = 0;

    return {
      format: 'html',
      filePath: bookPath,
      title: this.title,
      pageCount: this.pageCount,
      metadata: {},
    };
  }

  unload(): void {
    this.content = '';
    this.sections = [];
    this.pageCount = 0;
    this.currentPage = 0;
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async goToLocation(loc: number): Promise<void> {
    if (loc >= 0 && loc < this.pageCount) {
      this.currentPage = loc;
    }
  }

  getCurrentLocation(): number {
    return this.currentPage;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || !this.content) return [];
    const textOnly = this.content.replace(/<[^>]*>/g, ' ');
    const results: SearchResult[] = [];
    const lower = textOnly.toLowerCase();
    const qLower = query.toLowerCase();
    let index = lower.indexOf(qLower);
    while (index !== -1 && results.length < 50) {
      const start = Math.max(0, index - 60);
      const end = Math.min(textOnly.length, index + query.length + 60);
      results.push({
        location: 0,
        context: textOnly.slice(start, end).trim(),
        matchedText: query,
      });
      index = lower.indexOf(qLower, index + query.length);
    }
    return results;
  }

  async getTOC(): Promise<TOCItem[]> {
    return [{
      id: 'html-start',
      label: this.title,
      location: 0,
      level: 0,
    }];
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    const html = this.sections[pageNum] || this.content;
    const wrapper = document.createElement('div');
    wrapper.className = 'html-book-content prose max-w-none';
    wrapper.style.fontFamily = this.getFontFamily(options.fontFamily);
    wrapper.style.fontSize = `${options.fontSize}px`;
    wrapper.style.lineHeight = String(options.lineHeight);
    wrapper.style.padding = `${options.margin}px`;
    wrapper.style.maxWidth = `${Math.max(400, options.width - options.margin * 2)}px`;
    wrapper.style.margin = '0 auto';
    wrapper.style.color = this.getThemeColor(options.theme);
    wrapper.style.backgroundColor = this.getThemeBg(options.theme);
    wrapper.innerHTML = html;

    container.innerHTML = '';
    container.appendChild(wrapper);
    this.currentPage = pageNum;
  }

  async renderPageRange(startPage: number, _endPage: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    await this.renderPage(startPage, container, options);
  }

  private getFontFamily(font: 'serif' | 'sans' | 'mono'): string {
    switch (font) {
      case 'serif': return 'Georgia, Cambria, "Times New Roman", Times, serif';
      case 'sans': return 'Inter, system-ui, -apple-system, sans-serif';
      case 'mono': return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    }
  }

  private getThemeColor(theme: 'light' | 'dark' | 'sepia'): string {
    switch (theme) {
      case 'dark': return '#f3f4f6';
      case 'sepia': return '#5f4b32';
      case 'light': return '#111827';
    }
  }

  private getThemeBg(theme: 'light' | 'dark' | 'sepia'): string {
    switch (theme) {
      case 'dark': return '#111827';
      case 'sepia': return '#fbf0d9';
      case 'light': return '#ffffff';
    }
  }
}

export class DocxAdapter implements BookAdapter {
  readonly format = 'docx' as const;
  private content: string = '';
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'Word Document';

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    this.title = bookPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Word Document';
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: fileData.buffer as ArrayBuffer });
      this.content = DOMPurify.sanitize(result.value);
    } catch (err) {
      console.error('Docx conversion error:', err);
      this.content = '<p>Unable to parse Word document content.</p>';
    }

    this.pageCount = 1;
    this.currentPage = 0;
    return {
      format: 'docx',
      filePath: bookPath,
      title: this.title,
      pageCount: this.pageCount,
      metadata: {},
    };
  }

  unload(): void {
    this.content = '';
    this.pageCount = 0;
    this.currentPage = 0;
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async goToLocation(loc: number): Promise<void> {
    this.currentPage = loc;
  }

  getCurrentLocation(): number {
    return this.currentPage;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || !this.content) return [];
    const textOnly = this.content.replace(/<[^>]*>/g, ' ');
    const results: SearchResult[] = [];
    const lower = textOnly.toLowerCase();
    const qLower = query.toLowerCase();
    let index = lower.indexOf(qLower);
    while (index !== -1 && results.length < 50) {
      const start = Math.max(0, index - 60);
      const end = Math.min(textOnly.length, index + query.length + 60);
      results.push({
        location: 0,
        context: textOnly.slice(start, end).trim(),
        matchedText: query,
      });
      index = lower.indexOf(qLower, index + query.length);
    }
    return results;
  }

  async getTOC(): Promise<TOCItem[]> {
    return [{
      id: 'docx-start',
      label: this.title,
      location: 0,
      level: 0,
    }];
  }

  async renderPage(_pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    const wrapper = document.createElement('div');
    wrapper.className = 'docx-book-content prose max-w-none';
    wrapper.style.fontFamily = options.fontFamily === 'serif' ? 'Georgia, serif' : options.fontFamily === 'mono' ? 'monospace' : 'sans-serif';
    wrapper.style.fontSize = `${options.fontSize}px`;
    wrapper.style.lineHeight = String(options.lineHeight);
    wrapper.style.padding = `${options.margin}px`;
    wrapper.style.maxWidth = `${Math.max(400, options.width - options.margin * 2)}px`;
    wrapper.style.margin = '0 auto';
    wrapper.style.color = options.theme === 'dark' ? '#f3f4f6' : options.theme === 'sepia' ? '#5f4b32' : '#111827';
    wrapper.style.backgroundColor = options.theme === 'dark' ? '#111827' : options.theme === 'sepia' ? '#fbf0d9' : '#ffffff';
    wrapper.innerHTML = this.content;

    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  async renderPageRange(startPage: number, _endPage: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    await this.renderPage(startPage, container, options);
  }
}

export function createHtmlAdapter(): BookAdapter {
  return new HtmlAdapter();
}

export function createDocxAdapter(): BookAdapter {
  return new DocxAdapter();
}