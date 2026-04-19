import crypto from "crypto";
import https from "https";
import { pool } from "../../config/database.js";

/* ================= CONFIG ================= */
const MOMO_CONFIG = {
  partnerCode: "MOMO",
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
  redirectUrl: "http://localhost:3000/result",
  ipnUrl: "https://uninclined-overhonestly-jone.ngrok-free.dev/api/checkout/momo/notify",
};
console.log(MOMO_CONFIG.ipnUrl)
const VNP_CONFIG = {
  tmnCode: "4FZ1N3EZ",
  hashSecret: "40ADAT1KDN2T4WK7BVP3LG49LZ4E53RG",
  url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl: "http://localhost:3000/result",
};

/* =========================================================
   CONTROLLER
========================================================= */
export const Checkout = {

  /* ================= MOMO CREATE ================= */
  createMomo: async (req, res) => {
    try {
      const { amount, orderId, price, total_price, voucher_id } = req.body;
      const userId = req.user.userId;

      const requestId = MOMO_CONFIG.partnerCode + Date.now();

      const extraData = Buffer.from(
        JSON.stringify({ orderId, userId, price, total_price, voucher_id })
      ).toString("base64");

      const rawSignature =
        `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}` +
        `&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=Thanh toán Ticket` +
        `&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}` +
        `&requestId=${requestId}&requestType=captureWallet`;

      const signature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      const requestBody = JSON.stringify({
        partnerCode: MOMO_CONFIG.partnerCode,
        accessKey: MOMO_CONFIG.accessKey,
        requestId,
        amount,
        orderId,
        orderInfo: "Thanh toán Ticket",
        redirectUrl: MOMO_CONFIG.redirectUrl,
        ipnUrl: MOMO_CONFIG.ipnUrl,
        extraData,
        requestType: "captureWallet",
        signature,
        lang: "vi",
      });

      const momoReq = https.request(MOMO_CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }, (momoRes) => {
        let data = "";
        momoRes.on("data", (chunk) => (data += chunk));
        momoRes.on("end", () => {
          const result = JSON.parse(data);
          if (result.payUrl) return res.json({ payUrl: result.payUrl });
          return res.status(400).json({ error: result.message });
        });
      });

      momoReq.write(requestBody);
      momoReq.end();

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* ================= MOMO IPN ================= */
  momoNotify: async (req, res) => {
    try {
      const data = req.body;

      if (data.resultCode !== 0) {
        return res.json({ message: "fail" });
      }

      const parsed = JSON.parse(
        Buffer.from(data.extraData, "base64").toString()
      );

      await handlePaymentSuccess(parsed, `MOMO_${data.orderId}`, "MOMO");

      return res.json({ message: "ok" });

    } catch (err) {
      console.error(err);
      return res.json({ message: "error" });
    }
  },

  /* ================= VNPAY CREATE ================= */
  createVnpay: async (req, res) => {
    try {
      const { amount, orderId, price, total_price, voucher_id } = req.body;
      const userId = req.user.userId;

      const extraData = Buffer.from(
        JSON.stringify({ orderId, userId, price, total_price, voucher_id })
      ).toString("base64");

      const params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: VNP_CONFIG.tmnCode,
        vnp_Amount: amount * 100,
        vnp_CreateDate: new Date()
          .toISOString()
          .replace(/[-:T.Z]/g, "")
          .slice(0, 14),
        vnp_CurrCode: "VND",
        vnp_IpAddr: req.ip || "127.0.0.1",
        vnp_Locale: "vn",
        vnp_OrderInfo: extraData,
        vnp_OrderType: "other",
        vnp_ReturnUrl: VNP_CONFIG.returnUrl,
        vnp_TxnRef: orderId,
      };

      const sorted = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key];
          return acc;
        }, {});

      const signData = new URLSearchParams(sorted).toString();

      const signed = crypto
        .createHmac("sha512", VNP_CONFIG.hashSecret)
        .update(signData)
        .digest("hex");

      const payUrl = `${VNP_CONFIG.url}?${signData}&vnp_SecureHash=${signed}`;

      return res.json({ payUrl });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* ================= VNPAY IPN ================= */
  vnpayNotify: async (req, res) => {
    try {
      const vnpParams = { ...req.query };
      const secureHash = vnpParams.vnp_SecureHash;

      delete vnpParams.vnp_SecureHash;
      delete vnpParams.vnp_SecureHashType;

      const sorted = Object.keys(vnpParams)
        .sort()
        .reduce((acc, key) => {
          acc[key] = vnpParams[key];
          return acc;
        }, {});

      const signData = new URLSearchParams(sorted).toString();

      const signed = crypto
        .createHmac("sha512", VNP_CONFIG.hashSecret)
        .update(signData)
        .digest("hex");

      if (secureHash !== signed) {
        return res.json({ RspCode: "97" });
      }

      if (vnpParams.vnp_ResponseCode !== "00") {
        return res.json({ RspCode: "00" });
      }

      const parsed = JSON.parse(
        Buffer.from(vnpParams.vnp_OrderInfo, "base64").toString()
      );

      await handlePaymentSuccess(
        parsed,
        `VNPAY_${vnpParams.vnp_TxnRef}`,
        "VNPAY"
      );

      return res.json({ RspCode: "00" });

    } catch (err) {
      console.error(err);
      return res.json({ RspCode: "99" });
    }
  },
};

