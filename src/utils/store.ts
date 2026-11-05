import { Store, LazyStore } from '@tauri-apps/plugin-store';
import { checkIsTauri } from './tauriApi';

/**
 * Returns whether the application is running in development mode (Vite dev server / tauri dev).
 */
export function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/**
 * Computes the scoped Tauri store file name.
 * Development builds use `${key}.dev.json` while production releases use `${key}.json`.
 */
export function getStoreFileName(key: string, isDev = isDevEnvironment()): string {
  return isDev ? `${key}.dev.json` : `${key}.json`;
}

/**
 * Computes the scoped web localStorage key.
 * Development builds use `dev:${key}` while production releases use `${key}`.
 */
export function getStorageKey(key: string, isDev = isDevEnvironment()): string {
  return isDev ? `dev:${key}` : key;
}

/**
 * Fallback store implementation using localStorage for web development.
 * Used when not running in Tauri environment.
 */
export class WebStore<T> {
  private key: string;
  private defaultValue: T;
  private cache: T | null = null;
  private loaded: boolean = false;

  constructor(key: string, defaultValue: T) {
    this.key = getStorageKey(key);
    this.defaultValue = defaultValue;
  }

  getStorageKey(): string {
    return this.key;
  }

  async load(): Promise<T> {
    if (this.loaded) return this.cache ?? this.defaultValue;
    
    try {
      const stored = localStorage.getItem(this.key);
      if (stored !== null) {
        this.cache = JSON.parse(stored);
      } else if (isDevEnvironment() && this.key.startsWith('dev:')) {
        // One-time self-healing migration: if dev key has no data, check legacy un-prefixed key
        const legacyKey = this.key.substring(4);
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData !== null) {
          this.cache = JSON.parse(legacyData);
          localStorage.setItem(this.key, legacyData);
          // Clear legacy key so production releases on the same device start clean
          localStorage.removeItem(legacyKey);
        } else {
          this.cache = this.defaultValue;
        }
      } else {
        this.cache = this.defaultValue;
      }
    } catch {
      this.cache = this.defaultValue;
    }
    this.loaded = true;
    return this.cache ?? this.defaultValue;
  }

  get(): T {
    return this.cache ?? this.defaultValue;
  }

  set(value: T | ((prev: T) => T)): void {
    const newValue = typeof value === 'function'
      ? (value as (prev: T) => T)(this.cache ?? this.defaultValue)
      : value;
    this.cache = newValue;
    try {
      localStorage.setItem(this.key, JSON.stringify(newValue));
    } catch {
      // Ignore localStorage errors (e.g., private browsing)
    }
  }

  patch(partial: Partial<T>): void {
    if (this.cache && typeof this.cache === 'object' && partial && typeof partial === 'object') {
      this.cache = { ...this.cache, ...partial } as T;
    } else {
      this.cache = partial as T;
    }
    try {
      localStorage.setItem(this.key, JSON.stringify(this.cache));
    } catch {
      // Ignore localStorage errors
    }
  }

  async flush(): Promise<void> {
    // No-op for localStorage (synchronous)
  }

  async clear(): Promise<void> {
    this.cache = this.defaultValue;
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignore
    }
  }
}

/**
 * Internal Tauri store implementation.
 * Kept separate to avoid loading Tauri imports in web context.
 */
export class TypedStoreImpl<T> {
  private store: Store | LazyStore;
  private key: string;
  private storeFileName: string;
  private defaultValue: T;
  private cache: T | null = null;
  private saveDebounceMs: number;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded: boolean = false;

  constructor(key: string, defaultValue: T, saveDebounceMs = 300) {
    this.key = key;
    this.defaultValue = defaultValue;
    this.saveDebounceMs = saveDebounceMs;
    this.storeFileName = getStoreFileName(key);
    this.store = new LazyStore(this.storeFileName);
  }

  getStoreFileName(): string {
    return this.storeFileName;
  }

