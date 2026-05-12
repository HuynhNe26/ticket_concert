import dotenv from "dotenv";
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

/* export const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  database: process.env.PG_DB,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});
*/

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("Kết nối PostgreSQL thành công!");
    client.release(); 
  } catch (err) {
    console.error("Lỗi kết nối PostgreSQL:", err);
  }
}