/* =========================================================
   CORE HANDLE PAYMENT
========================================================= */
async function handlePaymentSuccess(parsed, paymentRef, method) {
  const { userId, price, total_price, voucher_id } = parsed;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const exist = await client.query(
      `SELECT payment_id FROM payments WHERE payment_ref=$1`,
      [paymentRef]
    );

    if (exist.rows.length) {
      await client.query("ROLLBACK");
      return;
    }

    const { rows: carts } = await client.query(
      `SELECT * FROM cart_items WHERE user_id=$1 AND expires_at>NOW() FOR UPDATE`,
      [userId]
    );

    if (!carts.length) {
      await client.query("ROLLBACK");
      return;
    }

    for (const item of carts) {
      const { rows } = await client.query(
        `SELECT zone_quantity, sold_quantity FROM zones WHERE zone_id=$1 FOR UPDATE`,
        [item.zone_id]
      );

      const zone = rows[0];

      if (zone.sold_quantity + item.quantity > zone.zone_quantity) {
        await client.query("ROLLBACK");
        return;
      }

      await client.query(
        `UPDATE zones SET sold_quantity = sold_quantity + $1 WHERE zone_id=$2`,
        [item.quantity, item.zone_id]
      );

      // query event_end để tính useAt
        const { rows: eventRows } = await client.query(
          `SELECT event_end FROM events WHERE event_id = $1`,
          [item.event_id]
        );

        if (!eventRows.length) throw new Error(`Event not found: ${item.event_id}`);

        // useAt = event_end + 12 tiếng
        const useAt = new Date(eventRows[0].event_end);
        useAt.setHours(useAt.getHours() + 12);
        item._use_at = useAt;
    }
    const ticket_qr = crypto.randomBytes(8).toString("hex");
    const { rows } = await client.query(
      `INSERT INTO payments (user_id, method, payment_status, payment_ref, ticket_qr)
       VALUES ($1,$2,'Thành công',$3, $4)
       RETURNING payment_id`,
      [userId, method, paymentRef, ticket_qr]
    );

    const payment_id = rows[0].payment_id;

    for (const item of carts) {
      await client.query(
        `INSERT INTO payment_detail 
          (payment_id, event_id, ticket_quantity, zone_id, price, total_price,
            ticket_status, useat, voucher_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          payment_id,
          item.event_id,
          item.quantity,
          item.zone_id,
          price,
          total_price,
          true,
          item._use_at,
          voucher_id,
        ]
      );
    }
    if (voucher_id) {
      await client.query(
        `UPDATE vouchers SET voucher_used = voucher_used + 1,
        voucher_quantity = voucher_quantity -1 WHERE voucher_id = $1`,
        [voucher_id]
      );
    }

    await client.query(`DELETE FROM cart_items WHERE user_id=$1`, [userId]);

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
  } finally {
    client.release();
  }
}