  async load(): Promise<T> {
    if (this.loaded) return this.cache ?? this.defaultValue;
    
    try {
      const stored = await this.store.get<T>(this.key);
      if (stored !== null && stored !== undefined) {
        this.cache = stored;
      } else if (isDevEnvironment()) {
        // One-time self-healing migration: if in dev and *.dev.json is empty,
        // migrate existing dev test data from legacy *.json and sanitize legacy store
        try {
          const legacyStore = new LazyStore(`${this.key}.json`);
          const legacyData = await legacyStore.get<T>(this.key);
          if (legacyData !== null && legacyData !== undefined) {
            this.cache = legacyData;
            await this.store.set(this.key, legacyData);
            await this.store.save();
            // Wipe legacy store so production releases on this device start clean
            await legacyStore.delete(this.key);
            await legacyStore.save();
          } else {
            this.cache = this.defaultValue;
          }
        } catch {
          this.cache = this.defaultValue;
        }
      } else {
        this.cache = this.defaultValue;
      }
    } catch {
      this.cache = this.defaultValue;
    }

    this.loaded = true;
    return this.cache ?? this.defaultValue;
  }

  get(): T {
    return this.cache ?? this.defaultValue;
  }

  set(value: T | ((prev: T) => T)): void {
    const newValue = typeof value === 'function'
      ? (value as (prev: T) => T)(this.cache ?? this.defaultValue)
      : value;
    this.cache = newValue;
    this.scheduleSave();
  }

  patch(partial: Partial<T>): void {
    if (this.cache && typeof this.cache === 'object' && partial && typeof partial === 'object') {
      this.cache = { ...this.cache, ...partial } as T;
    } else {
      this.cache = partial as T;
    }
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => this.flush(), this.saveDebounceMs);
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.cache !== null) {
      await this.store.set(this.key, this.cache);
      await this.store.save();
    }
  }

  async clear(): Promise<void> {
    this.cache = this.defaultValue;
    await this.store.delete(this.key);
    await this.store.save();
  }
}

/**
 * Unified store interface that works in both Tauri and web environments.
 * Automatically uses Tauri store when in Tauri, localStorage fallback otherwise.
 */
export class UnifiedStore<T> {
  private tauriStore: TypedStoreImpl<T> | null = null;
  private webStore: WebStore<T> | null = null;
  private initialized: boolean = false;

  constructor(
    private key: string,
    private defaultValue: T,
    private saveDebounceMs = 300
  ) {}

  getStorageKey(): string {
    return getStorageKey(this.key);
  }

  getStoreFileName(): string {
    return getStoreFileName(this.key);
  }

  private async getStore() {
    if (this.initialized) {
      return this.tauriStore ?? this.webStore!;
    }
    
    const inTauri = await checkIsTauri();
    if (inTauri) {
      this.tauriStore = new TypedStoreImpl(this.key, this.defaultValue, this.saveDebounceMs);
    } else {
      this.webStore = new WebStore(this.key, this.defaultValue);
    }
    this.initialized = true;
    return this.tauriStore ?? this.webStore!;
  }

  async load(): Promise<T> {
    const store = await this.getStore();
    return store.load();
  }

  get(): T {
    if (this.tauriStore) return this.tauriStore.get();
    if (this.webStore) return this.webStore.get();
    return this.defaultValue;
  }

  set(value: T | ((prev: T) => T)): void {
    this.getStore().then(store => store.set(value));
  }

  patch(partial: Partial<T>): void {
    this.getStore().then(store => store.patch(partial));
  }

  async flush(): Promise<void> {
    const store = await this.getStore();
    return store.flush();
  }

  async clear(): Promise<void> {
    const store = await this.getStore();
    return store.clear();
  }
}

/**
 * Factory function to create a unified store that works in both Tauri and web.
 */
export function createStore<T>(key: string, defaultValue: T, saveDebounceMs = 300): UnifiedStore<T> {
  return new UnifiedStore(key, defaultValue, saveDebounceMs);
}
