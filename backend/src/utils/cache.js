/**
 * cache.js
 * In-memory TTL Cache với LRU Eviction & dọn dẹp tự động.
 * Dùng để cache các kết quả tính toán AI, recommendations, vector searches.
 */

class MemoryCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.store = new Map();

    // Dọn dẹp các key hết hạn định kỳ mỗi 2 phút
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);

    // Không ngăn Node.js process thoát
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Lấy giá trị từ cache.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    // Refresh vị trí trong Map (LRU)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * Lưu giá trị vào cache với thời hạn (giây).
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Mặc định 300s (5 phút)
   */
  set(key, value, ttlSeconds = 300) {
    if (this.store.size >= this.maxSize) {
      // Xóa phần tử cũ nhất (đầu tiên trong Map)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Xóa một key cụ thể.
   * @param {string} key
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Xóa các key khớp với tiền tố hoặc biểu thức chính quy.
   * @param {string|RegExp} pattern
   */
  delPattern(pattern) {
    const isRegex = pattern instanceof RegExp;
    for (const key of this.store.keys()) {
      const match = isRegex ? pattern.test(key) : key.startsWith(pattern);
      if (match) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Dọn dẹp tất cả các mục đã hết hạn.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Xóa toàn bộ cache.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Trả về số phần tử hiện có trong cache.
   */
  get size() {
    return this.store.size;
  }
}

export const memoryCache = new MemoryCache();
