import type { Format } from '../types/reader';

export type ViewType = 'single' | 'two-page' | 'scroll';

export interface FormatInfo {
  format: Format;
  label: string;
  extensions: string[];
  mimeTypes: string[];
  badgeColor: string;
  views: ViewType[];
  reflowable: boolean;
}

export const FORMAT_DEFINITIONS: FormatInfo[] = [
  {
    format: 'pdf',
    label: 'PDF',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    views: ['single', 'two-page', 'scroll'],
    reflowable: false,
  },
  {
    format: 'epub',
    label: 'EPUB',
    extensions: ['epub'],
    mimeTypes: ['application/epub+zip'],
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    views: ['single', 'two-page', 'scroll'],
    reflowable: true,
  },
  {
    format: 'cbz',
    label: 'CBZ',
    extensions: ['cbz', 'cbr'],
    mimeTypes: ['application/vnd.comicbook+zip', 'application/x-cbz'],
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    views: ['single', 'two-page', 'scroll'],
    reflowable: false,
  },
  {
    format: 'txt',
    label: 'TXT',
    extensions: ['txt', 'text'],
    mimeTypes: ['text/plain'],
    badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    views: ['scroll'],
    reflowable: true,
  },
  {
    format: 'html',
    label: 'HTML',
    extensions: ['html', 'htm', 'xhtml'],
    mimeTypes: ['text/html', 'application/xhtml+xml'],
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    views: ['scroll'],
    reflowable: true,
  },
  {
    format: 'docx',
    label: 'DOCX',
    extensions: ['docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    views: ['scroll'],
    reflowable: true,
  },
];

// Fast O(1) extension lookup map
const EXT_MAP = new Map<string, FormatInfo>();
for (const def of FORMAT_DEFINITIONS) {
  for (const ext of def.extensions) {
    EXT_MAP.set(ext.toLowerCase().replace(/^\./, ''), def);
  }
}

export function extractExtension(filePath: string): string {
  if (!filePath) return '';
  const clean = filePath.split('?')[0].split('#')[0];
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1) return '';
  return clean.slice(lastDot + 1).toLowerCase();
}

export function getFormatInfo(filePath: string): FormatInfo | null {
  const ext = extractExtension(filePath);
  return EXT_MAP.get(ext) || null;
}

export function isFormatSupported(filePath: string): boolean {
  const ext = extractExtension(filePath);
  return EXT_MAP.has(ext);
}

export function getFormatBadge(filePath: string): { label: string; color: string } | null {
  const info = getFormatInfo(filePath);
  if (!info) return null;
  return { label: info.label, color: info.badgeColor };
}

export function getAllSupportedExtensions(): string[] {
  return Array.from(EXT_MAP.keys());
}
