import { pool } from "../src/config/database.js";
import bcrypt from "bcrypt";

async function migrateAdminPasswords() {
  try {
    const { rows: admins } = await pool.query("SELECT admin_id, email, password FROM admins");
    console.log(`Found ${admins.length} admins. Checking passwords...`);

    let updatedCount = 0;
    for (const admin of admins) {
      const currentPass = admin.password || "";
      if (!currentPass.startsWith("$2a$") && !currentPass.startsWith("$2b$") && !currentPass.startsWith("$2y$")) {
        console.log(`Migrating plaintext password for admin: ${admin.email}...`);
        const hashedPassword = await bcrypt.hash(currentPass || "123456", 10);
        await pool.query("UPDATE admins SET password = $1, updated_at = NOW() WHERE admin_id = $2", [hashedPassword, admin.admin_id]);
        updatedCount++;
      } else {
        console.log(`Admin ${admin.email} already has bcrypt hashed password.`);
      }
    }

    console.log(`Migration complete! Successfully hashed ${updatedCount} admin password(s) with bcrypt.`);

    // Verification
    const { rows: updatedAdmins } = await pool.query("SELECT admin_id, email, substring(password, 1, 10) as hash_prefix, length(password) as hash_len FROM admins");
    console.log("=== ADMINS AFTER MIGRATION ===");
    console.table(updatedAdmins);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrateAdminPasswords();
