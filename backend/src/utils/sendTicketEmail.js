import { Resend } from "resend";

const resend = new Resend("re_Eh2W2Q6w_4SryA6wi8uVsxQ3HfZwBArYk");

export async function sendTicketEmail({ toEmail, userName, payment, items }) {
  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_date}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_location}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.zone_name} (${it.zone_code})</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${it.ticket_quantity}</td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: "no-reply@ticketconcert.online",
    to: toEmail,
    subject: `🎫 Xác nhận vé #${payment.payment_id}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Đặt vé thành công! 🎉</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Cảm ơn bạn đã đặt vé. Dưới đây là thông tin đơn hàng của bạn:</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0">🧾 <strong>Mã đơn:</strong> #${payment.payment_id}</p>
          <p style="margin:4px 0">💳 <strong>Phương thức:</strong> ${payment.method}</p>
          <p style="margin:4px 0">🔑 <strong>Mã QR:</strong> <code>${payment.ticket_qr}</code></p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#6d28d9;color:#fff">
              <th style="padding:10px 12px;text-align:left">Sự kiện</th>
              <th style="padding:10px 12px;text-align:left">Ngày</th>
              <th style="padding:10px 12px;text-align:left">Địa điểm</th>
              <th style="padding:10px 12px;text-align:left">Khu vực</th>
              <th style="padding:10px 12px;text-align:center">SL</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <p style="margin-top:24px;font-size:13px;color:#888">
          Vui lòng xuất trình mã QR khi vào cổng sự kiện.<br/>
          Nếu cần hỗ trợ, liên hệ chúng mình qua email support@yourdomain.com.
        </p>
      </div>
    `,
  });
}