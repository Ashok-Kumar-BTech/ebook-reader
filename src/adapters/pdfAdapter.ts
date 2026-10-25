import type { BookAdapter, BookInstance, RenderOptions, SearchResult, TOCItem } from '../types/reader';

// Dynamic import for pdf.js to avoid SSR issues and allow worker configuration
let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  
  if (typeof window !== 'undefined') {
    pdfjsLib = await import('pdfjs-dist');
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  
  return pdfjsLib;
}

export class PdfAdapter implements BookAdapter {
  readonly format = 'pdf' as const;
  
  private pdfDoc: any = null;
  private pageCount: number = 0;
  private currentPage: number = 1;
  private title: string = 'PDF Document';
  private author: string | undefined;

  async load(bookPath: string, fileData: Uint8Array): Promise<BookInstance> {
    const pdfjs = await loadPdfJs();
    
    const loadingTask = pdfjs.getDocument({ data: fileData });
    this.pdfDoc = await loadingTask.promise;
    this.pageCount = this.pdfDoc.numPages;
    
    const metadata = await this.pdfDoc.getMetadata();
    this.title = metadata.info?.Title || bookPath.split('/').pop() || 'PDF Document';
    this.author = metadata.info?.Author;
    this.currentPage = 1;
    
    return {
      format: 'pdf',
      filePath: bookPath,
      title: this.title,
      author: this.author,
      pageCount: this.pageCount,
      metadata: metadata.info || {},
    };
  }

  unload(): void {
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.pageCount = 0;
    this.currentPage = 1;
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async goToLocation(loc: number): Promise<void> {
    if (loc >= 1 && loc <= this.pageCount) {
      this.currentPage = loc;
    }
  }

  getCurrentLocation(): number {
    return this.currentPage;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.pdfDoc || !query.trim()) return [];
    
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();
    
    for (let pageNum = 1; pageNum <= this.pageCount; pageNum++) {
      try {
        const page = await this.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        
        if (text.toLowerCase().includes(searchTerm)) {
          const index = text.toLowerCase().indexOf(searchTerm);
          const start = Math.max(0, index - 100);
          const end = Math.min(text.length, index + query.length + 100);
          
          results.push({
            location: pageNum,
            context: text.substring(start, end),
            matchedText: query,
          });
        }
      } catch (e) {
        console.warn('Failed to search page ' + pageNum + ':', e);
      }
    }
    
    return results;
  }

  async getTOC(): Promise<TOCItem[]> {
    if (!this.pdfDoc) return [];
    
    try {
      const outline = await this.pdfDoc.getOutline();
      if (!outline) return [];
      
      const parseOutline = async (items: any[], level = 0): Promise<TOCItem[]> => {
        const result: TOCItem[] = [];
        for (let index = 0; index < items.length; index++) {
          const item = items[index];
          const location = item.dest ? await this.getPageNumberFromDest(item.dest) : index + 1;
          result.push({
            id: 'toc-' + level + '-' + index,
            label: item.title || 'Page ' + location,
            location,
            level,
            children: item.items ? await parseOutline(item.items, level + 1) : undefined,
          });
        }
        return result;
      };
      
      return parseOutline(outline);
    } catch (e) {
      console.warn('Failed to get TOC:', e);
      return [];
    }
  }

  private async getPageNumberFromDest(dest: any): Promise<number> {
    try {
      if (Array.isArray(dest)) {
        const pageRef = dest[0];
        if (pageRef && pageRef.num) {
          const pageIndex = await this.pdfDoc.getPageIndex(pageRef);
          return pageIndex + 1;
        }
      }
      return 1;
    } catch {
      return 1;
    }
  }

  async renderPage(pageNum: number, container: HTMLElement, options: RenderOptions): Promise<void> {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.pageCount) return;
    
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    const containerWidth = options.width - options.margin * 2;
    const scale = Math.min(containerWidth / viewport.width, 2);
    
    const scaledViewport = page.getViewport({ scale });
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    if (options.theme === 'dark') {
      canvas.style.filter = 'invert(1) hue-rotate(180deg)';
    } else if (options.theme === 'sepia') {
      canvas.style.filter = 'sepia(1) contrast(1.2) brightness(0.9)';
    }
    
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    
    container.innerHTML = '';
    container.appendChild(canvas);
    
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;
    
    this.currentPage = pageNum;
  }

  async renderPageRange(
    startPage: number,
    endPage: number,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    if (!this.pdfDoc) return;
    
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    for (let pageNum = startPage; pageNum <= endPage && pageNum <= this.pageCount; pageNum++) {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      const containerWidth = options.width - options.margin * 2;
      const scale = Math.min(containerWidth / viewport.width, 2);
      
      const scaledViewport = page.getViewport({ scale });
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      if (options.theme === 'dark') {
        canvas.style.filter = 'invert(1) hue-rotate(180deg)';
      } else if (options.theme === 'sepia') {
        canvas.style.filter = 'sepia(1) contrast(1.2) brightness(0.9)';
      }
      
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      canvas.style.margin = (options.margin / 2) + 'px auto';
      canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      
      fragment.appendChild(canvas);
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;
    }
    
    container.appendChild(fragment);
    this.currentPage = endPage;
  }
}

export function createPdfAdapter(): BookAdapter {
  return new PdfAdapter();
}