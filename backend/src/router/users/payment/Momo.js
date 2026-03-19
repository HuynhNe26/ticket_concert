import express from "express";
import crypto from "crypto";
import https from "https";
import { authMiddleware } from "../../../middlewares/userAuth.js";
import { pool } from "../../../config/database.js"

const momo = express.Router();

// ===== TẠO LINK THANH TOÁN =====
momo.post("/", authMiddleware, async (req, res) => {
  try {
    const { amount, orderId } = req.body;
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
    const ipnUrl = "https://mae-blastoporic-zetta.ngrok-free.dev/api/checkout/momo/notify";
    const requestType = "captureWallet";
    const extraData = Buffer.from(JSON.stringify({ orderId, userId })).toString("base64");

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

// ===== IPN - MOMO GỌI LẠI KHI THANH TOÁN XONG =====
momo.post("/notify", async (req, res) => {
  try {
    const { orderId, resultCode, amount, extraData, signature } = req.body;

    console.log("MoMo IPN:", req.body);

    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const accessKey = "F8BBA842ECF85";

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&message=${req.body.message}&orderId=${orderId}&orderInfo=${req.body.orderInfo}` +
      `&orderType=${req.body.orderType}&partnerCode=${req.body.partnerCode}` +
      `&payType=${req.body.payType}&requestId=${req.body.requestId}` +
      `&responseTime=${req.body.responseTime}&resultCode=${resultCode}` +
      `&transId=${req.body.transId}`;

    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Sai chữ ký MoMo");
      return res.status(400).json({ message: "invalid signature" });
    }

    if (resultCode !== 0) {
      return res.status(200).json({ message: "fail" });
    }

    const { userId } = JSON.parse(
      Buffer.from(extraData, "base64").toString()
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 🔒 chống duplicate IPN
      const exist = await client.query(
        `SELECT payment_id FROM payments WHERE payment_ref=$1`,
        [`MOMO_${orderId}`]
      );

      if (exist.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(200).json({ message: "ok" });
      }

      // 🔒 lock cart
      const { rows: carts } = await client.query(
        `SELECT * FROM cart_items
         WHERE user_id=$1 AND expires_at > NOW()
         FOR UPDATE`,
        [userId]
      );

      if (!carts.length) {
        await client.query("ROLLBACK");
        return res.status(200).json({ message: "ok" });
      }

      // 🔥 xử lý từng item
      for (const item of carts) {

        const { rows } = await client.query(
          `SELECT zone_quantity, sold_quantity, zone_code
           FROM zones
           WHERE zone_id=$1
           FOR UPDATE`,
          [item.zone_id]
        );

        const zone = rows[0];

        if (!zone) {
          throw new Error("Zone not found");
        }

        if (zone.sold_quantity + item.quantity > zone.zone_quantity) {
          await client.query("ROLLBACK");
          return res.status(200).json({ message: "sold out" });
        }

        await client.query(
          `UPDATE zones
           SET sold_quantity = sold_quantity + $1
           WHERE zone_id=$2`,
          [item.quantity, item.zone_id]
        );

        // lưu zone_code để insert detail
        item._zone_code = zone.zone_code;
      }

      // tạo payment
      const payment_ref = `MOMO_${orderId}`;
      const ticket_qr = `QR_${userId}_${Date.now()}`;

      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments
         (user_id, method, payment_status, payment_ref, ticket_qr)
         VALUES ($1,'MOMO','Thành công',$2,$3)
         RETURNING payment_id`,
        [userId, payment_ref, ticket_qr]
      );

      const payment_id = paymentRows[0].payment_id;

      // insert detail
      for (const item of carts) {
        await client.query(
          `INSERT INTO payment_detail
           (payment_id, event_id, ticket_quantity, zone_code)
           VALUES ($1,$2,$3,$4)`,
          [
            payment_id,
            item.event_id,
            item.quantity,
            item._zone_code
          ]
        );
      }

      await client.query(
        `DELETE FROM cart_items WHERE user_id=$1`,
        [userId]
      );

      await client.query("COMMIT");

      console.log("✅ MoMo success", payment_id);

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Checkout error:", err);
    } finally {
      client.release();
    }

    res.status(200).json({ message: "ok" });

  } catch (err) {
    console.error("IPN error:", err);
    res.status(200).json({ message: "ok" });
  }
});

export default momo;