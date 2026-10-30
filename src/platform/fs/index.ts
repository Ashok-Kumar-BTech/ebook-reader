import type { FileSystemProvider } from './types';
import { DesktopFsProvider } from './desktop';
import { AndroidFsProvider } from './android';
import { WebFsProvider } from './web';
import { checkIsTauri } from '../../utils/tauriApi';

export * from './types';
export { DesktopFsProvider } from './desktop';
export { AndroidFsProvider } from './android';
export { WebFsProvider } from './web';

let providerInstance: FileSystemProvider | null = null;

export async function getFileSystemProvider(): Promise<FileSystemProvider> {
  if (providerInstance) {
    return providerInstance;
  }

  const isTauriEnv = await checkIsTauri();
  if (!isTauriEnv) {
    providerInstance = new WebFsProvider();
    return providerInstance;
  }

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  if (isAndroid) {
    providerInstance = new AndroidFsProvider();
    return providerInstance;
  }

  providerInstance = new DesktopFsProvider();
  return providerInstance;
}
