import express from "express";
import crypto from "crypto";
import { authMiddleware } from "../../../middlewares/userAuth.js";
import { pool } from "../../../config/database.js"
const vnpay = express.Router();

const VNP_TMNCODE = "4FZ1N3EZ";
const VNP_HASHSECRET = "40ADAT1KDN2T4WK7BVP3LG49LZ4E53RG";
const VNP_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNP_RETURNURL = "http://localhost:3000/result";

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

vnpay.post("/", authMiddleware, async (req, res) => {
  try {
    const { amount, orderId, price, total_price, voucher_id } = req.body;
    const userId = req.user.userId;

    if (!amount || !orderId) {
      return res.status(400).json({ error: "Thiếu amount hoặc orderId" });
    }

    const date = new Date();
    const createDate = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14); // YYYYMMDDHHmmss

    // encode extraData để dùng ở IPN
    const extraData = Buffer.from(
      JSON.stringify({ orderId, userId, price, total_price, voucher_id })
    ).toString("base64");

    const VNP_RETURNURL = "http://localhost:3000/result";  // redirect về frontend sau thanh toán
    const VNP_IPNURL = "https://mae-blastoporic-zetta.ngrok-free.dev/api/checkout/vnpay/notify"; // server nhận IPN

    const vnpParams = sortObject({
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNP_TMNCODE,
      vnp_Amount: amount * 100, // VNPAY tính theo đơn vị VND * 100
      vnp_CreateDate: createDate,
      vnp_CurrCode: "VND",
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_Locale: "vn",
      vnp_OrderInfo: extraData, // 🔥 nhét extraData vào OrderInfo
      vnp_OrderType: "other",
      vnp_ReturnUrl: VNP_RETURNURL,
      vnp_IpnUrl: VNP_IPNURL, 
      vnp_TxnRef: orderId,
    });

    const signData = new URLSearchParams(vnpParams).toString();
    const hmac = crypto.createHmac("sha512", VNP_HASHSECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const payUrl =
      VNP_URL + "?" + signData + "&vnp_SecureHash=" + signed;

    console.log("VNPAY payUrl:", payUrl);
    return res.status(200).json({ payUrl });

  } catch (err) {
    console.error("VNPAY error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default vnpay;