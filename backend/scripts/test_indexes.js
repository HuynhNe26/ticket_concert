import { pool } from "../src/config/database.js";

async function testIndexes() {
  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    `CREATE INDEX IF NOT EXISTS idx_events_status_dates ON events(event_status, event_start, event_end);`,
    `CREATE INDEX IF NOT EXISTS idx_vouchers_status_dates ON vouchers(voucher_status, voucher_start, voucher_end);`,
    `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_payment_detail_payment_id ON payment_detail(payment_id);`,
    `CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_ai_user_id ON chat_ai(user_id);`
  ];

  console.log("Checking and applying performance indexes...");
  for (const q of indexQueries) {
    const start = Date.now();
    await pool.query(q);
    console.log(`Executed: ${q.slice(0, 50)}... in ${Date.now() - start}ms`);
  }
  console.log("All indexes verified!");
  await pool.end();
}

testIndexes().catch(err => {
  console.error("Index error:", err);
  process.exit(1);
});
