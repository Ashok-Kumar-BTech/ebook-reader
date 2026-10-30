import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';
import { extractDocumentTitle } from '../utils/pathUtils';

// Dynamic import for JSZip
let JSZip: any = null;

async function loadJSZip(): Promise<any> {
  if (JSZip) return JSZip;
  
  if (typeof window !== 'undefined') {
    JSZip = await import('jszip');
  }
  
  return JSZip;
}

export class CbzAdapter implements BookAdapter {
  readonly format = 'cbz' as const;
  
  private zip: any = null;
  private imageFiles: string[] = [];
  private pageCount: number = 0;
  private currentPage: number = 0;
  private title: string = 'Comic Book';

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const jszip = await loadJSZip();
    
    this.zip = new jszip.default ? jszip.default() : new jszip();
    await this.zip.loadAsync(fileData);
    
    // Find all image files in the archive
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    this.imageFiles = Object.keys(this.zip.files)
      .filter((name: string) => !this.zip.files[name].dir)
      .filter((name: string) => imageExtensions.some(ext => name.toLowerCase().endsWith(ext)))
      .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    
    this.pageCount = this.imageFiles.length;
    this.title = extractDocumentTitle(bookPath) || 'Comic Book';
    this.currentPage = 0;
    
    return {
      format: 'cbz',
      filePath: bookPath,
      title: this.title,
      pageCount: this.pageCount,
      metadata: {},
    };
  }

  unload(): void {
    this.zip = null;
    this.imageFiles = [];
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

  async search(_query: string): Promise<SearchResult[]> {
    // CBZ files are images, no text search
    return [];
  }

  async getTOC(): Promise<TOCItem[]> {
    // Generate TOC from image filenames
    return this.imageFiles.map((file, index) => ({
      id: `page-${index}`,
      label: file.split('/').pop() || `Page ${index + 1}`,
      location: index,
      level: 0,
    }));
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    const idx = (pageNum >= 1 && pageNum <= this.pageCount) ? pageNum - 1 : pageNum;
    if (!this.zip || idx < 0 || idx >= this.pageCount) return;
    
    const fileName = this.imageFiles[idx];
    const file = this.zip.files[fileName];
    if (!file) return;
    
    const blob = await file.async('blob');
    const url = URL.createObjectURL(blob);
    
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = 'auto';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    
    // Apply theme filter
    if (options.theme === 'dark') {
      img.style.filter = 'invert(1) hue-rotate(180deg)';
    } else if (options.theme === 'sepia') {
      img.style.filter = 'sepia(1) contrast(1.2) brightness(0.9)';
    }
    
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    if (options.continuousScroll) {
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'hidden';
    } else {
      container.style.width = 'max-content';
      container.style.height = 'max-content';
      container.style.minWidth = '100%';
      container.style.minHeight = '100%';
      container.style.overflow = 'visible';
    }
    container.appendChild(img);
    
    // Clean up object URL after load
    img.onload = () => URL.revokeObjectURL(url);
    
    this.currentPage = pageNum;
  }

  async renderPageRange(
    startPage: number,
    endPage: number,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    if (!this.zip) return;
    
    container.innerHTML = '';
    const startIdx = (startPage >= 1 && startPage <= this.pageCount) ? startPage - 1 : Math.max(0, startPage);
    const endIdx = (endPage >= 1 && endPage <= this.pageCount) ? endPage - 1 : Math.min(this.pageCount - 1, endPage);
    
    for (let pageNum = startIdx; pageNum <= endIdx && pageNum < this.pageCount; pageNum++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'cbz-page-item';
      pageWrapper.style.margin = `${options.margin / 2}px auto`;
      container.appendChild(pageWrapper);
      await this.renderPage(pageNum + 1, pageWrapper, options);
    }
    
    this.currentPage = endIdx + 1;
  }
}

export function createCbzAdapter(): BookAdapter {
  return new CbzAdapter();
}