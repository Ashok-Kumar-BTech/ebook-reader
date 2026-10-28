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
    
    const fileName = bookPath.split(/[\/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'PDF Document';
    this.title = fileName;
    this.currentPage = 1;

    // Asynchronously resolve metadata without blocking initial open
    this.pdfDoc.getMetadata().then((metadata: any) => {
      if (metadata?.info?.Title) this.title = metadata.info.Title;
      if (metadata?.info?.Author) this.author = metadata.info.Author;
    }).catch(() => {});
    
    return {
      format: 'pdf',
      filePath: bookPath,
      title: this.title,
      author: this.author,
      pageCount: this.pageCount,
      metadata: {},
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
    const searchTerm = query.toLowerCase().trim();
    
    for (let pageNum = 1; pageNum <= this.pageCount; pageNum++) {
      try {
        const page = await this.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Assemble text stream respecting EOL and natural word spaces
        let rawText = '';
        for (const item of textContent.items as any[]) {
          if (!item.str) continue;
          rawText += item.str;
          if (item.hasEOL) {
            rawText += '\n';
          } else if (!item.str.endsWith(' ') && !item.str.endsWith('\t')) {
            rawText += ' ';
          }
        }
        
        // Clean multi-spaces while keeping single spaces
        const normalizedText = rawText.replace(/[ \t]+/g, ' ');
        const lowerText = normalizedText.toLowerCase();
        
        let searchIndex = lowerText.indexOf(searchTerm);
        while (searchIndex !== -1 && results.length < 500) {
          const start = Math.max(0, searchIndex - 80);
          const end = Math.min(normalizedText.length, searchIndex + searchTerm.length + 80);
          const snippet = normalizedText.substring(start, end).replace(/\n+/g, ' ').trim();
          
          results.push({
            location: pageNum,
            context: snippet,
            matchedText: query,
          });
          
          searchIndex = lowerText.indexOf(searchTerm, searchIndex + searchTerm.length);
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
    const baseViewport = page.getViewport({ scale: 1.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    const availableWidth = Math.max(100, options.width - options.margin * 2);
    const availableHeight = Math.max(100, options.height - options.margin * 2);
    const scaleX = availableWidth / baseViewport.width;
    const scaleY = availableHeight / baseViewport.height;

    // For continuous scroll, fit to available width; for paginated views, fit completely (contain)
    const fitScale = options.continuousScroll ? scaleX : Math.min(scaleX, scaleY);
    
    // Pixel-perfect integer geometry: ensure CSS display dimensions are exact integers
    const cssWidth = Math.floor(baseViewport.width * fitScale);
    const cssHeight = Math.floor(baseViewport.height * fitScale);

    // Native display pixel ratio and zoom factor
    const effectiveZoom = options.zoom && options.zoom > 0 ? options.zoom : 1.0;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    
    // Exact integer physical backing store buffer
    const pixelWidth = Math.floor(cssWidth * effectiveZoom * dpr);
    const pixelHeight = Math.floor(cssHeight * effectiveZoom * dpr);
    
    // Safety guard against exceeding maximum canvas texture dimensions (8192px)
    let renderScale = pixelWidth / baseViewport.width;
    const maxDimension = 8192;
    if (pixelWidth > maxDimension || pixelHeight > maxDimension) {
      const maxScale = maxDimension / Math.max(baseViewport.width, baseViewport.height);
      renderScale = maxScale;
      canvas.width = Math.floor(baseViewport.width * maxScale);
      canvas.height = Math.floor(baseViewport.height * maxScale);
    } else {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const scaledViewport = page.getViewport({ scale: renderScale });
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    // Enable high-quality smoothing for any downscaled raster elements inside the PDF
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    if (options.theme === 'dark') {
      canvas.style.filter = 'invert(1) hue-rotate(180deg)';
    } else if (options.theme === 'sepia') {
      canvas.style.filter = 'sepia(1) contrast(1.2) brightness(0.9)';
    } else {
      canvas.style.filter = 'none';
    }
    
    canvas.style.display = 'block';
    canvas.style.margin = 'auto';
    canvas.style.imageRendering = '-webkit-optimize-contrast';
    
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
    container.appendChild(canvas);
    
    try {
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;
    } catch (renderErr: unknown) {
      const errName = (renderErr as { name?: string })?.name;
      if (errName !== 'RenderingCancelledException') {
        throw renderErr;
      }
    }
    
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
    const boundedStart = Math.max(1, startPage);
    const boundedEnd = Math.min(endPage, this.pageCount);
    
    for (let pageNum = boundedStart; pageNum <= boundedEnd; pageNum++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-item';
      pageWrapper.style.margin = `${options.margin / 2}px auto`;
      container.appendChild(pageWrapper);
      await this.renderPage(pageNum, pageWrapper, options);
    }
    
    this.currentPage = boundedEnd;
  }
}

export function createPdfAdapter(): BookAdapter {
  return new PdfAdapter();
}