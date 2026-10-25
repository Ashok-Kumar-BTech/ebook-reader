import type { Format, AdapterFactory, BookAdapter } from '../types/reader';
import { createPdfAdapter } from './pdfAdapter';
import { createEpubAdapter } from './epubAdapter';
import { createCbzAdapter } from './cbzAdapter';
import { createTxtAdapter } from './txtAdapter';
import { createHtmlAdapter, createDocxAdapter } from './htmlAdapter';

/**
 * Central registry for format adapters.
 * Maps file extensions to adapter factories.
 */
class FormatRegistry {
  private adapters: Map<string, AdapterFactory> = new Map();
  private instances: Map<string, BookAdapter> = new Map();

  /**
   * Register an adapter factory for a file extension
   */
  register(extension: string, factory: AdapterFactory): void {
    const ext = extension.toLowerCase().replace(/^\./, '');
    this.adapters.set(ext, factory);
  }

  /**
   * Register multiple extensions for the same factory
   */
  registerMultiple(extensions: string[], factory: AdapterFactory): void {
    extensions.forEach((ext) => this.register(ext, factory));
  }

  /**
   * Get an adapter instance for a file path (creates if needed)
   */
  getAdapterForPath(filePath: string): BookAdapter | null {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    const factory = this.adapters.get(ext);
    if (!factory) return null;

    // Return cached instance if exists
    const cached = this.instances.get(ext);
    if (cached) return cached;

    // Create new instance
    const instance = factory();
    this.instances.set(ext, instance);
    return instance;
  }

  /**
   * Get adapter by format identifier
   */
  getAdapterByFormat(format: Format): BookAdapter | null {
    // Find first extension for this format
    const entry = [...this.adapters.entries()].find(([ext]) => ext === format);
    if (!entry) return null;

    const [ext, factory] = entry;
    const cached = this.instances.get(ext);
    if (cached) return cached;

    const instance = factory();
    this.instances.set(ext, instance);
    return instance;
  }

  /**
   * Get all registered extensions
   */
  getSupportedExtensions(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * Check if a format is supported
   */
  isSupported(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext ? this.adapters.has(ext) : false;
  }

  /**
   * Clear all cached instances (useful for memory management)
   */
  clearInstances(): void {
    this.instances.forEach((instance) => instance.unload());
    this.instances.clear();
  }
}

// Singleton instance
export const formatRegistry = new FormatRegistry();

// Register built-in adapters
formatRegistry.registerMultiple(['pdf'], createPdfAdapter);
formatRegistry.registerMultiple(['epub'], createEpubAdapter);
formatRegistry.registerMultiple(['cbz', 'cbr'], createCbzAdapter);
formatRegistry.registerMultiple(['txt', 'text'], createTxtAdapter);
formatRegistry.registerMultiple(['html', 'htm', 'xhtml'], createHtmlAdapter);
formatRegistry.registerMultiple(['docx'], createDocxAdapter);

/**
 * Convenience function to register an adapter
 */
export function registerAdapter(extension: string | string[], factory: AdapterFactory): void {
  if (Array.isArray(extension)) {
    formatRegistry.registerMultiple(extension, factory);
  } else {
    formatRegistry.register(extension, factory);
  }
}

/**
 * Convenience function to get adapter for a path
 */
export function getAdapterForPath(filePath: string): BookAdapter | null {
  return formatRegistry.getAdapterForPath(filePath);
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return formatRegistry.getSupportedExtensions();
}

/**
 * Initialize all adapters (call at app startup)
 */
export function initializeAdapters(): void {
  // Adapters are registered at import time
  // This function exists for future extensibility
}