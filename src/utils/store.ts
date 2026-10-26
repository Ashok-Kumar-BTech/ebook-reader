import { Store, LazyStore } from '@tauri-apps/plugin-store';
import { checkIsTauri } from './tauriApi';

/**
 * Fallback store implementation using localStorage for web development.
 * Used when not running in Tauri environment.
 */
class WebStore<T> {
  private key: string;
  private defaultValue: T;
  private cache: T | null = null;
  private loaded: boolean = false;

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  async load(): Promise<T> {
    if (this.loaded) return this.cache ?? this.defaultValue;
    
    try {
      const stored = localStorage.getItem(this.key);
      this.cache = stored ? JSON.parse(stored) : this.defaultValue;
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
class TypedStoreImpl<T> {
  private store: Store | LazyStore;
  private key: string;
  private defaultValue: T;
  private cache: T | null = null;
  private saveDebounceMs: number;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded: boolean = false;

  constructor(key: string, defaultValue: T, saveDebounceMs = 300) {
    this.key = key;
    this.defaultValue = defaultValue;
    this.saveDebounceMs = saveDebounceMs;
    this.store = new LazyStore(key + '.json');
  }

  async load(): Promise<T> {
    if (this.loaded) return this.cache ?? this.defaultValue;
    
    const stored = await this.store.get<T>(this.key);
    this.cache = stored ?? this.defaultValue;
    this.loaded = true;
    return this.cache;
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
