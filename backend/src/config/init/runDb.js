import fs from "fs";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  database: "ticket_concert",
  password: "postgres",
  port: "5432",
});

async function runSQL() {
  try {
    const sql = fs.readFileSync("./database.sql").toString();
    await pool.query(sql);
    console.log("Tạo bảng PostgreSQL thành công!");
  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    pool.end();
  }
}

runSQL();
