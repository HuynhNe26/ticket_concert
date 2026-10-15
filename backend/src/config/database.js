import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import pkg from "pg";

const { Pool } = pkg;

// Đảm bảo nạp file .env chính xác kể cả khi chạy lệnh từ thư mục gốc hoặc script con
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Cấu hình SSL tối ưu cho Neon / PostgreSQL Cloud
const isLocal =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1"));

const sslConfig = isLocal
  ? false
  : {
      rejectUnauthorized: false,
    };

// Cấu hình Connection Pool tối ưu hiệu năng và độ ổn định (hỗ trợ Neon serverless)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: Number(process.env.PG_MAX_POOL) || 15,          // Giới hạn pool phù hợp với Neon serverless
  min: 2,                                              // Giữ sẵn 2 kết nối để phản hồi nhanh, tránh cold start
  idleTimeoutMillis: 30000,                            // Đóng kết nối nhàn rỗi sau 30 giây để giải phóng RAM DB
  connectionTimeoutMillis: 10000,                      // Hủy sau 10s nếu không thể kết nối tới DB (tránh treo request)
  statement_timeout: 30000,                            // Tự động ngắt các truy vấn treo quá 30s tránh lock bảng
  query_timeout: 30000,                                // Timeout truy vấn phía client
  keepAlive: true,                                     // TCP keepAlive chống bị Neon Proxy / AWS NAT ngắt socket
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,                               // Cho phép Node.js exit bình thường khi pool rảnh (hỗ trợ scripts & tests)
});

// Bắt lỗi kết nối nhàn rỗi để tránh crash toàn bộ ứng dụng
pool.on("error", (err) => {
  console.error("[PostgreSQL Pool] Lỗi client nhàn rỗi không mong muốn:", err.message);
});

// Helper thực thi truy vấn kèm đo thời gian (phát hiện slow query)
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1500) {
      console.warn(`⚠️ [PostgreSQL Slow Query] (${duration}ms):`, text.slice(0, 120));
    }
    return res;
  } catch (error) {
    console.error("[PostgreSQL Query Error]:", error.message, "Query:", text.slice(0, 100));
    throw error;
  }
}

// Khởi tạo và kiểm tra kết nối với cơ chế thử lại (Retry)
export async function connectDB(maxRetries = 3, retryDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      const res = await client.query("SELECT current_database() AS db_name, NOW() AS server_time");
      console.log(`✅ Kết nối PostgreSQL thành công! [Database: ${res.rows[0].db_name}]`);
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ [Lần ${attempt}/${maxRetries}] Lỗi kết nối PostgreSQL:`, err.message);
      if (attempt < maxRetries) {
        console.log(`⏳ Đang thử kết nối lại sau ${retryDelayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        console.error("⛔ Không thể kết nối cơ sở dữ liệu sau nhiều lần thử!");
      }
    }
  }
  return false;
}

// Dọn dẹp tài nguyên kết nối khi server tắt (Graceful shutdown)
const gracefulShutdown = async () => {
  try {
    await pool.end();
    console.log("🔒 Đã đóng toàn bộ kết nối PostgreSQL Pool an toàn.");
  } catch (err) {
    console.error("Lỗi khi đóng Pool:", err.message);
  }
};

process.on("SIGINT", async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await gracefulShutdown();
  process.exit(0);
});