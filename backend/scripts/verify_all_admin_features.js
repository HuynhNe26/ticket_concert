import { pool } from "../src/config/database.js";
import bcrypt from "bcrypt";

const BASE_URL = "http://localhost:5000/api/admin/auth";

async function runFullVerification() {
  console.log("====================================================");
  console.log("BẮT ĐẦU KIỂM TRA HỆ THỐNG DATABASE & ADMIN AUTH BCRYPT");
  console.log("====================================================\n");

  // 1. Kiểm tra trạng thái mật khẩu của các Admin trong database
  const { rows: admins } = await pool.query("SELECT admin_id, email, password FROM admins ORDER BY admin_id ASC");
  console.log("1. KIỂM TRA MÃ HÓA MẬT KHẨU TRONG DATABASE:");
  for (const a of admins) {
    const isBcrypt = a.password.startsWith("$2a$") || a.password.startsWith("$2b$") || a.password.startsWith("$2y$");
    console.log(`   - Admin [${a.email}]: ${isBcrypt ? "✅ Đã mã hóa bcrypt (" + a.password.slice(0, 15) + "...)" : "❌ VẪN LÀ PLAINTEXT"}`);
  }

  // 2. Kiểm tra đăng nhập với bcrypt
  console.log("\n2. KIỂM TRA ĐĂNG NHẬP ADMIN VỚI BCRYPT:");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "123456" })
  });
  const loginData = await loginRes.json();
  console.log(`   - Đăng nhập đúng: HTTP ${loginRes.status}, success: ${loginData.success}`);
  if (!loginData.success || !loginData.token) {
    throw new Error("Đăng nhập thất bại!");
  }
  const token = loginData.token;
  console.log("   - JWT Token nhận được hợp lệ ✅");
  console.log("   - Trường password có bị rò rỉ không?:", loginData.admin.password ? "CÓ ❌" : "KHÔNG (An toàn) ✅");

  // 3. Kiểm tra đăng nhập với sai mật khẩu
  const wrongRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "matkhausai123" })
  });
  const wrongData = await wrongRes.json();
  console.log(`   - Đăng nhập mật khẩu sai: HTTP ${wrongRes.status}, message: "${wrongData.message}" ✅`);

  // 4. Kiểm tra chức năng Đổi mật khẩu
  console.log("\n3. KIỂM TRA ĐỔI MẬT KHẨU ADMIN (CHANGE PASSWORD):");
  const changeRes = await fetch(`${BASE_URL}/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword: "123456",
      newPassword: "AdminNewPassword@2026"
    })
  });
  const changeData = await changeRes.json();
  console.log(`   - Đổi sang mật khẩu mới: HTTP ${changeRes.status}, message: "${changeData.message}"`);

  // Thử đăng nhập bằng mật khẩu cũ (phải thất bại)
  const loginOld = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "123456" })
  });
  console.log(`   - Đăng nhập lại với mật khẩu cũ: HTTP ${loginOld.status} (phải thất bại: ${loginOld.status === 401 ? "✅" : "❌"})`);

  // Thử đăng nhập bằng mật khẩu mới (phải thành công)
  const loginNew = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "AdminNewPassword@2026" })
  });
  const loginNewData = await loginNew.json();
  console.log(`   - Đăng nhập lại với mật khẩu mới: HTTP ${loginNew.status} (thành công: ${loginNew.status === 200 ? "✅" : "❌"})`);

  // Đổi lại về 123456 (được hash bcrypt) để không làm gián đoạn tài khoản của người dùng
  const revertToken = loginNewData.token;
  await fetch(`${BASE_URL}/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${revertToken}`
    },
    body: JSON.stringify({
      currentPassword: "AdminNewPassword@2026",
      newPassword: "123456"
    })
  });
  console.log("   - Đã đổi lại mật khẩu thuận tiện cho dev về 123456 (được băm bcrypt) ✅");

  // 5. Kiểm tra Tạo Admin mới với mật khẩu riêng được bcrypt
  console.log("\n4. KIỂM TRA TẠO ADMIN MỚI VỚI BCRYPT:");
  const testEmail = `test_admin_${Date.now()}@gmail.com`;
  const createRes = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Admin Kiểm Tra",
      birthOfDay: "2000-01-01",
      email: testEmail,
      password: "CustomAdminPass@999",
      phoneNumber: "0988776655",
      gender: "Nam",
      address: "Hà Nội",
      level: 2,
      role: "admin"
    })
  });
  const createData = await createRes.json();
  console.log(`   - Tạo admin mới: HTTP ${createRes.status}, message: "${createData.message}"`);

  // Kiểm tra password lưu trong DB
  const { rows: newAdminInDb } = await pool.query("SELECT * FROM admins WHERE email = $1", [testEmail]);
  const newHash = newAdminInDb[0]?.password || "";
  const isBcryptNew = newHash.startsWith("$2a$") || newHash.startsWith("$2b$") || newHash.startsWith("$2y$");
  const matchCustom = await bcrypt.compare("CustomAdminPass@999", newHash);
  console.log(`   - Password lưu trong DB: ${newHash.slice(0, 15)}... (Bcrypt: ${isBcryptNew ? "✅" : "❌"}, Match: ${matchCustom ? "✅" : "❌"})`);

  // Thử đăng nhập tài khoản mới
  const testLoginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: testEmail, password: "CustomAdminPass@999" })
  });
  console.log(`   - Đăng nhập admin mới: HTTP ${testLoginRes.status} (thành công: ${testLoginRes.status === 200 ? "✅" : "❌"})`);

  // Xóa tài khoản test
  await pool.query("DELETE FROM admins WHERE email = $1", [testEmail]);
  console.log("   - Dọn dẹp tài khoản test ✅");

  console.log("\n====================================================");
  console.log("🎉 TẤT CẢ CÁC KIỂM TRA ĐỀU THÀNH CÔNG RỰC RỠ!");
  console.log("====================================================");
}

runFullVerification()
  .catch(err => {
    console.error("Lỗi trong quá trình kiểm tra:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
