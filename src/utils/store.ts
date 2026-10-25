import { Store, LazyStore } from '@tauri-apps/plugin-store';

/**
 * Typed wrapper around Tauri Store for type-safe persistence.
 * Uses JSON serialization with automatic hydration/persistence.
 */
export class TypedStore<T> {
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

  /**
   * Load the store from disk, returning the stored value or default.
   * Call once at app startup.
   */
  async load(): Promise<T> {
    if (this.loaded) return this.cache ?? this.defaultValue;
    
    // LazyStore loads automatically on first access
    const stored = await this.store.get<T>(this.key);
    this.cache = stored ?? this.defaultValue;
    this.loaded = true;
    return this.cache;
  }

  /**
   * Get current cached value (synchronous, after load()).
   */
  get(): T {
    return this.cache ?? this.defaultValue;
  }

  /**
   * Update the value and schedule a debounced save.
   */
  set(value: T | ((prev: T) => T)): void {
    const newValue = typeof value === 'function'
      ? (value as (prev: T) => T)(this.cache ?? this.defaultValue)
      : value;
    this.cache = newValue;
    this.scheduleSave();
  }

  /**
   * Partial update for object types.
   */
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

  /**
   * Immediately persist to disk.
   */
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

  /**
   * Clear the stored value and reset to default.
   */
  async clear(): Promise<void> {
    this.cache = this.defaultValue;
    await this.store.delete(this.key);
    await this.store.save();
  }
}

/**
 * Factory function to create a typed store with a default value.
 */
export function createStore<T>(key: string, defaultValue: T, saveDebounceMs = 300): TypedStore<T> {
  return new TypedStore(key, defaultValue, saveDebounceMs);
}