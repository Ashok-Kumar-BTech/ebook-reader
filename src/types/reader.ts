/**
 * Core type definitions for the book reader adapters
 */

export type Format = 'pdf' | 'epub' | 'cbz' | 'txt' | 'html' | 'docx';

export interface RenderOptions {
  width: number;
  height: number;
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
  margin: number;
  fontFamily: 'serif' | 'sans' | 'mono';
  twoPageView: boolean;
  continuousScroll: boolean;
}

export interface SearchResult {
  location: number;
  context: string;
  matchedText: string;
}

export interface TOCItem {
  id: string;
  label: string;
  location: number;
  level: number;
  children?: TOCItem[];
}

export interface Bookmark {
  id: string;
  location: number;
  label?: string;
  note?: string;
  createdAt: number;
}

export interface BookInstance {
  format: Format;
  filePath: string;
  title: string;
  author?: string;
  pageCount: number;
  metadata: Record<string, unknown>;
}

export interface BookAdapter {
  readonly format: Format;
  
  /**
   * Load a book from file data
   */
  load(bookPath: string, fileData: Uint8Array): Promise<BookInstance>;
  
  /**
   * Unload and cleanup resources
   */
  unload(): void;
  
  /**
   * Get total page/location count
   */
  getPageCount(): number;
  
  /**
   * Navigate to a specific location
   */
  goToLocation(loc: number): Promise<void>;
  
  /**
   * Get current location
   */
  getCurrentLocation(): number;
  
  /**
   * Search within the book
   */
  search(query: string): Promise<SearchResult[]>;
  
  /**
   * Get table of contents
   */
  getTOC(): Promise<TOCItem[]>;
  
  /**
   * Render a page to the given container
   */
  renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void>;
  
  /**
   * Render a range of pages (for continuous scroll)
   */
  renderPageRange?(startPage: number, endPage: number, container: HTMLElement, options: RenderOptions): Promise<void>;
}

export interface AdapterFactory {
  (): BookAdapter;
}

export const SUPPORTED_EXTENSIONS: Record<Format, string[]> = {
  pdf: ['pdf'],
  epub: ['epub'],
  cbz: ['cbz', 'cbr'],
  txt: ['txt', 'text'],
  html: ['html', 'htm', 'xhtml'],
  docx: ['docx'],
};

export function getFormatFromPath(path: string): Format | null {
  const ext = path.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  
  for (const [format, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return format as Format;
    }
  }
  return null;
}

export function getAllSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_EXTENSIONS).flat();
}