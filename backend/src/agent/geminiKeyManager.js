/**
 * geminiKeyManager.js
 *
 * Quản lý nhiều Gemini API key với cơ chế fallback tự động.
 * - Chỉ đổi key khi key hiện tại bị lỗi (rate limit 429 hoặc quota hết)
 * - Hỗ trợ không giới hạn số key (khuyến nghị 10+)
 * - Tự động cooldown key bị lỗi và thử lại sau một thời gian
 * - Log trạng thái từng key để dễ debug
 */

// ─── CẤU HÌNH ────────────────────────────────────────────────────────────────

/**
 * Thời gian cooldown (ms) trước khi thử lại key bị lỗi.
 * - RATE_LIMIT (429): chờ ngắn hơn vì chỉ bị giới hạn tạm thời
 * - QUOTA_EXCEEDED: chờ dài hơn (quota thường reset sau 1 ngày)
 */
const COOLDOWN_MS = {
  RATE_LIMIT:     60_000,        // 1 phút
  QUOTA_EXCEEDED: 24 * 3600_000, // 24 giờ
  UNKNOWN_ERROR:  30_000,        // 30 giây (lỗi khác)
};

// ─── TRẠNG THÁI KEY ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} KeyState
 * @property {string}  key          - API key
 * @property {string}  label        - Nhãn hiển thị (vd: "KEY_1")
 * @property {boolean} active       - Đang hoạt động bình thường
 * @property {number}  failCount    - Số lần lỗi liên tiếp
 * @property {number}  cooldownUntil - Timestamp (ms) hết cooldown
 * @property {string}  lastError    - Loại lỗi gần nhất
 * @property {number}  totalCalls   - Tổng số lần được gọi
 * @property {number}  totalErrors  - Tổng số lần lỗi
 */

// ─────────────────────────────────────────────────────────────────────────────

class GeminiKeyManager {
  constructor() {
    /** @type {KeyState[]} */
    this.keys = [];
    this.currentIndex = 0;
    this._initialized = false;
  }

  // ─── KHỞI TẠO ──────────────────────────────────────────────────────────────

  /**
   * Đọc tất cả key từ biến môi trường.
   * Tên biến: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
   * hoặc GEMINI_API_KEY_1 đến GEMINI_API_KEY_N
   */
  init() {
    if (this._initialized) return;

    const rawKeys = this._loadKeysFromEnv();

    if (rawKeys.length === 0) {
      throw new Error(
        "[KeyManager] Không tìm thấy GEMINI_API_KEY nào trong .env!\n" +
        "Thêm: GEMINI_API_KEY=key1, GEMINI_API_KEY_2=key2, ..."
      );
    }

    this.keys = rawKeys.map((key, i) => ({
      key,
      label:         i === 0 ? "KEY_1" : `KEY_${i + 1}`,
      active:        true,
      failCount:     0,
      cooldownUntil: 0,
      lastError:     null,
      totalCalls:    0,
      totalErrors:   0,
    }));

    this.currentIndex = 0;
    this._initialized = true;

    console.log(
      `[KeyManager] ✅ Đã tải ${this.keys.length} Gemini API key(s): ` +
      this.keys.map((k) => k.label).join(", ")
    );
  }

  /**
   * Đọc key từ .env theo thứ tự ưu tiên:
   * GEMINI_API_KEY → GEMINI_API_KEY_2 → GEMINI_API_KEY_3 → ...
   * Bỏ qua key trùng lặp hoặc rỗng.
   */
  _loadKeysFromEnv() {
    const keys = new Set();

    // Key đầu tiên (không có số)
    if (process.env.GEMINI_API_KEY?.trim()) {
      keys.add(process.env.GEMINI_API_KEY.trim());
    }

    // Key từ _2 đến _20 (có thể mở rộng thêm)
    for (let i = 2; i <= 20; i++) {
      const val = process.env[`GEMINI_API_KEY_${i}`]?.trim();
      if (val) keys.add(val);
    }

    return [...keys];
  }

  // ─── LẤY KEY HIỆN TẠI ─────────────────────────────────────────────────────

  /**
   * Trả về API key đang được sử dụng.
   * Tự động tìm key khả dụng nếu key hiện tại đang cooldown.
   * @returns {string} API key
   */
  getCurrentKey() {
    this._ensureInit();

    // Kiểm tra key hiện tại có dùng được không
    if (this._isAvailable(this.keys[this.currentIndex])) {
      return this.keys[this.currentIndex].key;
    }

    // Key hiện tại không dùng được → tìm key khác
    const nextIdx = this._findNextAvailableIndex();
    if (nextIdx === -1) {
      // Tất cả đều đang cooldown → dùng key có cooldownUntil nhỏ nhất (sắp hết hạn nhất)
      const soonestIdx = this._findSoonestAvailableIndex();
      console.warn(
        `[KeyManager] ⚠️ Tất cả key đang cooldown! ` +
        `Dùng ${this.keys[soonestIdx].label} (cooldown còn ${this._remainingCooldown(this.keys[soonestIdx])}s)`
      );
      this.currentIndex = soonestIdx;
    } else {
      this.currentIndex = nextIdx;
    }

    return this.keys[this.currentIndex].key;
  }

  // ─── BÁO LỖI KEY ──────────────────────────────────────────────────────────

