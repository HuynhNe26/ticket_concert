import { pool } from "../src/config/database.js";

async function run() {
  try {
    const indexes = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log("=== INDEXES ===");
    console.table(indexes.rows);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("=== TABLES ===");
    console.log(tables.rows.map(t => t.table_name));

    const admins = await pool.query(`
      SELECT admin_id, fullname, email, password, role, level, status
      FROM admins;
    `);
    console.log("=== CURRENT ADMINS ===");
    console.table(admins.rows);
  } catch (err) {
    console.error("Error inspecting db:", err);
  } finally {
    await pool.end();
  }
}

run();
