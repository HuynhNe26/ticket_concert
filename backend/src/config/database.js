import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

export async function connectDB() {
  try {
    await pool.connect();
    console.log("Kết nối PostgreSQL thành công!");
  } catch (err) {
    console.error("Lỗi kết nối PostgreSQL:", err);
  }
}
