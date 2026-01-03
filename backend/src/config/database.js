import dotenv from "dotenv";
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  database: process.env.PG_DB,
  password: process.env.PG_PS,
  port: process.env.PG_PORT,
  ssl: { rejectUnauthorized: false }
});

export async function connectDB() {
  try {
    await pool.connect();
    console.log("Kết nối PostgreSQL thành công!");
  } catch (err) {
    console.error("Lỗi kết nối PostgreSQL:", err);
  }
}
