import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});


console.log(process.env.PG_USER)
async function runSQL() {
  try {
    const sql = fs.readFileSync("./schema.sql").toString();
    await pool.query(sql);
    console.log("Tạo bảng PostgreSQL thành công!");
  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    pool.end();
  }
}

runSQL();
