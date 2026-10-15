async function testAdminLogin() {
  const API_URL = "http://localhost:5000/api/admin/auth/login";

  console.log("Testing Admin Login with bcrypt...");

  // Test 1: Correct credentials
  const res1 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "123456" }),
  });
  const data1 = await res1.json();
  console.log("Test 1 (Correct login):", res1.status, data1.success, data1.token ? "Token received ✅" : "No token ❌");
  if (data1.admin) {
    console.log("Admin returned:", data1.admin.email, "Password exposed?", !!data1.admin.password);
  }

  // Test 2: Wrong password
  const res2 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "hoanghuynh@gmail.com", password: "wrongpassword" }),
  });
  const data2 = await res2.json();
  console.log("Test 2 (Wrong password):", res2.status, data2.success, data2.message);

  // Test 3: Non-existent email
  const res3 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nonexistent@admin.com", password: "123456" }),
  });
  const data3 = await res3.json();
  console.log("Test 3 (Non-existent email):", res3.status, data3.success, data3.message);
}

testAdminLogin().catch(console.error);