  /**
   * Gọi khi một request thất bại. Tự động đổi sang key tiếp theo.
   * @param {Error|string} error - Lỗi nhận được từ API
   * @returns {string|null} Key mới để thử lại, hoặc null nếu hết key
   */
  reportError(error) {
    this._ensureInit();

    const current = this.keys[this.currentIndex];
    const errorType = this._classifyError(error);
    const cooldownMs = COOLDOWN_MS[errorType] ?? COOLDOWN_MS.UNKNOWN_ERROR;

    // Cập nhật trạng thái key lỗi
    current.active        = false;
    current.failCount    += 1;
    current.totalErrors  += 1;
    current.lastError     = errorType;
    current.cooldownUntil = Date.now() + cooldownMs;

    console.warn(
      `[KeyManager] 🔴 ${current.label} lỗi: ${errorType} | ` +
      `Cooldown ${cooldownMs / 1000}s | Fail #${current.failCount}`
    );

    // Tìm key tiếp theo
    const nextIdx = this._findNextAvailableIndex();
    if (nextIdx === -1) {
      console.error("[KeyManager] ❌ Không còn key nào khả dụng!");
      return null;
    }

    this.currentIndex = nextIdx;
    console.log(`[KeyManager] 🔄 Chuyển sang ${this.keys[nextIdx].label}`);
    return this.keys[nextIdx].key;
  }

  /**
   * Gọi khi request thành công — reset failCount của key hiện tại.
   */
  reportSuccess() {
    this._ensureInit();
    const current = this.keys[this.currentIndex];
    current.totalCalls += 1;

    if (!current.active || current.failCount > 0) {
      current.active    = true;
      current.failCount = 0;
      current.lastError = null;
      console.log(`[KeyManager] 🟢 ${current.label} hoạt động trở lại.`);
    }
  }

  // ─── PHÂN LOẠI LỖI ────────────────────────────────────────────────────────

  /**
   * Phân loại lỗi từ Gemini API để quyết định thời gian cooldown.
   */
  _classifyError(error) {
    const msg = (error?.message || String(error)).toLowerCase();
    const status = error?.status || error?.statusCode || error?.response?.status;

    // Rate limit
    if (status === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) {
      // Phân biệt rate limit ngắn hạn vs quota ngày
      if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("daily")) {
        return "QUOTA_EXCEEDED";
      }
      return "RATE_LIMIT";
    }

    // Quota hết
    if (
      msg.includes("resource_exhausted") ||
      msg.includes("quota exceeded") ||
      msg.includes("billing") ||
      status === 403
    ) {
      return "QUOTA_EXCEEDED";
    }

    return "UNKNOWN_ERROR";
  }

  // ─── TÌM KEY KHẢ DỤNG ────────────────────────────────────────────────────

  _isAvailable(keyState) {
    if (!keyState) return false;
    if (keyState.cooldownUntil > Date.now()) return false;
    // Nếu cooldown đã hết nhưng active=false → reset về active
    if (!keyState.active && keyState.cooldownUntil <= Date.now()) {
      keyState.active    = true;
      keyState.failCount = 0;
      console.log(`[KeyManager] 🟡 ${keyState.label} cooldown đã hết, sẵn sàng thử lại.`);
    }
    return true;
  }

  _findNextAvailableIndex() {
    const total = this.keys.length;
    for (let offset = 1; offset <= total; offset++) {
      const idx = (this.currentIndex + offset) % total;
      if (this._isAvailable(this.keys[idx])) return idx;
    }
    return -1; // tất cả đang cooldown
  }

  _findSoonestAvailableIndex() {
    return this.keys.reduce((bestIdx, k, idx) => {
      return k.cooldownUntil < this.keys[bestIdx].cooldownUntil ? idx : bestIdx;
    }, 0);
  }

  _remainingCooldown(keyState) {
    return Math.max(0, Math.ceil((keyState.cooldownUntil - Date.now()) / 1000));
  }

  // ─── TIỆN ÍCH ────────────────────────────────────────────────────────────

  _ensureInit() {
    if (!this._initialized) this.init();
  }

  /**
   * In trạng thái toàn bộ key ra console (dùng để debug).
   */
  printStatus() {
    this._ensureInit();
    console.log("\n[KeyManager] 📊 Trạng thái các key:");
    this.keys.forEach((k, i) => {
      const isCurrent  = i === this.currentIndex ? " ◄ ĐANG DÙNG" : "";
      const remaining  = k.cooldownUntil > Date.now()
        ? ` | Cooldown còn ${this._remainingCooldown(k)}s`
        : "";
      const statusIcon = this._isAvailable(k) ? "🟢" : "🔴";
      console.log(
        `  ${statusIcon} ${k.label}${isCurrent} | ` +
        `Calls: ${k.totalCalls} | Errors: ${k.totalErrors}` +
        `${k.lastError ? ` | LastErr: ${k.lastError}` : ""}` +
        remaining
      );
    });
    console.log("");
  }

  /**
   * Trả về số key đang khả dụng.
   */
  get availableCount() {
    this._ensureInit();
    return this.keys.filter((k) => this._isAvailable(k)).length;
  }
}

// ─── SINGLETON EXPORT ────────────────────────────────────────────────────────
export const keyManager = new GeminiKeyManager();