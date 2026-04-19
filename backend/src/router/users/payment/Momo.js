import express from "express";
import crypto from "crypto";
import https from "https";
import { authMiddleware } from "../../../middlewares/userAuth.js";
import { pool } from "../../../config/database.js"

const momo = express.Router();

// ===== TẠO LINK THANH TOÁN =====
momo.post("/", authMiddleware, async (req, res) => {
  try {
    const { amount, orderId, price, total_price, voucher_id } = req.body;
    const userId = req.user.userId;
    if (!amount || !orderId) {
      return res.status(400).json({ error: "Thiếu amount hoặc orderId" });
    }

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + Date.now();
    const orderInfo = "Thanh toán Ticket-Concert";
    const redirectUrl = "http://localhost:3000/result";
    const ipnUrl = " https://uninclined-overhonestly-jone.ngrok-free.dev/api/checkout/momo/notify";
    const requestType = "captureWallet";
    const extraData = Buffer.from(JSON.stringify({ orderId, userId, price, total_price, voucher_id })).toString("base64");

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    });

    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const momoReq = https.request(options, (momoRes) => {
      let data = "";
      momoRes.on("data", (chunk) => (data += chunk));
      momoRes.on("end", () => {
        try {
          const result = JSON.parse(data);
          console.log("MoMo response:", result);
          if (result.payUrl) {
            res.status(200).json({ payUrl: result.payUrl });
          } else {
            res.status(400).json({ error: result.message || "Không lấy được link MoMo" });
          }
        } catch (err) {
          res.status(500).json({ error: "Lỗi parse response MoMo" });
        }
      });
    });

    momoReq.on("error", (e) => {
      console.error("MoMo request error:", e);
      res.status(500).json({ error: e.message });
    });

    momoReq.write(requestBody);
    momoReq.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
export default momo;